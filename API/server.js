require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const path = require('path');

// --- NEW SOCKET IMPORTS ---
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;

// --- CREATE HTTP SERVER & SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());

// ==========================================
// DATABASE SETUP & SEEDING
// ==========================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    // 1. Create the base table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Safely add new columns if they are missing
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'client';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(255) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_data JSONB;
    `);

    // 3. SEED MASTER ACCOUNTS FOR TESTING
    const testPassword = await bcrypt.hash('master123', 10);

    // Insert Master Client (Bypasses Payment)
    await client.query(`
      INSERT INTO users (email, password_hash, role, subscription_status, is_active)
      VALUES ('client@test.com', $1, 'client', 'active', true)
      ON CONFLICT (email) DO UPDATE 
      SET subscription_status = 'active', is_active = true, role = 'client';
    `, [testPassword]);

    // Insert Master Worker (Bypasses Verification)
    await client.query(`
      INSERT INTO users (email, password_hash, role, is_verified, is_active)
      VALUES ('worker@test.com', $1, 'worker', true, true)
      ON CONFLICT (email) DO UPDATE 
      SET is_verified = true, is_active = true, role = 'worker';
    `, [testPassword]);

    console.log("✅ Database tables checked and Master accounts seeded.");
  } catch (err) {
    console.error("❌ Database setup failed:", err);
  } finally {
    client.release();
  }
};
setupDatabase();

// ==========================================
// REAL-TIME WEBSOCKET LOGIC (CHAT)
// ==========================================
const activeRequests = {}; // Holds pending chat requests

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // 1. Client sends a request for an AI chat
  socket.on('request_chat', (data) => {
    const request = {
      id: socket.id, // Using socket ID as the room/request ID
      user: data.user || 'Anonymous User',
      topic: data.topic || 'General Inquiry',
      message: data.message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priority: 'normal'
    };
    activeRequests[socket.id] = request;
    
    // Broadcast to all connected workers
    io.emit('new_request', request);
  });

  // 2. Worker accepts the chat
  socket.on('accept_request', (requestId) => {
    if (activeRequests[requestId]) {
      const room = requestId; 
      socket.join(room); // Worker joins the specific chat room
      
      // Remove request from the global queue
      delete activeRequests[requestId];
      io.emit('request_removed', requestId); 
      
      // Tell the specific client their chat was accepted
      io.to(room).emit('chat_started', { room });
    }
  });

  // 3. Client joins their own room on connect
  socket.on('join_room', (room) => {
    socket.join(room);
  });

  // 4. Handle sending messages back and forth
  socket.on('send_message', (data) => {
    // data = { room, text, sender: 'user' | 'ai' }
    io.to(data.room).emit('receive_message', {
      id: Date.now(),
      text: data.text,
      sender: data.sender,
      room: data.room, // <--- FIX: This was missing!
      timestamp: new Date()
    });
  });

  // 5. Cleanup when someone closes the tab
  socket.on('disconnect', () => {
    if (activeRequests[socket.id]) {
      delete activeRequests[socket.id];
      io.emit('request_removed', socket.id);
    }
    console.log('User disconnected:', socket.id);
  });
});

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) return res.status(403).json({ error: `Requires ${role} role` });
  next();
};

// ==========================================
// STRIPE WEBHOOK (MUST BE BEFORE express.json())
// ==========================================
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  const client = await pool.connect();
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await client.query(
        `UPDATE users SET subscription_status = 'active' WHERE stripe_customer_id = $1`, 
        [session.customer]
      );
    } 
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await client.query(
        `UPDATE users SET subscription_status = 'canceled' WHERE stripe_customer_id = $1`, 
        [subscription.customer]
      );
    } 
    else if (event.type === 'identity.verification_session.verified') {
      const session = event.data.object;
      const userId = session.metadata.userId; 
      if (userId) {
        await client.query(`UPDATE users SET is_verified = true WHERE id = $1`, [userId]);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Database Error:', err);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// ==========================================
// STANDARD API ROUTES
// ==========================================
// Increase payload size in case of large requests
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- AUTH ROUTES ---
app.post('/auth/register', async (req, res) => {
  const { email, password, role } = req.body;
  if (!['client', 'worker'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  
  try {
    const client = await pool.connect();
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      client.release();
      return res.status(409).json({ error: 'Email already in use' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const apiKey = role === 'worker' ? crypto.randomBytes(24).toString('hex') : null;
    
    const result = await client.query(
      `INSERT INTO users (email, password_hash, role, api_key, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, email, role`,
      [email, hash, role, apiKey]
    );
    client.release();
    res.status(201).json({ message: 'User created', user: result.rows[0] });
  } catch (err) {
    console.error("Register Error:", err);
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
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
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
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Login error' });
  }
});

// --- CLIENT STRIPE ROUTES (Checkout) ---
app.post('/create-checkout-session', authenticate, requireRole('client'), async (req, res) => {
  try {
    const client = await pool.connect();
    const user = (await client.query('SELECT * FROM users WHERE id = $1', [req.user.id])).rows[0];
    let customerId = user.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      await client.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, user.id]);
      customerId = customer.id;
    }
    client.release();
    
    // Safely construct the domain to ensure it has https://
    let domain = process.env.CLIENT_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:3000';
    if (!domain.startsWith('http')) domain = `https://${domain}`;
    if (domain.endsWith('/')) domain = domain.slice(0, -1);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: `${domain}/subscription?success=true`,
      cancel_url: `${domain}/subscription?canceled=true`,
      subscription_data: { trial_period_days: 7 }
    });
    
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Error:", err);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// --- WORKER VERIFICATION ROUTE (Stripe Identity) ---
app.post('/api/worker/create-verification-session', authenticate, requireRole('worker'), async (req, res) => {
  try {
    // Safely construct the domain to ensure it has https://
    let domain = process.env.CLIENT_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:3000';
    if (!domain.startsWith('http')) domain = `https://${domain}`;
    if (domain.endsWith('/')) domain = domain.slice(0, -1);
    
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId: req.user.id.toString() 
      },
      return_url: `${domain}/verification?verified=true`, 
    });
    
    res.json({ url: verificationSession.url });
  } catch (err) {
    console.error("Stripe Identity Error:", err);
    res.status(500).json({ error: 'Failed to start verification' });
  }
});

// ==========================================
// SERVE FRONTEND IN PRODUCTION (RAILWAY FIX)
// ==========================================
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// ==========================================
// START SERVER (Using HTTP server for WebSockets)
// ==========================================
server.listen(port, () => console.log(`🚀 Server & WebSockets running on port ${port}`));