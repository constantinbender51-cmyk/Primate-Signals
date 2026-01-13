import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <>
      {/* Toast Notification Container */}
      <Toaster position="top-right" />

      {/* Navigation Bar */}
      <nav className="navbar">
        <Link to="/" className="nav-brand">SignalMatrix</Link>
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
    </>
  );
}
