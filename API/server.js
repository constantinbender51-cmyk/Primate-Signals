require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const jwt = require('jsonwebtoken');


// --- 1. AUTO-SETUP FUNCTION ---
// This runs once every time the server starts
// --- 1. AUTO-SETUP FUNCTION ---
const initDB = async () => {
    try {
        const client = await pool.connect();
        
        // A. Create Users Table (For fresh installs)
        // We added password_hash, stripe_customer_id, and subscription_status
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                api_key VARCHAR(255) UNIQUE, 
                password_hash VARCHAR(255),
                stripe_customer_id VARCHAR(255),
                subscription_status VARCHAR(50) DEFAULT 'inactive',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // B. Database Migration (For your EXISTING live database)
        // These lines ensure your current table gets the new columns safely.
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';`);
        
        // Make api_key nullable if it was previously NOT NULL, because web-only users might not need one immediately.
        // (Optional: Only run if you want to allow users without API keys)
        await client.query(`ALTER TABLE users ALTER COLUMN api_key DROP NOT NULL;`);

        // C. Create Default Admin User
        // We now include a placeholder for password_hash and set status to active
        await client.query(`
            INSERT INTO users (email, api_key, subscription_status) 
            VALUES ('admin@test.com', 'super_secret_123', 'active') 
            ON CONFLICT (email) DO NOTHING;
        `);

        console.log("✅ Database tables checked/migrated successfully.");
        client.release();
    } catch (err) {
        console.error("❌ Database setup failed:", err);
    }
};
const bcrypt = require('bcrypt');
// Replace 'sk_test_...' with your actual Stripe Secret Key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 
// --- AUTH ROUTES ---

// POST /auth/register
app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;

    // 1. Basic Validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const client = await pool.connect();

        // 2. Check if user already exists
        const checkUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            client.release();
            return res.status(409).json({ error: 'User already exists' });
        }

        // 3. Hash the password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 4. Create Customer in Stripe
        // We do this NOW so every user has a Stripe ID ready for when they want to pay.
        const customer = await stripe.customers.create({
            email: email,
        });

        // 5. Insert into Database
        // Note: subscription_status defaults to 'inactive' via the table definition
        const newUser = await client.query(
            `INSERT INTO users (email, password_hash, stripe_customer_id) 
             VALUES ($1, $2, $3) 
             RETURNING id, email, subscription_status`,
            [email, passwordHash, customer.id]
        );

        client.release();

        // 6. Respond (Exclude password hash!)
        res.status(201).json({ 
            message: 'User registered successfully',
            user: newUser.rows[0] 
        });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const client = await pool.connect();

        // 1. Find user by email
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        client.release();

        // 2. User not found?
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 3. Password doesn't match?
        // We compare the plain text password with the stored hash
        const isValid = await bcrypt.compare(password, user.password_hash || '');
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 4. Generate JWT Token
        // This token contains the user's ID and current subscription status.
        // It expires in 1 hour (common for security).
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                role: 'user' 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // 5. Respond with Token and User Info
        res.json({
            message: 'Login successful',
            token: token,
            user: {
                email: user.email,
                subscription_status: user.subscription_status,
                stripe_customer_id: user.stripe_customer_id
            }
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// --- 2. DUAL AUTH MIDDLEWARE ---
const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key']; // Method A: API Key
    const authHeader = req.headers['authorization']; // Method B: JWT Token

    // --- PATH A: API KEY (For Scripts) ---
    if (apiKey) {
        try {
            const result = await pool.query(
                'SELECT id, email, subscription_status FROM users WHERE api_key = $1 AND is_active = true', 
                [apiKey]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Invalid or inactive API Key' });
            }

            req.user = result.rows[0]; 
            return next(); // Success!
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Auth Error' });
        }
    }

    // --- PATH B: JWT (For Website Users) ---
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]; // Remove "Bearer " prefix

        try {
            // 1. Verify the signature
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 2. Fetch fresh user data (Important!)
            // We fetch from DB again to ensure they haven't been banned 
            // or had their subscription canceled since the token was issued.
            const result = await pool.query(
                'SELECT id, email, subscription_status, stripe_customer_id FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'User no longer exists or is inactive' });
            }

            req.user = result.rows[0];
            return next(); // Success!

        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    }

    // --- PATH C: REJECT ---
    return res.status(401).json({ error: 'Authentication required (API Key or Login)' });
};
// --- 2.5. SUBSCRIPTION CHECK MIDDLEWARE ---
const requireSubscription = (req, res, next) => {
    // 1. Safety check: Ensure authenticate ran first
    if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    // 2. Check status
    // We allow 'active' (paid) or 'trialing' (if you add trials later)
    if (req.user.subscription_status !== 'active' && req.user.subscription_status !== 'trialing') {
        return res.status(403).json({ 
            error: 'Subscription required', 
            code: 'SUBSCRIPTION_REQUIRED' // Frontend can use this code to show a popup
        });
    }

    // 3. User is paid up, proceed!
    next();
};

// --- 3. ROUTES ---

app.get('/', (req, res) => {
    res.send('API is live and Database is ready.');
});

app.get('/live_matrix', authenticate, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM live_matrix');
        client.release();
        res.json({ results: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/signal_history', authenticate, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM signal_history');
        client.release();
        res.json({ results: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- 4. START SERVER ---
// We wait for the DB setup to finish before listening
initDB().then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server running`);
    });
});
