import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const FALLBACK_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Goa', 'Jaipur', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad'];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navCities, setNavCities] = useState(FALLBACK_CITIES);
  const userMenuRef = useRef(null);

  // Fetch real cities from DB on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/cities?limit=10`)
      .then(r => r.json())
      .then(d => {
        const cities = d.data?.cities?.map(c => c.city).filter(Boolean) || [];
        if (cities.length > 0) setNavCities(cities);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} id="main-navbar">
      {/* Main Nav */}
      <div className="navbar-main">
        <div className="container navbar-main-inner">
          {/* Logo */}
          <Link to="/" className="navbar-logo" aria-label="YOYO Home">
            <span className="logo-yoyo">YOYO</span>
          </Link>

          {/* Right: Auth */}
          <div className="navbar-auth">
            {user ? (
              <div className="user-menu-wrapper" ref={userMenuRef}>
                <button
                  className="nav-user-btn"
                  onClick={() => setUserMenuOpen(o => !o)}
                  id="nav-user-menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="avatar">{user.firstName?.[0]?.toUpperCase() || 'U'}</div>
                  <span className="nav-user-name">{user.firstName}</span>
                  <span className="nav-chevron"></span>
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown" role="menu">
                    <div className="user-dropdown-header">
                      <div className="avatar avatar-lg">{user.firstName?.[0]?.toUpperCase() || 'U'}</div>
                      <div>
                        <div className="user-name">{user.firstName} {user.lastName}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                    <hr className="divider" />
                    {/* Guest-only links */}
                    {user.role !== 'superadmin' && (
                      <>
                        <Link to="/my-bookings" className="dropdown-item" role="menuitem"> My Bookings</Link>
                        <Link to="/profile" className="dropdown-item" role="menuitem"> My Profile</Link>
                      </>
                    )}

                    {/* Hotel Admin — list / manage their property */}
                    {user.role === 'hotel_admin' && (
                      <Link to="/list-hotel" className="dropdown-item dropdown-item--highlight" role="menuitem">
                         List My Hotel
                      </Link>
                    )}

                    {/* Admin Dashboard */}
                    {['hotel_admin', 'superadmin'].includes(user.role) && (
                      <Link to="/admin" className="dropdown-item" role="menuitem"> Admin Dashboard</Link>
                    )}

                    <hr className="divider" />
                    <button className="dropdown-item dropdown-item--red" onClick={logout} role="menuitem">
                       Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nav-auth-group">
                <Link to="/login" className="btn btn-outline btn-sm" id="nav-login">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm" id="nav-register">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* City Nav Bar */}
      <div className="navbar-cities">
        <div className="container">
          <nav className="city-nav" aria-label="City navigation">
            {navCities.map((city) => (
              <button
                key={city}
                className="city-nav-link"
                onClick={() => navigate(`/hotels?city=${city}`)}
                id={`nav-city-${city.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {city}
              </button>
            ))}
            <button
              className="city-nav-link city-nav-link--all"
              onClick={() => navigate('/hotels')}
              id="nav-city-all"
            >
              All Cities
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
