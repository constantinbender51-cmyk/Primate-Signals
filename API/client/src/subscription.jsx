import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from './api';

export default function Subscription() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Intercept the return from Stripe
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    
    if (query.get('success')) {
      // 1. Get current user from memory
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // 2. Optimistically upgrade them to active
        user.subscription_status = 'active';
        localStorage.setItem('user', JSON.stringify(user));
      }
      // 3. Send them to the chat dashboard
      navigate('/chat');
    }
    
    if (query.get('canceled')) {
      alert("Checkout was canceled.");
    }
  }, [location, navigate]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await api.post('/create-checkout-session');
      window.location.href = res.data.url;
    } catch (err) {
      setLoading(false);
      alert("Failed to connect to billing provider.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex flex-col items-center">
      <h1 className="text-3xl font-extrabold mb-8">Start Your Subscription</h1>
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Pro Plan</h2>
        <p className="text-gray-600 mb-8">Access to unlimited human-powered AI conversations.</p>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3 px-4 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
        >
          {loading ? 'Connecting to Stripe...' : 'Subscribe via Stripe'}
        </button>
      </div>
    </div>
  );
}