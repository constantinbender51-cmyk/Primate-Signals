import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './api';
import toast from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  const isLoggedIn = !!token;
  const isActive = isLoggedIn && (user.subscription_status === 'active' || user.subscription_status === 'trialing');

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSubscribe = async () => {
    if (!isLoggedIn) { navigate('/register'); return; }
    try {
        const res = await api.post('/create-checkout-session');
        window.location.href = res.data.url;
    } catch (err) { toast.error("Error starting checkout"); }
  };

  const goToProfile = () => {
    navigate('/profile');
  };

  return (
    <>
      <Toaster position="top-center" />

      <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '3rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #e5e7eb' 
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                  <Link to="/" style={{ 
        textDecoration: 'none', 
        color: '#111827', 
        fontSize: '1.5rem', 
        fontWeight: '800', 
        letterSpacing: '-0.025em',
        display: 'flex',
        alignItems: 'baseline'
    }}>
        <img 
          src="https://i.postimg.cc/8C0fN0Y3/IMG-20260126-201906.png" 
          alt="blacktriangle" 
          style={{ height: '36px', margin: '0 6px' }} 
        />Primate 
        {/* Updated Image Source */}
        
        <span style={{ fontWeight: '300' }}> Signals</span>
    </Link>
              <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {/* Removed duplicate Signals link */}
                  <Link 
                      to="/api-docs"
                      style={{
                          textDecoration: 'none',
                          color: isActive ? '#374151' : '#9ca3af',
                          opacity: isActive ? 1 : 0.5,
                          pointerEvents: isActive ? 'auto' : 'none',
                          alignItems: 'baseline'
                      }}
                  >
                      API
                  </Link>
              </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {isLoggedIn ? (
                  <>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#6b7280', padding: 0, fontWeight: '400' }}>Logout</button>
                    {/* Changed Manage to Profile */}
                    <button onClick={goToProfile} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}>Profile</button>
                  </>
              ) : (
                  <>
                    <Link to="/login" style={{ textDecoration: 'none', color: '#374151', fontSize: '14px', fontWeight: '500' }}>Login</Link>
                    <button onClick={handleSubscribe} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>Try for free</button>
                  </>
              )}
          </div>
      </header>
      
      <main>
        <Outlet />
      </main>

      <footer style={{ marginTop: '6rem', padding: '2rem 0', borderTop: '1px solid #e5e7eb', fontSize: '13px', color: '#6b7280' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p>&copy; {new Date().getFullYear()} Primate.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                  <Link to="/legal/impressum" style={{ color: 'inherit', textDecoration: 'none' }}>Impressum</Link>
                  <Link to="/legal/privacy-policy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
                  <Link to="/legal/terms-of-service" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
              </div>
          </div>
      </footer>
    </>
  );
}
