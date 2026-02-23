import React, { useState } from 'react';
import api from './api';

export default function Subscription() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Calls your actual backend to get a Stripe Checkout Session
      const res = await api.post('/create-checkout-session');
      // Redirects user to actual Stripe page
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
          className="w-full py-3 px-4 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700"
        >
          {loading ? 'Connecting to Stripe...' : 'Subscribe via Stripe'}
        </button>
      </div>
    </div>
  );
}