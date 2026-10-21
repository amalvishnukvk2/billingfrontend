import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';

import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import { PageLoader } from './components/LoadingSpinner';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Categories from './pages/Categories';
import Billing from './pages/Billing';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Returns from './pages/Returns';
import NotFound from './pages/NotFound';

import useAuthStore from './store/authStore';
import useSettingsStore from './store/settingsStore';

function App() {
  const { isAuthenticated, refreshUser } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // If we have a persisted session, validate it against the server
      if (isAuthenticated && localStorage.getItem('accessToken')) {
        try {
          await refreshUser();       // validates token, updates user from DB
          await fetchSettings();     // pre-load shop settings for sidebar/invoice
        } catch {
          // refreshUser handles logout internally on failure
        }
      }
      setAppReady(true);
    };
    init();
  }, []); // run once on mount

  if (!appReady) return <PageLoader />;

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            padding: '12px 16px',
          },
          success: { iconTheme: { primary: '#0d9488', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/"         element={<Dashboard />} />
          <Route path="/billing"  element={<Billing />} />
          <Route path="/sales"    element={<Sales />} />
          <Route path="/returns"  element={<ProtectedRoute roles={['admin','manager']}><Returns /></ProtectedRoute>} />
          <Route path="/products" element={<Products />} />
          <Route path="/inventory" element={<ProtectedRoute roles={['admin','manager']}><Inventory /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute roles={['admin','manager']}><Categories /></ProtectedRoute>} />
          <Route path="/customers"  element={<Customers />} />
          <Route path="/reports"    element={<ProtectedRoute roles={['admin','manager']}><Reports /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />
          <Route path="*"           element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
