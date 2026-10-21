import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
  '/':          'Dashboard',
  '/billing':   'Point of Sale',
  '/sales':     'Sales History',
  '/returns':   'Returns & Refunds',
  '/products':  'Products',
  '/inventory': 'Stock Management',
  '/categories':'Categories',
  '/customers': 'Customers',
  '/reports':   'Reports & Analytics',
  '/settings':  'Settings',
};

// Pages that need full-height, no-padding layout (POS screen)
const FULL_HEIGHT_PAGES = ['/billing'];

export const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false);
  const location = useLocation();

  const title      = pageTitles[location.pathname] || 'Management';
  const isFullPage = FULL_HEIGHT_PAGES.includes(location.pathname);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex shrink-0 transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 z-50">
            <Sidebar isMobile onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          onMenuToggle={() => {
            if (window.innerWidth >= 1024) setSidebarCollapsed((c) => !c);
            else setMobileMenuOpen((o) => !o);
          }}
        />

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {isFullPage ? (
            // Full-height pages (POS) get no padding — they manage their own layout
            <Outlet />
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="p-4 md:p-6 min-h-full">
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
