import { Menu, ChevronDown, LogOut, Settings, AlignLeft } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import LowStockAlert from '../components/LowStockAlert';

export const Header = ({ onMenuToggle, title }) => {
  const { user, logout } = useAuthStore();
  const { clearSettings } = useSettingsStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    clearSettings(); // clear cached shop settings
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const roleColors = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', cashier: 'bg-green-100 text-green-700' };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-30">
      <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden">
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
      <button onClick={onMenuToggle} className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <AlignLeft className="h-5 w-5 text-gray-600" />
      </button>

      <h1 className="font-semibold text-gray-800 text-base flex-1 truncate">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Live low-stock notifications */}
        <LowStockAlert />

        {/* User menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-teal-700 text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-tight">{user?.name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColors[user?.role]}`}>{user?.role}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="py-1">
                <button onClick={() => { navigate('/settings'); setDropdownOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
