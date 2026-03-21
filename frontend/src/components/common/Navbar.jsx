import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">🏨 Yoyo Hotels</Link>
      <div className="navbar-links">
        <NavLink to="/hotels">Browse Hotels</NavLink>
        {user ? (
          <>
            <NavLink to="/my-bookings">My Bookings</NavLink>
            {['hotel_admin', 'superadmin'].includes(user.role) && (
              <NavLink to="/admin">Dashboard</NavLink>
            )}
            <button onClick={logout} className="btn-logout">Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register" className="btn-cta">Get Started</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
