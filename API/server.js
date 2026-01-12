require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Allow website to talk to backend later

// 1. Connect to Railway Database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Railway
});

// 2. Security Middleware (The API Key Lock)
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.MY_SECRET_KEY) {
        return res.status(403).json({ error: 'Access Denied: Wrong Key' });
    }
    next();
};

// 3. Simple Route
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// 4. Secured Database Route
app.get('/users', authenticate, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM live_matrix');

        const results = { 'results': (result) ? result.rows : null};
        res.json(results);
        client.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running`);
});
