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
const initDB = async () => {
    try {
        const client = await pool.connect();
        
        // A. Create Users Table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                api_key VARCHAR(255) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // B. Create Default Admin User (So you can log in immediately)
        // The "ON CONFLICT" part prevents errors if you restart the server
        await client.query(`
            INSERT INTO users (email, api_key) 
            VALUES ('admin@test.com', 'super_secret_123') 
            ON CONFLICT (email) DO NOTHING;
        `);

        console.log("✅ Database tables checked/created successfully.");
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
