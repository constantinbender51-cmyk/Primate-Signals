// client/src/login.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get role from URL query parameter
  const role = new URLSearchParams(location.search).get('role') || 'client';
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      console.log('Logging in with:', { email, role });
      
      // Simulate API response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save user data to localStorage for demo purposes
      localStorage.setItem('user', JSON.stringify({
        email,
        role,
        isVerified: true,
        subscription: role === 'client' ? { 
          plan: 'pro', 
          status: 'active',
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        } : null
      }));
      
      setLoading(false);
      
      // Redirect to appropriate dashboard
      if (role === 'client') {
        navigate('/chat');
      } else {
        navigate('/terminal');
      }
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center mb-6">
            <span className="text-3xl font-bold text-emerald-600">HumanAI</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <a href="/signup" className="font-medium text-emerald-600 hover:text-emerald-500">
              create a new account
            </a>
          </p>
        </div>
        
        <div className="flex space-x-2 justify-center mb-6">
          <button
            onClick={() => navigate('/login?role=client')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              role === 'client'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            I'm a User
          </button>
          <button
            onClick={() => navigate('/login?role=worker')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              role === 'worker'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            I'm an AI Provider
          </button>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              {error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
            
            <div className="text-sm">
              <a href="#" className="font-medium text-emerald-600 hover:text-emerald-500">
                Forgot your password?
              </a>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                role === 'client' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${
                role === 'client' ? 'emerald' : 'blue'
              }-500 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}