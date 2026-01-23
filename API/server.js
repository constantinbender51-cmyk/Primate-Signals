require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer'); 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const app = express();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const initDB = async () => {
    try {
        const client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                api_key VARCHAR(255) UNIQUE, 
                password_hash VARCHAR(255),
                stripe_customer_id VARCHAR(255),
                subscription_status VARCHAR(50) DEFAULT 'inactive',
                is_active BOOLEAN DEFAULT false,  
                verification_code VARCHAR(4),
                verification_expiry TIMESTAMP,
                trial_ends_at TIMESTAMP,
                next_billing_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Database tables checked.");
        client.release();
    } catch (err) { console.error("❌ Database setup failed:", err); }
};

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

    const client = await pool.connect();
    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            await client.query(`UPDATE users SET subscription_status = 'active' WHERE stripe_customer_id = $1`, [session.customer]);
        } 
        else if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            if (invoice.subscription && invoice.lines?.data?.length > 0) {
                const periodEnd = invoice.lines.data[0].period.end;
                const nextBilling = new Date(periodEnd * 1000); 
                await client.query(
                    `UPDATE users SET subscription_status = 'active', next_billing_date = $1 WHERE stripe_customer_id = $2`, 
                    [nextBilling, invoice.customer]
                );
            }
        }
        else if (event.type === 'customer.subscription.updated') {
            const subscription = event.data.object;
            const nextBilling = new Date(subscription.current_period_end * 1000);
            const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
            await client.query(
                `UPDATE users SET subscription_status = $1, next_billing_date = $2, trial_ends_at = $3 WHERE stripe_customer_id = $4`,
                [subscription.status, nextBilling, trialEnd, subscription.customer]
            );
        }
        res.json({ received: true });
    } catch (err) { 
        console.error('Webhook Error:', err);
        res.status(500).send('Server Error'); 
    } finally { 
        client.release(); 
    }
});

app.use(express.json()); 
app.use(cors());

// Optional Authentication (For Public Data + Private Data Mix)
const optionalAuthenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    
    req.user = null; // Default to guest

    try {
        if (apiKey) {
            const result = await pool.query('SELECT * FROM users WHERE api_key = $1 AND is_active = true', [apiKey]);
            if (result.rows.length > 0) req.user = result.rows[0];
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
            if (result.rows.length > 0) req.user = result.rows[0];
        }
    } catch (err) { }
    next();
};

const authenticate = async (req, res, next) => {
    if (req.user) return next(); 
    return optionalAuthenticate(req, res, () => {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });
        next();
    });
};

const SUPPORTED_ASSETS = {
    'BTC': 'https://try3btc.up.railway.app',
    'XRP': 'https://try3xrp.up.railway.app',
    'SOL': 'https://try3sol.up.railway.app'
};

const SUPPORTED_ENDPOINTS = ['current', 'live', 'backtest', 'recent'];

// --- BATCH ROUTE (ALL ASSETS) ---
app.get('/api/signals/all/:type', optionalAuthenticate, async (req, res) => {
    // ... (Keep existing batch logic if desired, or relying on single asset "ALL" logic below)
    // For brevity, this can remain or delegate. 
    // Since we are implementing aggregation in the :asset route, we can skip this update or leave as is.
    res.status(404).json({error: 'Use /api/signals/ALL/:type for aggregated view'});
});

// --- SMART ROUTE (HANDLES SINGLE + "ALL") ---
app.get('/api/signals/:asset/:type', optionalAuthenticate, async (req, res) => {
    let asset = req.params.asset.toUpperCase();
    const type = req.params.type.toLowerCase();

    // 1. Validation
    const isAll = (asset === 'ALL');
    if (!isAll && !SUPPORTED_ASSETS[asset]) {
        return res.status(404).json({ error: 'Asset not supported. Only BTC, XRP, SOL available.' });
    }
    if (!SUPPORTED_ENDPOINTS.includes(type)) {
        return res.status(404).json({ error: 'Invalid endpoint type.' });
    }

    // 2. Paywall Check
    if (type === 'current') {
        const user = req.user;
        const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
        if (!user) return res.status(401).json({ error: 'Authentication required.' });
        if (!isSubscribed) return res.status(403).json({ error: 'Subscription required.' });
    }

    try {
        // --- CASE A: SINGLE ASSET ---
        if (!isAll) {
            const response = await fetch(`${SUPPORTED_ASSETS[asset]}/api/${type}`);
            if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
            const data = await response.json();
            return res.json(data);
        }

        // --- CASE B: AGGREGATED "ALL" VIEW ---
        const assets = Object.keys(SUPPORTED_ASSETS);
        const allData = await Promise.all(assets.map(async (a) => {
            try {
                const r = await fetch(`${SUPPORTED_ASSETS[a]}/api/${type}`);
                return r.ok ? await r.json() : null;
            } catch (e) { return null; }
        }));
        
        const validData = allData.filter(d => d !== null);

        if (type === 'recent') {
            // Aggregate Recent Stats
            const totalPnL = validData.reduce((sum, d) => sum + (parseFloat(d.cumulative_pnl) || 0), 0);
            const totalTrades = validData.reduce((sum, d) => sum + (parseInt(d.total_trades) || 0), 0);
            // Weighted accuracy approximation or simple average
            const avgAcc = validData.reduce((sum, d) => sum + (parseFloat(d.accuracy_percent) || 0), 0) / (validData.length || 1);
            
            return res.json({
                cumulative_pnl: totalPnL,
                total_trades: totalTrades,
                accuracy_percent: parseFloat(avgAcc.toFixed(2)),
                time: new Date().toISOString()
            });

        } else if (type === 'live') {
            // Merge all histories into one list
            let combined = [];
            validData.forEach(d => {
                const list = Array.isArray(d) ? d : (d.results || []);
                combined = combined.concat(list);
            });
            // Sort by time descending
            combined.sort((a, b) => new Date(b.time) - new Date(a.time));
            return res.json(combined);

        } else if (type === 'backtest') {
            // Aggregate Backtest Stats + Equity Curve
            const totalPnL = validData.reduce((sum, d) => sum + (d.cumulative_pnl || 0), 0);
            const totalTrades = validData.reduce((sum, d) => sum + (d.total_trades || 0), 0);
            const correctTrades = validData.reduce((sum, d) => sum + (d.correct_trades || 0), 0);
            const accuracy = totalTrades > 0 ? ((correctTrades / totalTrades) * 100).toFixed(2) : 0;

            // Merge Equity Curves (Advanced)
            // 1. Collect all unique timestamps
            const timeMap = new Map(); // timestamp -> sum_pnl
            const assetCurves = validData.map(d => d.equity_curve || []);
            
            // Get all unique times
            const allTimes = new Set();
            assetCurves.forEach(curve => curve.forEach(pt => allTimes.add(pt.timestamp)));
            const sortedTimes = Array.from(allTimes).sort((a, b) => new Date(a) - new Date(b));

            // 2. Build composite curve
            // We assume if an asset has no point at time T, its PnL is the same as the last known point.
            const compositeCurve = [];
            let lastPnLs = new Array(assetCurves.length).fill(0);

            sortedTimes.forEach(t => {
                let currentTotal = 0;
                assetCurves.forEach((curve, idx) => {
                    const point = curve.find(p => p.timestamp === t);
                    if (point) lastPnLs[idx] = point.cum_pnl;
                    currentTotal += lastPnLs[idx];
                });
                compositeCurve.push({ timestamp: t, cum_pnl: currentTotal });
            });

            return res.json({
                cumulative_pnl: totalPnL,
                total_trades: totalTrades,
                correct_trades: correctTrades,
                accuracy_percent: accuracy,
                equity_curve: compositeCurve
            });

        } else if (type === 'current') {
            // Aggregate Current Signal (Portfolio View)
            // Return a "summary" object that fits the AssetDetails UI
            const netDir = validData.reduce((sum, d) => sum + (d.pred_dir || 0), 0);
            const sentiment = netDir > 0 ? 1 : (netDir < 0 ? -1 : 0);
            
            return res.json({
                time: new Date().toISOString().split('.')[0].replace('T', ' '),
                entry_price: "PORTFOLIO", // Special string for UI
                pred_dir: sentiment,
                note: `Combined signal for ${assets.join(', ')}. Net sentiment: ${netDir > 0 ? 'Bullish' : (netDir < 0 ? 'Bearish' : 'Neutral')}.`
            });
        }

    } catch (err) {
        console.error(`Proxy Error (${asset}/${type}):`, err);
        res.status(502).json({ error: 'Failed to fetch signal data.' });
    }
});

// --- AUTH ROUTES & STATIC FILES (Keep existing...) ---
app.post('/auth/register', async (req, res) => { /* ...Same... */ });
app.post('/auth/verify', async (req, res) => { /* ...Same... */ });
app.post('/auth/login', async (req, res) => { /* ...Same... */ });
app.get('/auth/me', authenticate, (req, res) => res.json(req.user));
app.post('/create-checkout-session', authenticate, async (req, res) => { /* ...Same... */ });
app.post('/create-portal-session', authenticate, async (req, res) => { /* ...Same... */ });
app.get('/legal/impressum', async (req, res) => { /* ...Same... */ });

app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({error: 'Not Found'});
    const indexPath = path.join(__dirname, 'client/dist', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(500).send("Build not found.");
});

initDB().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log(`Server running on port ${process.env.PORT || 3000}`));
});
