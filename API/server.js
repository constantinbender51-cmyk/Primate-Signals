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

// Strict Authentication (For Account/Billing)
const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    if (apiKey) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE api_key = $1 AND is_active = true', [apiKey]);
            if (result.rows.length === 0) return res.status(403).json({ error: 'Invalid API Key' });
            req.user = result.rows[0]; 
            return next();
        } catch (err) { return res.status(500).json({ error: 'Auth Error' }); }
    }
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
            if (result.rows.length === 0) return res.status(401).json({ error: 'User invalid' });
            req.user = result.rows[0];
            return next();
        } catch (err) { return res.status(401).json({ error: 'Invalid Token' }); }
    }
    return res.status(401).json({ error: 'Authentication required' });
};

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
    } catch (err) {
        // Soft fail: Just proceed as guest if token is weird
    }
    next();
};

// --- NEW DATA ROUTES (Asset Specific) ---

const SUPPORTED_ASSETS = {
    'BTC': 'https://try3btc.up.railway.app',
    'XRP': 'https://try3xrp.up.railway.app',
    'SOL': 'https://try3sol.up.railway.app'
};

const SUPPORTED_ENDPOINTS = ['current', 'live', 'backtest', 'recent'];

// --- BATCH ROUTE (ALL ASSETS) ---
// This handles requests like /api/signals/all/current or /api/signals/all/recent
app.get('/api/signals/all/:type', optionalAuthenticate, async (req, res) => {
    const type = req.params.type.toLowerCase();

    // 1. Validation
    if (!SUPPORTED_ENDPOINTS.includes(type)) {
        return res.status(404).json({ error: 'Invalid endpoint type.' });
    }

    // 2. Paywall Check only for "current" signal
    if (type === 'current') {
        const user = req.user;
        const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
        
        if (!user) {
             return res.status(401).json({ error: 'Authentication required for live signals.' });
        }
        if (!isSubscribed) {
            return res.status(403).json({ error: 'Subscription required to view current signals.' });
        }
    }

    // 3. Parallel Fetching
    const assets = Object.keys(SUPPORTED_ASSETS);
    const results = {};

    try {
        const promises = assets.map(async (asset) => {
            const baseUrl = SUPPORTED_ASSETS[asset];
            const targetUrl = `${baseUrl}/api/${type}`;
            try {
                const response = await fetch(targetUrl);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                const data = await response.json();
                results[asset] = data;
            } catch (err) {
                results[asset] = { error: 'Unavailable', details: err.message };
            }
        });

        await Promise.all(promises);
        res.json(results);

    } catch (err) {
        console.error('Batch Proxy Error:', err);
        res.status(502).json({ error: 'Failed to fetch batch data.' });
    }
});

// --- SINGLE ASSET ROUTE ---
app.get('/api/signals/:asset/:type', optionalAuthenticate, async (req, res) => {
    const asset = req.params.asset.toUpperCase();
    const type = req.params.type.toLowerCase();

    // 1. Validation
    if (!SUPPORTED_ASSETS[asset]) {
        return res.status(404).json({ error: 'Asset not supported. Only BTC, XRP, SOL available.' });
    }
    if (!SUPPORTED_ENDPOINTS.includes(type)) {
        return res.status(404).json({ error: 'Invalid endpoint type.' });
    }

    // 2. Paywall Check only for "current" signal
    if (type === 'current') {
        const user = req.user;
        // User must be logged in AND subscribed
        const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
        
        if (!user) {
             return res.status(401).json({ error: 'Authentication required for live signals.' });
        }
        if (!isSubscribed) {
            return res.status(403).json({ error: 'Subscription required to view current signals.' });
        }
    }

    // 3. Proxy Request
    try {
        const baseUrl = SUPPORTED_ASSETS[asset];
        const targetUrl = `${baseUrl}/api/${type}`;
        
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`Upstream API error: ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(`Proxy Error (${asset}/${type}):`, err);
        res.status(502).json({ error: 'Failed to fetch signal data from prediction engine.' });
    }
});

// --- AUTH ROUTES ---
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
    } catch (err) {
        console.error('Portal Error:', err);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// --- LEGAL ROUTES ---
const LEGAL_GITHUB_BASE = 'https://raw.githubusercontent.com/constantinbender51-cmyk/Primate-Signals/main/API';

app.get('/legal/impressum', async (req, res) => {
    try {
        const response = await fetch(`${LEGAL_GITHUB_BASE}/impressum.txt`);
        if (!response.ok) throw new Error('GitHub fetch failed');
        res.set('Content-Type', 'text/plain');
        res.send(await response.text());
    } catch (err) { res.status(500).send('Could not fetch Impressum'); }
});
app.get('/legal/privacy', async (req, res) => { /* ... */ });
app.get('/legal/terms', async (req, res) => { /* ... */ });


app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({error: 'Not Found'});
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

initDB().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log(`Server running on port ${process.env.PORT || 3000}`));
});
