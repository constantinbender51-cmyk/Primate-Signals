import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <Toaster 
        position="top-center" 
        toastOptions={{
            style: {
                background: '#000',
                color: '#fff',
                fontFamily: 'Helvetica Neue',
                borderRadius: '0px',
            },
        }}
      />

      <nav className="navbar">
        <Link to="/" className="nav-brand">Primate</Link>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/api-docs" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>API</Link>
          {isLoggedIn ? (
            <button className="secondary" onClick={handleLogout} style={{padding: '0.5rem 1rem'}}>Logout</button>
          ) : (
            <Link to="/login" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>Login</Link>
          )}
        </div>
      </nav>

      <main className="container">
        <Outlet />
      </main>

      <footer style={{ 
          marginTop: '6rem', 
          padding: '4rem 2rem', 
          borderTop: '1px solid var(--border-color)', 
          fontSize: '0.8rem',
          textAlign: 'center'
      }}>
          <div style={{maxWidth: '600px', margin: '0 auto'}}>
              <p>&copy; {new Date().getFullYear()} Primate Research.</p>
              <div style={{marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '2rem'}}>
                  <Link to="/legal/impressum" style={{textDecoration: 'none'}}>Impressum</Link>
                  <Link to="/legal/privacy-policy" style={{textDecoration: 'none'}}>Privacy</Link>
                  <Link to="/legal/terms-of-service" style={{textDecoration: 'none'}}>Terms</Link>
              </div>
          </div>
      </footer>
    </>
  );
}
