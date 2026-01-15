import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './api';
import toast from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  
  // 1. Get User Data
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  
  const isLoggedIn = !!token;
  
  // 2. Check Active Status (Active or Trialing)
  const isActive = isLoggedIn && (user.subscription_status === 'active' || user.subscription_status === 'trialing');

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Manage existing subscription (Stripe Portal)
  const handleManage = async () => { 
    try {
      const res = await api.post('/create-portal-session');
      window.location.href = res.data.url;
    } catch (err) { toast.error("Error opening portal"); }
  };

  // Create new subscription (Stripe Checkout)
  const handleSubscribe = async () => {
    if (!isLoggedIn) {
        navigate('/register');
        return;
    }
    try {
        const res = await api.post('/create-checkout-session');
        window.location.href = res.data.url;
    } catch (err) {
        toast.error("Error starting checkout");
    }
  };

  return (
    <>
      <Toaster 
        position="top-center" 
        toastOptions={{
            style: {
                background: '#fff',
                color: '#000',
                border: '1px solid black',
                borderRadius: '0',
                fontFamily: 'Times New Roman'
            },
        }}
      />

      {/* HEADER */}
      <div>
        <h1 style={{ display: 'inline-block', marginRight: '10px' }}>
             <Link to="/" style={{ textDecoration: 'none', color: '#000' }}>Primate</Link>
        </h1>
        <div style={{ display: 'inline-block' }}>
            {isLoggedIn ? (
                <span><button onClick={handleLogout}>Logout</button></span>
            ) : (
                <span><Link to="/login">Login</Link></span>
            )}
            {' | '}
            {/* 3. Opaque and Unclickable API Link unless Active */}
            <Link 
                to="/api-docs"
