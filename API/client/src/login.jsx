import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Wipe old cache before logging in
    localStorage.clear(); 
    
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Save Real JWT & User Data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // HARD REDIRECT: Forces React to re-mount with the fresh localStorage data
      if (res.data.user.role === 'client') {
        window.location.href = res.data.user.subscription_status === 'active' ? '/chat' : '/subscription';
      } else {
        window.location.href = res.data.user.is_verified ? '/terminal' : '/verification';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">Sign In</h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}
          <input type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-emerald-500" />
          <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-emerald-500" />
          <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-emerald-600 text-white rounded hover:bg-emerald-700">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="text-center text-sm"><Link to="/signup" className="text-emerald-600 hover:text-emerald-500">Need an account? Sign up</Link></div>
      </div>
    </div>
  );
}