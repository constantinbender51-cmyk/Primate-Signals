import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './api';
import toast from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleManage = async () => { 
    try {
      const res = await api.post('/create-portal-session');
      window.location.href = res.data.url;
    } catch (err) { toast.error("Error"); }
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
            <Link to="/api-docs">API</Link>
        </div>
        <div style={{ display: 'inline-block', float: 'right' }}>
            {isLoggedIn && (
                <button onClick={handleManage}>Manage Subscription</button>
            )}
        </div>
      </div>
      
      <div style={{ fontStyle: 'italic', marginBottom: '20px' }}>
        Trading Signals
      </div>

      <main>
        <Outlet />
      </main>

      <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #000', fontSize: '12px' }}>
          <p>&copy; {new Date().getFullYear()} Primate Research.</p>
          <div>
              <Link to="/legal/impressum">Impressum</Link> |{' '}
              <Link to="/legal/privacy-policy">Privacy Policy</Link> |{' '}
              <Link to="/legal/terms-of-service">Terms of Service</Link>
          </div>
      </footer>
    </>
  );
}
