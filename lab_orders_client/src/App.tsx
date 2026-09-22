import OrderForm from './components/OrderForm';
import Orders from './components/Orders';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Register from './components/register';
import Login from './components/Login';
import SupplierForm from './components/SupplierForm';
import Suppliers from './components/Suppliers';
import Products from './components/Products';
import Budgets from './components/Budget';
import BudgetForm from './components/BudgetForm';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './App.css'
import HomePage from './components/HomePage';
import AskDocuments from './components/AskDocuments'

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [isDarkMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      return;
    }

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    };

    try {
      const payload = token.split('.')[1];
      const base64Payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = JSON.parse(atob(base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')));
      const expiresAt = decodedPayload.exp * 1000;
      const remainingTime = expiresAt - Date.now();

      if (!Number.isFinite(expiresAt) || remainingTime <= 0) {
        logout();
        return;
      }

      const timeoutId = window.setTimeout(logout, remainingTime);
      return () => window.clearTimeout(timeoutId);
    } catch {
      logout();
    }
  }, [location.pathname, navigate]);

  return (
    <>
      <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((currentMode) => !currentMode)} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/add-order" element={<OrderForm />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/add-supplier" element={<SupplierForm />} />
        <Route path="/products" element={<Products />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/add-budget" element={<BudgetForm />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Routes>
      <AskDocuments />
    </>
  )
}

export default App
