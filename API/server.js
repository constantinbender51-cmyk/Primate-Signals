// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to database');
  release();
});

// Create tables if they don't exist
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(10) NOT NULL CHECK (role IN ('client', 'worker')),
        api_key VARCHAR(255) UNIQUE,
        stripe_customer_id VARCHAR(255),
        subscription_status VARCHAR(20) DEFAULT 'inactive',
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT false,
        verification_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Database tables checked.");
  } catch (err) {
    console.error("❌ Database setup failed:", err);
  } finally {
    client.release();
  }
};
setupDatabase();

// Authentication middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based middleware
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    next();
  };
};

// Public routes
app.post('/auth/register', async (req, res) => {
  const { email, password, role } = req.body;
  
  // Validate role
  if (!['client', 'worker'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  // Validate password
  if (!password || password.length < 8 || !/\d/.test(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters and include a number' 
    });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if email exists
    const userCheck = await client.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );
    
    if (userCheck.rows.length > 0) {
      client.release();
      return res.status(409).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const hash = await bcrypt.hash(password, 10);
    
    // Create API key for workers
    const apiKey = role === 'worker' ? crypto.randomBytes(24).toString('hex') : null;
    
    // Create user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, role, api_key, is_active) 
       VALUES ($1, $2, $3, $4, false) 
       RETURNING id, email, role`,
      [email, hash, role, apiKey]
    );
    
    client.release();
    
    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const client = await pool.connect();
    const user = (await client.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
    client.release();
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account not verified' });
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        is_verified: user.is_verified
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        email: user.email, 
        role: user.role,
        is_verified: user.is_verified,
        subscription_status: user.subscription_status
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login error' });
  }
});

// Client routes (require client role)
app.post('/create-checkout-session', authenticate, requireRole('client'), async (req, res) => {
  try {
    const { user } = req;
    
    let customerId = user.stripe_customer_id;
    
    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email
      });
      
      // Update user with customer ID
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, user.id]
      );
      
      customerId = customer.id;
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
      subscription_ {
        trial_period_days: 7
      }
    });
    
    res.json({ id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Worker routes (require worker role)
app.post('/api/worker/verification', authenticate, requireRole('worker'), async (req, res) => {
  const { idFront, idBack, selfie } = req.body;
  
  try {
    const client = await pool.connect();
    
    // Update verification data
    await client.query(
      `UPDATE users 
       SET verification_data = $1, is_verified = false 
       WHERE id = $2`,
      [JSON.stringify({ idFront, idBack, selfie }), req.user.id]
    );
    
    client.release();
    
    res.json({ message: 'Verification submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification submission failed' });
  }
});

// Webhook for Stripe events
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  const client = await pool.connect();
  
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Update user subscription status
      await client.query(
        `UPDATE users 
         SET subscription_status = 'active' 
         WHERE stripe_customer_id = $1`,
        [session.customer]
      );
    } 
    else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      
      if (invoice.subscription && invoice.lines?.data?.length > 0) {
        const periodEnd = invoice.lines.data[0].period.end;
        const nextBilling = new Date(periodEnd * 1000);
        
        await client.query(
          `UPDATE users 
           SET subscription_status = 'active', next_billing_date = $1 
           WHERE stripe_customer_id = $2`,
          [nextBilling, invoice.customer]
        );
      }
    }
    else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const nextBilling = new Date(subscription.current_period_end * 1000);
      
      await client.query(
        `UPDATE users 
         SET subscription_status = $1, next_billing_date = $2 
         WHERE stripe_customer_id = $3`,
        [subscription.status, nextBilling, subscription.customer]
      );
    }
    else if (event.type === 'customer.subscription.deleted') {
      await client.query(
        `UPDATE users 
         SET subscription_status = 'canceled' 
         WHERE stripe_customer_id = $1`,
        [event.data.object.customer]
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

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});