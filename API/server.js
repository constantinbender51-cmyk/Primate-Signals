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
const fetch = require('node-fetch');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const app = express();
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', 
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
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

const optionalAuthenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    req.user = null; 
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
    return optionalAuthenticate(req, res, () => {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });
        next();
    });
};

// --- DATA ROUTES ---

const LAB_URL = 'https://try3lab.up.railway.app';
const OCTOPUS_URL = 'https://live-trading-production.up.railway.app';

const dirToInt = (dir) => {
    if (dir === 'UP') return 1;
    if (dir === 'DOWN') return -1;
    return 0;
};

const normalizeDate = (ts) => {
    if (!ts) return new Date().toISOString();
    if (typeof ts === 'string' && ts.includes(' ')) {
        return ts.replace(' ', 'T') + 'Z'; 
    }
    return ts;
};

// NEW: Octopus Grid Route
app.get('/api/octopus/latest', optionalAuthenticate, async (req, res) => {
    // Paywall Check
    const user = req.user;
    const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
    
    if (!user) return res.status(401).json({ error: 'Auth required' });
    if (!isSubscribed) return res.status(403).json({ error: 'Sub required' });

    try {
        const response = await fetch(`${OCTOPUS_URL}/api/parameters`);
        if (!response.ok) throw new Error(`Octopus API error: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Octopus Proxy Error:", err);
        res.status(502).json({ error: 'Failed to fetch grid data' });
    }
});

// 1. BATCH ROUTE (Updated with all 15 Assets)
app.get('/api/signals/all/:type', optionalAuthenticate, async (req, res) => {
    const type = req.params.type.toLowerCase();

    if (type === 'current') {
        const user = req.user;
        const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
        if (!user) return res.status(401).json({ error: 'Auth required' });
        if (!isSubscribed) return res.status(403).json({ error: 'Sub required' });
    }

    try {
        const response = await fetch(`${LAB_URL}/api/livelog`);
        if (!response.ok) throw new Error(`Lab API error: ${response.status}`);
        const logs = await response.json();

        const results = {};
        // Full Asset List from Python Backend
        const assets = [
            'BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 
            'ADA', 'BCH', 'LINK', 'XLM', 'SUI', 
            'AVAX', 'LTC', 'HBAR', 'SHIB', 'TON'
        ]; 
        
        assets.forEach(asset => {
            const assetSymbol = `${asset}USDT`;
            const latest = logs.find(l => l.symbol === assetSymbol);
            
            if (latest) {
                results[asset] = {
                    time: normalizeDate(latest.timestamp),
                    entry_price: latest.close_price,
                    pred_dir: dirToInt(latest.prediction)
                };
            } else {
                results[asset] = { pred_dir: 0, error: 'No Signal' };
            }
        });

        res.json(results);
    } catch (err) {
        res.status(502).json({ error: 'Batch fetch failed' });
    }
});

// 2. SINGLE ASSET ROUTE
app.get('/api/signals/:asset/:type', optionalAuthenticate, async (req, res) => {
    const assetRaw = req.params.asset.toUpperCase();
    const assetSymbol = assetRaw.endsWith('USDT') ? assetRaw : `${assetRaw}USDT`;
    const type = req.params.type.toLowerCase();

    if (type === 'current') {
        const user = req.user;
        const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
        if (!user) return res.status(401).json({ error: 'Auth required' });
        if (!isSubscribed) return res.status(403).json({ error: 'Sub required' });
    }

    try {
        // A. CURRENT SIGNAL
        if (type === 'current') {
            const r = await fetch(`${LAB_URL}/api/livelog`);
            const logs = await r.json();
            const latest = logs.find(l => l.symbol === assetSymbol);
            if (!latest) return res.json({ pred_dir: 0 });

            return res.json({
                time: normalizeDate(latest.timestamp),
                entry_price: latest.close_price,
                pred_dir: dirToInt(latest.prediction)
            });
        }

        // B. LIVE / RECENT
        if (type === 'live' || type === 'recent') {
            const r = await fetch(`${LAB_URL}/api/outcomes`);
            const outcomes = await r.json();
            const assetTrades = outcomes.filter(o => o.symbol === assetSymbol);

            const results = assetTrades.map(t => {
                const dir = dirToInt(t.prediction);
                return {
                    time: normalizeDate(t.time_entry),
                    pred_dir: dir,
                    entry_price: t.entry_price,
                    exit_price: t.exit_price,
                    pnl: parseFloat(t.pnl) || 0 
                };
            });

            const wins = results.filter(t => t.pnl > 0).length;
            const total = results.length;
            const cumPnl = results.reduce((sum, t) => sum + t.pnl, 0);

            let run = 0;
            const curve = results.slice().reverse().map(t => {
                run += t.pnl; 
                return { time: t.time, val: run };
            });

            return res.json({
                cumulative_pnl: cumPnl,
                accuracy_percent: total > 0 ? ((wins/total)*100).toFixed(1) : 0,
                correct_trades: wins,
                total_trades: total,
                equity_curve: curve,
                results: results
            });
        }

        // C. BACKTEST
        if (type === 'backtest') {
            const r = await fetch(`${LAB_URL}/api/details?symbol=${assetSymbol}`);
            if (!r.ok) return res.json({});
            const data = await r.json();

            const logs = data.logs.map(l => {
                return {
                    time: normalizeDate(l.time_t),
                    pred_dir: dirToInt(l.prediction),
                    pnl: parseFloat(l.pnl) || 0,
                    entry_price: l.rnd_t_0
                };
            });

            const wins = logs.filter(l => l.pnl > 0).length;
            const total = logs.length;
            const cumPnl = logs.reduce((sum, l) => sum + l.pnl, 0);
            
            let run = 0;
            const curve = logs.map(l => {
                run += l.pnl;
                return { time: l.time, val: run };
            });

            return res.json({
                cumulative_pnl: cumPnl,
                accuracy_percent: data.accuracy, 
                correct_trades: wins,
                total_trades: total,
                equity_curve: curve
            });
        }

        res.status(404).json({ error: 'Invalid type' });
    } catch (err) {
        console.error(`Proxy Error (${assetSymbol}/${type}):`, err);
        res.status(502).json({ error: 'Failed to fetch signal data.' });
    }
});

// ... Auth Routes ...
app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!password || password.length < 6 || !/\d/.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 6 characters and include a number' });
    }
    try {
        const client = await pool.connect();
        const check = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) { client.release(); return res.status(409).json({ error: 'User exists' }); }
        const hash = await bcrypt.hash(password, 10);
        const customer = await stripe.customers.create({ email });
        const apiKey = crypto.randomBytes(24).toString('hex');
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expiry = new Date(Date.now() + 10 * 60000); 
        await client.query(`INSERT INTO users (email, password_hash, stripe_customer_id, api_key, verification_code, verification_expiry, is_active) VALUES ($1, $2, $3, $4, $5, $6, false)`, [email, hash, customer.id, apiKey, code, expiry]);
        client.release();
        transporter.sendMail({ from: process.env.SMTP_USER, to: email, subject: "Verify", text: code }).catch(console.error);
        res.status(201).json({ message: 'Code sent' });
    } catch (err) { res.status(500).json({ error: 'Register error' }); }
});

app.post('/auth/verify', async (req, res) => {
    const { email, code } = req.body;
    try {
        const client = await pool.connect();
        const resDb = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = resDb.rows[0];
        if (!user || user.verification_code !== code) { client.release(); return res.status(400).json({ error: 'Invalid' }); }
        await client.query(`UPDATE users SET is_active = true WHERE id = $1`, [user.id]);
        client.release();
        res.json({ message: 'Verified' });
    } catch (err) { res.status(500).json({ error: 'Verify error' }); }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const client = await pool.connect();
        const user = (await client.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
        client.release();
        if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid' });
        if (!user.is_active) return res.status(403).json({ error: 'Not verified' });
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { email: user.email, subscription_status: user.subscription_status, api_key: user.api_key } });
    } catch (err) { res.status(500).json({ error: 'Login error' }); }
});

app.get('/auth/me', authenticate, (req, res) => res.json(req.user));

app.post('/create-checkout-session', authenticate, async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: req.user.stripe_customer_id,
            line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
            subscription_data: { trial_period_days: 14 },
            success_url: `${process.env.CLIENT_URL}/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/`,
        });
        res.json({ url: session.url });
    } catch (err) { res.status(500).json({ error: 'Stripe error' }); }
});

app.post('/create-portal-session', authenticate, async (req, res) => {
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: req.user.stripe_customer_id,
            return_url: `${process.env.CLIENT_URL}/profile`,
        });
        res.json({ url: session.url });
    } catch (err) { res.status(500).json({ error: 'Failed to create portal session' }); }
});

app.get('/legal/impressum', async (req, res) => { res.send("Impressum Placeholder"); });
app.get('/legal/privacy', async (req, res) => { res.send("Privacy Placeholder"); });
app.get('/legal/terms', async (req, res) => { res.send("Terms Placeholder"); });

app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not Found' });
    const indexPath = path.join(__dirname, 'client/dist', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(500).send("App not built.");
});

initDB().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log(`Server running`));
});