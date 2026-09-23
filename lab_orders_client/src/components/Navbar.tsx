import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './Navbar.css';

type NavbarProps = {
  isDarkMode: boolean;
  onToggleTheme: () => void;
};

export default function Navbar({ isDarkMode, onToggleTheme }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<'orders' | 'suppliers' | 'budgets' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const token = localStorage.getItem("token") ?? false;

  // סגירת תפריט המובייל בעת ניווט לדף אחר
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [location.pathname]);

  // סגירת תפריט המובייל בלחיצה מחוץ לנאב
  useEffect(() => {
    if (!mobileOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  function toggleMenu(menu: 'orders' | 'suppliers' | 'budgets') {
    setOpenMenu((currentMenu) => currentMenu === menu ? null : menu);
  }

  function closeMenu() {
    setOpenMenu(null);
  }

  function handleDropdownClick(menu: 'orders' | 'suppliers' | 'budgets') {
    // במובייל: פתח את התת-קטגוריות בלחיצה הראשונה
    toggleMenu(menu);
  }

  const dropdownProps = (menu: 'orders' | 'suppliers' | 'budgets') => {
    // במובייל, אל תשתמש ב-mouse events, רק בקליקים
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return {};
    }
    return {
      onMouseEnter: () => setOpenMenu(menu),
      onMouseLeave: closeMenu,
    };
  };

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-brand">
        <Link to="/" className="nav-link" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Home</Link>
      </div>

      {/* כפתור המבורגר – מוצג רק במובייל */}
      <button
        type="button"
        className="hamburger-button"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span className={`hamburger-icon ${mobileOpen ? 'open' : ''}`}>
          <span /><span /><span />
        </span>
      </button>

      {/* תפריט ניווט */}
      <div className={`navbar-links ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="nav-dropdown" {...dropdownProps('orders')}>
          <button type="button" className="nav-menu-button" onClick={() => handleDropdownClick('orders')} aria-expanded={openMenu === 'orders'} aria-haspopup="menu">
            Orders <span className="nav-menu-arrow" aria-hidden="true" />
          </button>
          {openMenu === 'orders' && (
            <div className="nav-dropdown-menu" role="menu">
              <Link to="/orders" role="menuitem" onClick={closeMenu}>Order List</Link>
              <Link to="/add-order" role="menuitem" onClick={closeMenu}>Add Order</Link>
            </div>
          )}
        </div>
        <div className="nav-dropdown" {...dropdownProps('suppliers')}>
          <button type="button" className="nav-menu-button" onClick={() => handleDropdownClick('suppliers')} aria-expanded={openMenu === 'suppliers'} aria-haspopup="menu">
            Suppliers <span className="nav-menu-arrow" aria-hidden="true" />
          </button>
          {openMenu === 'suppliers' && (
            <div className="nav-dropdown-menu" role="menu">
              <Link to="/suppliers" role="menuitem" onClick={closeMenu}>Supplier List</Link>
              <Link to="/add-supplier" role="menuitem" onClick={closeMenu}>Add Supplier</Link>
            </div>
          )}
        </div>
        <div className="nav-dropdown" {...dropdownProps('budgets')}>
          <button type="button" className="nav-menu-button" onClick={() => handleDropdownClick('budgets')} aria-expanded={openMenu === 'budgets'} aria-haspopup="menu">
            Budgets <span className="nav-menu-arrow" aria-hidden="true" />
          </button>
          {openMenu === 'budgets' && (
            <div className="nav-dropdown-menu" role="menu">
              <Link to="/budgets" role="menuitem" onClick={closeMenu}>Budget List</Link>
              <Link to="/add-budget" role="menuitem" onClick={closeMenu}>Add Budget</Link>
            </div>
          )}
        </div>
        <Link to="/products" className="nav-link">Products</Link>

        <div className="navbar-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-pressed={isDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-sun">☀</span>
              <span className="theme-toggle-moon">☾</span>
              <span className="theme-toggle-thumb" />
            </span>
          </button>
          {!token && (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </>
          )}
          {token && (
            <button onClick={logout} className="logout-btn">Logout</button>
          )}
        </div>
      </div>
    </nav>
  );
}
