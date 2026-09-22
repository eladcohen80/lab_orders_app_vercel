import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './Navbar.css';

type NavbarProps = {
  isDarkMode: boolean;
  onToggleTheme: () => void;
};

export default function Navbar({ isDarkMode, onToggleTheme }: NavbarProps) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<'orders' | 'suppliers' | 'budgets' | null>(null);

  const token = localStorage.getItem("token") ?? false;

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

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="nav-link" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Home</Link>
      </div>
      <div className="navbar-links">
        <div className="nav-dropdown" onMouseEnter={() => setOpenMenu('orders')} onMouseLeave={closeMenu}>
          <button type="button" className="nav-menu-button" onClick={() => toggleMenu('orders')} aria-expanded={openMenu === 'orders'} aria-haspopup="menu">
            Orders <span className="nav-menu-arrow" aria-hidden="true" />
          </button>
          {openMenu === 'orders' && (
            <div className="nav-dropdown-menu" role="menu">
              <Link to="/orders" role="menuitem" onClick={closeMenu}>Order List</Link>
              <Link to="/add-order" role="menuitem" onClick={closeMenu}>Add Order</Link>
            </div>
          )}
        </div>
        <div className="nav-dropdown" onMouseEnter={() => setOpenMenu('suppliers')} onMouseLeave={closeMenu}>
          <button type="button" className="nav-menu-button" onClick={() => toggleMenu('suppliers')} aria-expanded={openMenu === 'suppliers'} aria-haspopup="menu">
            Suppliers <span className="nav-menu-arrow" aria-hidden="true" />
          </button>
          {openMenu === 'suppliers' && (
            <div className="nav-dropdown-menu" role="menu">
              <Link to="/suppliers" role="menuitem" onClick={closeMenu}>Supplier List</Link>
              <Link to="/add-supplier" role="menuitem" onClick={closeMenu}>Add Supplier</Link>
            </div>
          )}
        </div>
        <div className="nav-dropdown" onMouseEnter={() => setOpenMenu('budgets')} onMouseLeave={closeMenu}>
          <button type="button" className="nav-menu-button" onClick={() => toggleMenu('budgets')} aria-expanded={openMenu === 'budgets'} aria-haspopup="menu">
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
    </nav>
  );
}

            