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

// --- EMAIL TRANSPORTER ---
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
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Migrations
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';`);
        await client.query(`ALTER TABLE users ALTER COLUMN api_key DROP NOT NULL;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(4);`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expiry TIMESTAMP;`);
        await client.query(`ALTER TABLE users ALTER COLUMN is_active SET DEFAULT false;`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS live_matrix (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20),
                timeframe VARCHAR(10),
                signal_type VARCHAR(20),
                price DECIMAL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS signal_history (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20),
                action VARCHAR(10),
                entry_price DECIMAL,
                exit_price DECIMAL,
                profit_loss DECIMAL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            INSERT INTO users (email, api_key, subscription_status, is_active) 
            VALUES ('admin@test.com', 'super_secret_123', 'active', true) 
            ON CONFLICT (email) DO NOTHING;
        `);

        console.log("✅ Database tables checked/migrated successfully.");
        client.release();
    } catch (err) {
        console.error("❌ Database setup failed:", err);
    }
};

// --- 2. WEBHOOK ROUTE ---
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
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await client.query(
                    `UPDATE users SET subscription_status = 'inactive' WHERE stripe_customer_id = $1`,
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

// --- 3. MIDDLEWARE ---
app.use(express.json()); 
app.use(cors());

// --- 4. AUTH MIDDLEWARE (FIXED) ---
const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    if (apiKey) {
        try {
            // FIX: Added api_key to selection
            const result = await pool.query(
                'SELECT id, email, subscription_status, api_key, stripe_customer_id FROM users WHERE api_key = $1 AND is_active = true', 
                [apiKey]
            );
            if (result.rows.length === 0) return res.status(403).json({ error: 'Invalid or inactive API Key' });
            req.user = result.rows[0]; 
            return next();
        } catch (err) {
            return res.status(500).json({ error: 'Auth Error' });
        }
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // FIX: Added api_key to selection here as well
            const result = await pool.query(
                'SELECT id, email, subscription_status, stripe_customer_id, api_key FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );
            if (result.rows.length === 0) return res.status(401).json({ error: 'User no longer exists or is inactive' });
            req.user = result.rows[0];
            return next();
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
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

// --- 5. AUTH ROUTES ---

app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    try {
        const client = await pool.connect();
        const checkUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            client.release();
            return res.status(409).json({ error: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const customer = await stripe.customers.create({ email: email });
        const apiKey = crypto.randomBytes(24).toString('hex'); 
        
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expiry = new Date(Date.now() + 10 * 60000); 

        await client.query(
            `INSERT INTO users (email, password_hash, stripe_customer_id, api_key, verification_code, verification_expiry, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, false) 
             RETURNING id, email`,
            [email, passwordHash, customer.id, apiKey, code, expiry]
        );
        
        client.release();

        try {
            await transporter.sendMail({
                from: `"Primate Signals" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Verify your account",
                text: `Your verification code is: ${code}`,
                html: `<b>Your verification code is: ${code}</b>`
            });
            res.status(201).json({ message: 'Verification code sent', email });
        } catch (emailErr) {
            console.error("Email sending failed:", emailErr);
            res.status(201).json({ message: 'Account created, but email failed.', email });
        }

    } catch (err) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/auth/verify', async (req, res) => {
    const { email, code } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) { client.release(); return res.status(400).json({ error: 'User not found' }); }
        if (user.is_active) { client.release(); return res.status(200).json({ message: 'User already active' }); }
        if (user.verification_code !== code) { client.release(); return res.status(400).json({ error: 'Invalid verification code' }); }
        if (new Date() > new Date(user.verification_expiry)) { client.release(); return res.status(400).json({ error: 'Code expired' }); }

        await client.query(
            `UPDATE users SET is_active = true, verification_code = NULL, verification_expiry = NULL WHERE id = $1`,
            [user.id]
        );
        client.release();
        res.json({ message: 'Account verified successfully' });
    } catch (err) { res.status(500).json({ error: 'Verification failed' }); }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        client.release();

        if (!user || !(await bcrypt.compare(password, user.password_hash || ''))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account not verified.' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { email: user.email, subscription_status: user.subscription_status, api_key: user.api_key} });
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

// 5D. GET CURRENT USER (REFRESH)
app.get('/auth/me', authenticate, (req, res) => {
    // Now req.user includes api_key because we fixed the middleware
    res.json({ 
        id: req.user.id,
        email: req.user.email, 
        subscription_status: req.user.subscription_status,
        stripe_customer_id: req.user.stripe_customer_id,
        api_key: req.user.api_key
    });
});

// --- 6. DATA ROUTES ---
app.get('/live_matrix', authenticate, requireSubscription, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM live_matrix');
        client.release();
        res.json({ results: result.rows });
    } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.get('/signal_history', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM signal_history');
        client.release();
        res.json({ results: result.rows });
    } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// --- 7. STRIPE ROUTES ---
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
    } catch (err) { res.status(500).json({ error: 'Failed to create checkout session' }); }
});

app.post('/create-portal-session', authenticate, async (req, res) => {
    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: req.user.stripe_customer_id,
            return_url: `${process.env.CLIENT_URL}/`,
        });
        res.json({ url: portalSession.url });
    } catch (err) { res.status(500).json({ error: 'Failed to create portal session' }); }
});

// --- 8. STATIC FILES ---
app.get('/legal/:type', async (req, res) => {
    const { type } = req.params;
    let filePath;
    switch (type) {
        case 'impressum': filePath = path.join(__dirname, 'impressum.txt'); break;
        case 'privacy': filePath = path.join(__dirname, 'pp.txt'); break;
        case 'terms': filePath = path.join(__dirname, 'tos.txt'); break;
        default: return res.status(404).send('Not Found');
    }
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/plain');
        res.send(content);
    } catch (err) { res.status(500).send('Could not load content'); }
});

app.get('/api-docs', (req, res) => {
    const distPath = path.join(__dirname, 'client/dist', 'index.html');
    const devPath = path.join(__dirname, 'client', 'index.html');
    if (fs.existsSync(distPath)) res.sendFile(distPath);
    else res.sendFile(devPath);
});

app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

// --- 9. START ---
initDB().then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
});
