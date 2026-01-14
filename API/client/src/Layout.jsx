import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <Toaster />
      
      {/* TITLE (No Underline) */}
      <h1>
        <Link to="/" style={{ textDecoration: 'none', color: '#000' }}>Primate</Link>
      </h1>

      {/* NAV (Stacked) */}
      <div style={{ marginBottom: '15px' }}>
        {isLoggedIn ? (
            <a href="#" onClick={handleLogout}>Logout</a>
        ) : (
            <Link to="/login">Login</Link>
        )}
        <br />
        <Link to="/api-docs">API</Link>
      </div>

      <main>
        <Outlet />
      </main>

      {/* FOOTER */}
      <div style={{ marginTop: '30px', fontSize: '12px' }}>
        <Link to="/legal/impressum">Impressum</Link>,{' '}
        <Link to="/legal/privacy-policy">PP</Link>,{' '}
        <Link to="/legal/terms-of-service">ToS</Link>
      </div>
    </>
  );
}
