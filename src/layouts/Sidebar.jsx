import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Receipt,
  Users, BarChart2, Settings, X, Fish,
  ChevronDown, ChevronRight, Tag,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import { getLogoUrl } from '../utils/config';

const navItems = [
  {
    path: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['admin', 'manager', 'cashier'],
  },

  /* ── BILLING ── */
  {
    label: 'Billing',
    icon: Tag,
    roles: ['admin', 'manager', 'cashier'],
    children: [
      { path: '/billing', label: '🛒 Point of Sale', roles: ['admin', 'manager', 'cashier'] },
      { path: '/sales', label: '🧾 Sales History', roles: ['admin', 'manager', 'cashier'] },
      { path: '/returns', label: '↩ Returns', roles: ['admin', 'manager'] },
    ],
  },

  /* ── INVENTORY ── */
  {
    label: 'Inventory',
    icon: Package,
    roles: ['admin', 'manager', 'cashier'],
    children: [
      { path: '/products', label: 'Products', roles: ['admin', 'manager', 'cashier'] },
      { path: '/inventory', label: 'Stock Management', roles: ['admin', 'manager'] },
      { path: '/categories', label: 'Categories', roles: ['admin', 'manager'] },
    ],
  },

  /* ── CUSTOMERS ── */
  { path: '/customers', icon: Users, label: 'Customers', roles: ['admin', 'manager', 'cashier'] },

  /* ── FINANCE ── */
  { path: '/reports', icon: BarChart2, label: 'Reports', roles: ['admin', 'manager'] },

  /* ── ADMIN ── */
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
];

const NavItem = ({ item, collapsed }) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [open, setOpen] = useState(
    () => item.children?.some((c) => location.pathname === c.path) ?? false
  );

  if (!item.roles?.includes(user?.role)) return null;

  if (item.children) {
    const visibleChildren = item.children.filter((c) => c.roles?.includes(user?.role));
    if (!visibleChildren.length) return null;
    const groupActive = visibleChildren.some((c) => location.pathname === c.path);

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            groupActive
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {open
                ? <ChevronDown className="h-4 w-4 opacity-60" />
                : <ChevronRight className="h-4 w-4 opacity-60" />}
            </>
          )}
        </button>

        {open && !collapsed && (
          <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l border-white/10 pl-3">
            {visibleChildren.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-teal-600/30 text-teal-300 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-teal-600 text-white shadow-sm'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`
      }
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
};

export const Sidebar = ({ collapsed, onClose, isMobile }) => {
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    if (!settings) fetchSettings();
  }, []);

  const shopName = settings?.shopName || 'Management System';
  const logoUrl  = getLogoUrl(settings?.logo);
  return (
    <aside
      className={`flex flex-col bg-navy-900 h-full ${
        collapsed && !isMobile ? 'w-16' : 'w-64'
      } transition-all duration-200`}
    >
      {/* Logo — from backend settings */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="h-9 w-9 rounded-xl overflow-hidden bg-teal-600 flex items-center justify-center shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={shopName} className="h-full w-full object-contain" />
          ) : (
            <Fish className="h-5 w-5 text-white" />
          )}
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex-1 overflow-hidden">
            <p className="text-white font-bold text-sm truncate">{shopName}</p>
            <p className="text-gray-500 text-xs">Management System</p>
          </div>
        )}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>




      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.path || item.label}
            item={item}
            collapsed={collapsed && !isMobile}
          />
        ))}
      </nav>

      {/* Footer */}
      {(!collapsed || isMobile) && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-gray-600">{shopName}</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
