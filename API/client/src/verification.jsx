import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from './api';

export default function Verification() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Intercept the return from Stripe Identity
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    
    if (query.get('verified')) {
      // 1. Get current user from memory
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // 2. Optimistically update them to verified
        user.is_verified = true;
        localStorage.setItem('user', JSON.stringify(user));
      }
      // 3. Send them to the worker dashboard
      navigate('/terminal');
    }
  }, [location, navigate]);

  const handleStartVerification = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/worker/create-verification-session');
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      alert("Failed to connect to verification provider. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify Your Identity</h2>
        
        <p className="text-gray-600 mb-8">
          To ensure the safety of our platform, we require all AI Providers to verify their identity. 
          You will need a government-issued ID and your device's camera.
        </p>

        <button 
          onClick={handleStartVerification} 
          disabled={loading}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 transition-colors"
        >
          {loading ? 'Connecting to Stripe...' : 'Start Verification'}
        </button>
      </div>
    </div>
  );
}