import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.auth-dropdown')) {
        setDropdownOpen(false);
      }
      if (!event.target.closest('.mobile-menu')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <nav className={`modern-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand/logo */}
        <Link className="navbar-brand" to="/">
          <div className="brand-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="url(#gradient)"/>
              <path d="M8 12h16v2H8v-2zm0 4h16v2H8v-2zm0 4h12v2H8v-2z" fill="white"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#667eea"/>
                  <stop offset="100%" stopColor="#764ba2"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="brand-text">ResumeAI</span>
        </Link>
        
        {/* Navigation Links - Desktop */}
        <div className="navbar-links desktop-only">
          {isAuthenticated ? (
            <>
              <Link className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/">
                <span className="nav-icon">🏠</span>
                Home
              </Link>
              <Link className={`nav-link ${location.pathname === '/builder' ? 'active' : ''}`} to="/builder">
                <span className="nav-icon">📝</span>
                Resume Builder
              </Link>
              <Link className={`nav-link ${location.pathname === '/ats' ? 'active' : ''}`} to="/ats">
                <span className="nav-icon">🎯</span>
                ATS Checker
              </Link>
              <Link className={`nav-link ${location.pathname === '/my-resumes' ? 'active' : ''}`} to="/my-resumes">
                <span className="nav-icon">📋</span>
                My Resumes
              </Link>
            </>
          ) : (
            <>
              <Link className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/">
                Home
              </Link>
              <Link className={`nav-link ${location.pathname === '/features' ? 'active' : ''}`} to="/features">
                Features
              </Link>
            </>
          )}
        </div>
        
        {/* Auth buttons - Desktop */}
        <div className="navbar-auth desktop-only">
          {!isAuthenticated ? (
            <>
              <Link className="btn-signin" to="/login">
                Log In
              </Link>
              <Link className="btn-signup" to="/register">
                Get Started
              </Link>
            </>
          ) : (
            <div className="auth-dropdown">
              <button 
                className={`btn-account ${dropdownOpen ? 'active' : ''}`}
                onClick={toggleDropdown}
              >
                <div className="user-avatar">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                Account
                <svg className={`chevron ${dropdownOpen ? 'rotate' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                </svg>
              </button>
              <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                <Link className="dropdown-item" to="/profile" onClick={() => setDropdownOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                  </svg>
                  My Profile
                </Link>
                <Link className="dropdown-item" to="/my-resumes" onClick={() => setDropdownOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                  </svg>
                  My Resumes
                </Link>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout-btn" onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                    <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile menu button */}
        <button className={`mobile-menu-toggle mobile-only ${mobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          {isAuthenticated ? (
            <>
              <Link className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">🏠</span>
                Home
              </Link>
              <Link className={`mobile-nav-link ${location.pathname === '/builder' ? 'active' : ''}`} to="/builder" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">📝</span>
                Resume Builder
              </Link>
              <Link className={`mobile-nav-link ${location.pathname === '/ats' ? 'active' : ''}`} to="/ats" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">🎯</span>
                ATS Checker
              </Link>
              <Link className={`mobile-nav-link ${location.pathname === '/my-resumes' ? 'active' : ''}`} to="/my-resumes" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">📋</span>
                My Resumes
              </Link>
              <div className="mobile-divider"></div>
              <Link className="mobile-nav-link" to="/profile" onClick={() => setMobileMenuOpen(false)}>
                <span className="nav-icon">👤</span>
                My Profile
              </Link>
              <button className="mobile-nav-link logout-btn" onClick={handleLogout}>
                <span className="nav-icon">🚪</span>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/" onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              <Link className={`mobile-nav-link ${location.pathname === '/features' ? 'active' : ''}`} to="/features" onClick={() => setMobileMenuOpen(false)}>
                Features
              </Link>
              <div className="mobile-divider"></div>
              <Link className="mobile-auth-btn signin" to="/login" onClick={() => setMobileMenuOpen(false)}>
                Log In
              </Link>
              <Link className="mobile-auth-btn signup" to="/register" onClick={() => setMobileMenuOpen(false)}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;