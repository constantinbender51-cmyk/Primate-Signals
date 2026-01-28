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

// Upstream URL for Spearhead Engine
const SPEARHEAD_URL = 'https://spearhead-production.up.railway.app';

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

// --- SPEARHEAD STRATEGY PROXY ROUTES ---

// 1. PUBLIC: Trade History (No Auth Required)
app.get('/api/spearhead/history', async (req, res) => {
    try {
        const response = await fetch(`${SPEARHEAD_URL}/api/history`);
        if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Spearhead History Error:", err);
        res.status(502).json({ error: 'Failed to fetch history data' });
    }
});

// 2. PROTECTED: Live Signals (Requires Subscription)
app.get('/api/spearhead/signals', authenticate, async (req, res) => {
    const user = req.user;
    const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
    
    if (!isSubscribed) return res.status(403).json({ error: 'Subscription required for live signals' });

    try {
        const response = await fetch(`${SPEARHEAD_URL}/api/signals`);
        if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Spearhead Signals Error:", err);
        res.status(502).json({ error: 'Failed to fetch live signals' });
    }
});

// 3. PROTECTED: Parameters/Grid Lines (Requires Subscription)
app.get('/api/spearhead/parameters', authenticate, async (req, res) => {
    const user = req.user;
    const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
    
    if (!isSubscribed) return res.status(403).json({ error: 'Subscription required for grid parameters' });

    try {
        const response = await fetch(`${SPEARHEAD_URL}/api/parameters`);
        if (!response.ok) throw new Error(`Upstream Error: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Spearhead Params Error:", err);
        res.status(502).json({ error: 'Failed to fetch parameters' });
    }
});

// --- Auth & System Routes ---

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

const serveTextFile = (filename, res) => {
    const filePath = path.join(__dirname, filename);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading ${filename}:`, err);
            return res.status(500).send("Content unavailable");
        }
        res.send(data);
    });
};

app.get('/api/legal/impressum', (req, res) => serveTextFile('impressum.txt', res));
app.get('/api/legal/privacy', (req, res) => serveTextFile('pp.txt', res));
app.get('/api/legal/terms', (req, res) => serveTextFile('tos.txt', res));

app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path === '/api') {
        return res.status(404).json({ error: 'Not Found' });
    }
    const indexPath = path.join(__dirname, 'client/dist', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(500).send("App not built.");
});

initDB().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log(`Server running`));
});
