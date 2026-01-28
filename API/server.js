require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const app = express();
const OCTOPUS_URL = 'https://spearhead-production.up.railway.app/';

app.use(express.json());
app.use(cors());

// ... (Auth Middleware & User logic remains identical to previous file) ...

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

// --- NEW PROXY ROUTES ---

// 1. Get List of Assets (Public or Auth, doesn't matter much, let's keep it open for UI populating)
app.get('/api/octopus/assets', async (req, res) => {
    try {
        const response = await fetch(`${OCTOPUS_URL}/api/assets`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(502).json({ error: 'Upstream unavailable' });
    }
});

// 2. Get Specific Symbol Status (Paywalled)
app.get('/api/octopus/status/:symbol', optionalAuthenticate, async (req, res) => {
    const user = req.user;
    const isSubscribed = user && (user.subscription_status === 'active' || user.subscription_status === 'trialing');
    
    if (!user) return res.status(401).json({ error: 'Auth required' });
    if (!isSubscribed) return res.status(403).json({ error: 'Sub required' });

    const symbol = req.params.symbol;
    try {
        const response = await fetch(`${OCTOPUS_URL}/api/status?symbol=${symbol}`);
        if (response.status === 404) return res.status(404).json({ error: 'Symbol initializing' });
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(502).json({ error: 'Failed to fetch strategy data' });
    }
});

// ... (Rest of Auth/Stripe routes remain identical) ...

app.listen(process.env.PORT || 3000, () => console.log(`Server running`));
