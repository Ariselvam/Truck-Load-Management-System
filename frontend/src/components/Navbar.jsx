import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🚛</span>
          <span className="brand-title">Sidu Transport </span>
        </Link>

        {isAuthenticated && (
          <nav className="navbar-nav">
            {role === 'driver' && (
              <Link to="/driver-dashboard" className="nav-link">
                Driver Portal
              </Link>
            )}
            {role === 'admin' && (
              <Link to="/admin-dashboard" className="nav-link">
                Admin Panel
              </Link>
            )}
            {(role === 'shipper' || role === 'carrier') && (
              <Link to="/user-dashboard" className="nav-link">
                {role === 'shipper' ? 'Shipper Portal' : 'Carrier Portal'}
              </Link>
            )}

            <div className="user-profile-badge">
              <span className="user-name">{user?.username}</span>
              <span className={`role-tag role-${role}`}>{role?.toUpperCase()}</span>
            </div>

            <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
              Logout 🚪
            </button>
          </nav>
        )}

        {!isAuthenticated && (
          <div className="navbar-auth-links">
            <Link to="/login" className="btn btn-outline-primary">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
