import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // Clear user data on logout
    navigate('/login');
  };

  return (
    <>
      {/* Toast Notification Container */}
      <Toaster position="top-right" />

      {/* Navigation Bar */}
      <nav className="navbar">
        <Link to="/" className="nav-brand">Primate</Link>
        <div>
          {isLoggedIn ? (
            <button className="secondary" onClick={handleLogout}>Logout</button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>

      {/* Page Content Renders Here */}
      <main className="container">
        <Outlet />
      </main>

      {/* Footer with Legal Links */}
      <footer style={{ 
          marginTop: '4rem', 
          padding: '2rem 1rem', 
          background: '#f1f5f9', 
          borderTop: '1px solid var(--border)', 
          textAlign: 'center',
          fontSize: '0.9rem',
          color: '#64748b'
      }}>
          <div className="container" style={{maxWidth: '800px'}}>
              <p>&copy; {new Date().getFullYear()} Trading signals. All rights reserved.</p>
              <div style={{marginTop: '1rem'}}>
                  <Link to="/legal/impressum" style={{margin: '0 10px', color: 'var(--primary)', textDecoration: 'none'}}>Impressum</Link>
                  <Link to="/legal/privacy-policy" style={{margin: '0 10px', color: 'var(--primary)', textDecoration: 'none'}}>Privacy Policy</Link>
                  <Link to="/legal/terms-of-service" style={{margin: '0 10px', color: 'var(--primary)', textDecoration: 'none'}}>Terms of Service</Link>
              </div>
          </div>
      </footer>
    </>
  );
}
