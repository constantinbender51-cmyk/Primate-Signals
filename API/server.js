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


// --- 2. AUTH MIDDLEWARE ---
const authenticate = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API Key missing' });
    }

    try {
        const result = await pool.query(
            'SELECT id, email FROM users WHERE api_key = $1 AND is_active = true', 
            [apiKey]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Invalid or inactive API Key' });
        }

        req.user = result.rows[0]; 
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Auth Error' });
    }
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
