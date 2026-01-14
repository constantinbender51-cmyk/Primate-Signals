import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = (e) => {
    e.preventDefault(); // Prevent navigation if using anchor tag
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { border: '1px solid black', background: '#fff', color: '#000' } }}/>

      <header>
        <h1>Primate Research</h1>
        <nav>
          <Link to="/">Dashboard</Link>
          {' | '}
          <Link to="/api-docs">API Documentation</Link>
          {' | '}
          {isLoggedIn ? (
             <a href="#" onClick={handleLogout}>Logout</a>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>

      <hr />

      <main>
        <Outlet />
      </main>

      <hr />

      <footer>
        <p>&copy; {new Date().getFullYear()} Primate Research.</p>
        <nav>
            <Link to="/legal/impressum">Impressum</Link> • 
            <Link to="/legal/privacy-policy">Privacy</Link> • 
            <Link to="/legal/terms-of-service">Terms</Link>
        </nav>
      </footer>
    </>
  );
}
