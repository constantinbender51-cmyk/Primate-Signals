import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from './api';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const role = new URLSearchParams(location.search).get('role') || 'client';
  
  useEffect(() => {
    if (!['client', 'worker'].includes(role)) window.location.href = '/';
  }, [role]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError('Passwords do not match');
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Register
      await api.post('/auth/register', { email, password, role });
      
      // 2. Auto-login immediately after
      const loginRes = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', loginRes.data.token);
      localStorage.setItem('user', JSON.stringify(loginRes.data.user));
      
      // 3. HARD REDIRECT
      if (role === 'client') {
        window.location.href = '/subscription';
      } else {
        window.location.href = '/verification';
      }
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account.');
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Create Account ({role})</h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-emerald-500" />
          <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-emerald-500" />
          <input type="password" required placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-emerald-500" />
          
          <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-emerald-600 text-white rounded hover:bg-emerald-700">
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        <div className="text-center text-sm"><Link to="/login" className="text-emerald-600 hover:text-emerald-500">Already have an account? Log in</Link></div>
      </div>
    </div>
  );
}