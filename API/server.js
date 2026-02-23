require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const path = require('path');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;

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
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'client';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(255) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_data JSONB;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        client_user_id INTEGER NOT NULL REFERENCES users(id),
        worker_user_id INTEGER REFERENCES users(id),
        status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, active, closed
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_user_id INTEGER NOT NULL REFERENCES users(id),
        text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const testPassword = await bcrypt.hash('master123', 10);

    await client.query(`
      INSERT INTO users (email, password_hash, role, subscription_status, is_active)
      VALUES ('client@test.com', $1, 'client', 'active', true)
      ON CONFLICT (email) DO UPDATE 
      SET subscription_status = 'active', is_active = true, role = 'client';
    `, [testPassword]);

    await client.query(`
      INSERT INTO users (email, password_hash, role, is_verified, is_active)
      VALUES ('worker@test.com', $1, 'worker', true, true)
      ON CONFLICT (email) DO UPDATE 
      SET is_verified = true, is_active = true, role = 'worker';
    `, [testPassword]);

    console.log("✅ Database tables checked/created and Master accounts seeded.");
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

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: No token'));
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', async (socket) => {
    console.log(`Authenticated user connected: ${socket.user.email} (Role: ${socket.user.role})`);

    // Join a room for their user ID to receive direct notifications
    socket.join(socket.user.id.toString());

    // --- Logic for WORKERS on connection ---
    if (socket.user.role === 'worker') {
        socket.join('workers'); // Add to the general "workers" room for broadcast
        console.log(`Socket ${socket.id} for ${socket.user.email} joined 'workers' room.`);

        // Send all currently pending requests to this worker
        try {
            const requestsRes = await pool.query(
                `SELECT c.id, u.email as user, 'General' as topic, m.text as message, c.created_at as time
                 FROM chats c
                 JOIN users u ON c.client_user_id = u.id
                 JOIN messages m ON m.id = (SELECT MIN(id) FROM messages WHERE chat_id = c.id)
                 WHERE c.status = 'pending'`
            );
            socket.emit('initial_requests', requestsRes.rows);
        } catch (e) { console.error("Error fetching initial requests:", e); }
    }

    // --- Logic for CLIENTS on connection ---
    if (socket.user.role === 'client') {
        try {
            const chatRes = await pool.query("SELECT * FROM chats WHERE client_user_id = $1 AND status = 'active' LIMIT 1", [socket.user.id]);
            if (chatRes.rows.length > 0) {
                const activeChat = chatRes.rows[0];
                const messagesRes = await pool.query("SELECT m.id, m.text, u.role as sender_role FROM messages m JOIN users u ON m.sender_user_id = u.id WHERE m.chat_id = $1 ORDER BY m.created_at ASC", [activeChat.id]);
                const messages = messagesRes.rows.map(m => ({ ...m, sender: m.sender_role === 'client' ? 'user' : 'ai' }));
                
                socket.emit('active_chat_data', { room: activeChat.id, messages });
                socket.join(activeChat.id.toString());
            }
        } catch(e) { console.error("Error fetching active chat data:", e); }
    }

    // --- Event Listeners ---
    socket.on('request_chat', async (data) => {
        const { text } = data;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const chatRes = await client.query("INSERT INTO chats (client_user_id, status) VALUES ($1, 'pending') RETURNING id, created_at", [socket.user.id]);
            const newChat = chatRes.rows[0];
            await client.query("INSERT INTO messages (chat_id, sender_user_id, text) VALUES ($1, $2, $3)", [newChat.id, socket.user.id, text]);
            await client.query('COMMIT');
            
            const requestPayload = { id: newChat.id, user: socket.user.email, topic: 'General', message: text, time: newChat.created_at };
            console.log("Broadcasting 'new_request' to 'workers' room:", requestPayload);
            io.to('workers').emit('new_request', requestPayload);
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Failed to create chat request:', e);
        } finally {
            client.release();
        }
    });

    socket.on('accept_request', async (chatId) => {
        const chatRes = await pool.query("UPDATE chats SET worker_user_id = $1, status = 'active', updated_at = NOW() WHERE id = $2 AND status = 'pending' RETURNING id, client_user_id", [socket.user.id, chatId]);
        if (chatRes.rows.length > 0) {
            const chat = chatRes.rows[0];
            io.to('workers').emit('request_removed', chatId);
            socket.join(chat.id.toString());
            io.to(chat.client_user_id.toString()).emit('chat_started', { room: chat.id });
        }
    });

    socket.on('join_chat_room', (roomId) => socket.join(roomId.toString()));

    socket.on('send_message', async (data) => {
        const { room, text, sender } = data;
        await pool.query("INSERT INTO messages (chat_id, sender_user_id, text) VALUES ($1, $2, $3)", [room, socket.user.id, text]);
        const messagePayload = { id: Date.now(), text, sender, room, timestamp: new Date() };
        io.to(room.toString()).emit('receive_message', messagePayload);
    });

    socket.on('end_chat', async (chatId) => {
        await pool.query("UPDATE chats SET status = 'closed', updated_at = NOW() WHERE id = $1 AND worker_user_id = $2", [chatId, socket.user.id]);
        io.to(chatId.toString()).emit('chat_ended');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.email);
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
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- AUTH ROUTES ---
app.post('/auth/register', async (req, res) => {
  const { email, password, role } = req.body;
  if (!['client', 'worker'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  
  const client = await pool.connect();
  try {
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(409).json({ error: 'Email already in use' });
    
    const hash = await bcrypt.hash(password, 10);
    const apiKey = role === 'worker' ? crypto.randomBytes(24).toString('hex') : null;
    
    const result = await client.query(
      `INSERT INTO users (email, password_hash, role, api_key, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, email, role`,
      [email, hash, role, apiKey]
    );
    res.status(201).json({ message: 'User created', user: result.rows[0] });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, role: user.role, is_verified: user.is_verified, subscription_status: user.subscription_status } 
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Login error' });
  }
});

// --- NEW WORKER HISTORY ENDPOINT ---
app.get('/api/worker/history', authenticate, requireRole('worker'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.id as room, c.updated_at, u.email as user, 
             (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
             FROM chats c
             JOIN users u ON c.client_user_id = u.id
             WHERE c.worker_user_id = $1 AND c.status = 'closed'
             ORDER BY c.updated_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch(err) {
        console.error("Error fetching worker history:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- CLIENT STRIPE ROUTES (Checkout) ---
app.post('/create-checkout-session', authenticate, requireRole('client'), async (req, res) => {
  try {
    const {rows} = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    let customerId = user.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, user.id]);
      customerId = customer.id;
    }
    
    let domain = process.env.CLIENT_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:5173';
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
    let domain = process.env.CLIENT_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:5173';
    if (!domain.startsWith('http')) domain = `https://${domain}`;
    if (domain.endsWith('/')) domain = domain.slice(0, -1);
    
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId: req.user.id.toString() },
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