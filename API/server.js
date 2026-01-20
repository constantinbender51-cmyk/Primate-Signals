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

// --- 1. AUTO-SETUP FUNCTION ---
const initDB = async () => {
    try {
        const client = await pool.connect();
        
        // Users Table
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

        // Migrations
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP;`);
        // ... (Keep other migrations if needed, but they are safe to run repeatedly)

        // Ensure Admin Exists
        await client.query(`
            INSERT INTO users (email, api_key, subscription_status, is_active) 
            VALUES ('admin@test.com', 'super_secret_123', 'active', true) 
            ON CONFLICT (email) DO NOTHING;
        `);

        console.log("✅ Database tables checked.");
        client.release();
    } catch (err) {
        console.error("❌ Database setup failed:", err);
    }
};

// --- 2. WEBHOOK ROUTE (Stripe) ---
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const client = await pool.connect();
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await client.query(
                    `UPDATE users SET subscription_status = 'active' WHERE stripe_customer_id = $1`,
                    [session.customer]
                );
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const nextPayment = new Date(invoice.lines.data[0].period_end * 1000);
                await client.query(
                    `UPDATE users SET next_billing_date = $1, subscription_status = 'active' WHERE stripe_customer_id = $2`,
                    [nextPayment, invoice.customer]
                );
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await client.query(
                    `UPDATE users SET subscription_status = 'inactive', next_billing_date = NULL WHERE stripe_customer_id = $1`,
                    [subscription.customer]
                );
                break;
            }
            case 'invoice.payment_failed': {
                 const invoice = event.data.object;
                 await client.query(
                    `UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = $1`,
                    [invoice.customer]
                );
                break;
            }
        }
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook handler failed:', err);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

app.use(express.json()); 
app.use(cors());

// --- 3. AUTH MIDDLEWARE ---
const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    if (apiKey) {
        try {
            const result = await pool.query(
                'SELECT id, email, subscription_status, api_key, stripe_customer_id, trial_ends_at, next_billing_date FROM users WHERE api_key = $1 AND is_active = true', 
                [apiKey]
            );
            if (result.rows.length === 0) return res.status(403).json({ error: 'Invalid or inactive API Key' });
            req.user = result.rows[0]; 
            return next();
        } catch (err) { return res.status(500).json({ error: 'Auth Error' }); }
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const result = await pool.query(
                'SELECT id, email, subscription_status, stripe_customer_id, api_key, trial_ends_at, next_billing_date FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );
            if (result.rows.length === 0) return res.status(401).json({ error: 'User no longer exists' });
            req.user = result.rows[0];
            return next();
        } catch (err) { return res.status(401).json({ error: 'Invalid Token' }); }
    }
    return res.status(401).json({ error: 'Authentication required' });
};

const requireSubscription = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
    if (req.user.subscription_status !== 'active' && req.user.subscription_status !== 'trialing') {
        return res.status(403).json({ error: 'Subscription required' });
    }
    next();
};

// --- 4. ROUTES ---

// Auth
app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const client = await pool.connect();
        const checkUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) { client.release(); return res.status(409).json({ error: 'User already exists' }); }

        const passwordHash = await bcrypt.hash(password, 10);
        const customer = await stripe.customers.create({ email: email });
        const apiKey = crypto.randomBytes(24).toString('hex'); 
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expiry = new Date(Date.now() + 10 * 60000); 
        const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 30);

        await client.query(
            `INSERT INTO users (email, password_hash, stripe_customer_id, api_key, verification_code, verification_expiry, trial_ends_at, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
            [email, passwordHash, customer.id, apiKey, code, expiry, trialEnd]
        );
        client.release();

        // Send Email (Fire and forget)
        transporter.sendMail({
            from: `"Primate Signals" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Verify your account",
            text: `Code: ${code}`,
            html: `<b>Code: ${code}</b>`
        }).catch(console.error);

        res.status(201).json({ message: 'Verification code sent', email });
    } catch (err) { res.status(500).json({ error: 'Register Error' }); }
});

app.post('/auth/verify', async (req, res) => {
    const { email, code } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) { client.release(); return res.status(400).json({ error: 'User not found' }); }
        if (user.verification_code !== code) { client.release(); return res.status(400).json({ error: 'Invalid code' }); }
        
        await client.query(`UPDATE users SET is_active = true, verification_code = NULL WHERE id = $1`, [user.id]);
        client.release();
        res.json({ message: 'Verified' });
    } catch (err) { res.status(500).json({ error: 'Verify Error' }); }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        client.release();

        if (!user || !(await bcrypt.compare(password, user.password_hash || ''))) return res.status(401).json({ error: 'Invalid credentials' });
        if (!user.is_active) return res.status(403).json({ error: 'Not verified' });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { 
            email: user.email, 
            subscription_status: user.subscription_status, 
            api_key: user.api_key 
        }});
    } catch (err) { res.status(500).json({ error: 'Login Error' }); }
});

app.get('/auth/me', authenticate, (req, res) => {
    res.json(req.user);
});

// Data
app.get('/live_matrix', authenticate, requireSubscription, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM live_matrix');
        client.release();
        res.json({ results: result.rows });
    } catch (err) { res.status(500).json({ error: 'DB Error' }); }
});

// *** FIXED SIGNAL HISTORY ENDPOINT ***
app.get('/signal_history', async (req, res) => {
    try {
        const client = await pool.connect();
        // CHANGED: Removed 'ORDER BY created_at' which was causing crash. 
        // Using 'ORDER BY id DESC' as a safe default for latest items.
        const result = await client.query('SELECT * FROM signal_history ORDER BY id DESC');
        client.release();
        res.json({ results: result.rows });
    } catch (err) { 
        console.error("Signal History Error:", err);
        res.status(500).json({ error: 'Database error', details: err.message }); 
    }
});

// Stripe Checkout
app.post('/create-checkout-session', authenticate, async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer: req.user.stripe_customer_id,
            line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
            subscription_data: { trial_period_days: 30 },
            success_url: `${process.env.CLIENT_URL}/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/`,
        });
        res.json({ url: session.url });
    } catch (err) { res.status(500).json({ error: 'Stripe Error' }); }
});

app.post('/create-portal-session', authenticate, async (req, res) => {
    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: req.user.stripe_customer_id,
            return_url: `${process.env.CLIENT_URL}/`,
        });
        res.json({ url: portalSession.url });
    } catch (err) { res.status(500).json({ error: 'Stripe Error' }); }
});

// Static
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({error: 'API Not Found'});
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

// Init
initDB().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log(`Server running on port ${process.env.PORT || 3000}`));
});
