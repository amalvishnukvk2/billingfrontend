import { useState, useEffect, useRef } from 'react';
import { Save, Plus, Key, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI, userAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import useAuthStore from '../store/authStore';
import { getLogoUrl } from '../utils/config';
import useSettingsStore from '../store/settingsStore';

const TABS = ['Shop', 'Invoice', 'Users'];

export const Settings = () => {
  const { user: currentUser } = useAuthStore();
  const { refetchSettings } = useSettingsStore();
  const [tab, setTab] = useState('Shop');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = useRef(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'cashier', phone: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [pwModal, setPwModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    settingsAPI.get().then((r) => { setSettings(r.data.data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (tab === 'Users') {
      setUsersLoading(true);
      userAPI.getAll().then((r) => { setUsers(r.data.data); setUsersLoading(false); });
    }
  }, [tab]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(settings).forEach(([k, v]) => {
        if (k === '_id' || k === '__v' || k === 'createdAt' || k === 'updatedAt') return;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          Object.entries(v).forEach(([sk, sv]) => fd.append(`${k}[${sk}]`, sv || ''));
        } else if (v !== undefined && v !== null) {
          fd.append(k, v);
        }
      });
      if (logoFile) fd.append('logo', logoFile);
      await settingsAPI.update(fd);
      toast.success('Settings saved');
      setLogoFile(null);
      await refetchSettings();
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const setSetting = (field, value) => setSettings((s) => ({ ...s, [field]: value }));
  const setAddress = (field, value) => setSettings((s) => ({ ...s, address: { ...s.address, [field]: value } }));

  const openUserModal = (u = null) => {
    setEditUser(u);
    setUserForm(u ? { name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' } : { name: '', email: '', password: '', role: 'cashier', phone: '' });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.email) return toast.error('Name and email required');
    setSavingUser(true);
    try {
      if (editUser) {
        await userAPI.update(editUser._id, { name: userForm.name, role: userForm.role, phone: userForm.phone });
        toast.success('User updated');
      } else {
        if (!userForm.password) return toast.error('Password required for new user');
        await userAPI.create(userForm);
        toast.success('User created');
      }
      setShowUserModal(false);
      userAPI.getAll().then((r) => setUsers(r.data.data));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingUser(false); }
  };

  const handleDeactivateUser = async (u) => {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    try {
      await userAPI.delete(u._id);
      toast.success('User deactivated');
      setUsers((prev) => prev.map((user) => user._id === u._id ? { ...user, isActive: false } : user));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    try {
      await userAPI.changePassword(pwModal._id, { newPassword });
      toast.success('Password changed');
      setPwModal(null);
      setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        {tab !== 'Users' && (
          <button onClick={handleSaveSettings} className="btn-primary" disabled={saving}>
            {saving && <LoadingSpinner size="sm" />} <Save className="h-4 w-4" /> Save Changes
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Shop' && settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Shop Information</h3>

            {/* Logo Upload */}
            <div>
              <label className="label">Shop Logo</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                  {(logoPreview || settings.logo) ? (
                    <img
                      src={logoPreview || getLogoUrl(settings.logo)}
                      alt="logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 text-center px-2">No logo</span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="btn-outline text-sm"
                  >
                    <Upload className="h-4 w-4" /> Upload Logo
                  </button>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
              </div>
            </div>

            <div><label className="label">Shop Name</label><input value={settings.shopName || ''} onChange={(e) => setSetting('shopName', e.target.value)} className="input" /></div>
            <div><label className="label">Phone</label><input value={settings.phone || ''} onChange={(e) => setSetting('phone', e.target.value)} className="input" /></div>
            <div><label className="label">Email</label><input type="email" value={settings.email || ''} onChange={(e) => setSetting('email', e.target.value)} className="input" /></div>
            <div><label className="label">GST Number</label><input value={settings.gstNumber || ''} onChange={(e) => setSetting('gstNumber', e.target.value)} className="input" /></div>
            <div><label className="label">Street</label><input value={settings.address?.street || ''} onChange={(e) => setAddress('street', e.target.value)} className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">City</label><input value={settings.address?.city || ''} onChange={(e) => setAddress('city', e.target.value)} className="input" /></div>
              <div><label className="label">State</label><input value={settings.address?.state || ''} onChange={(e) => setAddress('state', e.target.value)} className="input" /></div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Receipt Settings</h3>
            <div><label className="label">Receipt Header</label><input value={settings.receiptHeader || ''} onChange={(e) => setSetting('receiptHeader', e.target.value)} className="input" /></div>
            <div><label className="label">Receipt Footer</label><input value={settings.receiptFooter || ''} onChange={(e) => setSetting('receiptFooter', e.target.value)} className="input" /></div>
            <div><label className="label">Default Tax Rate (%)</label><input type="number" value={settings.defaultTaxRate || 18} onChange={(e) => setSetting('defaultTaxRate', e.target.value)} className="input" /></div>
            <div><label className="label">Low Stock Threshold</label><input type="number" value={settings.lowStockThreshold || 5} onChange={(e) => setSetting('lowStockThreshold', e.target.value)} className="input" /></div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="enableTax" checked={settings.enableTax} onChange={(e) => setSetting('enableTax', e.target.checked)} className="h-4 w-4 text-teal-600" />
              <label htmlFor="enableTax" className="text-sm text-gray-700">Enable Tax</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="allowNeg" checked={settings.allowNegativeStock} onChange={(e) => setSetting('allowNegativeStock', e.target.checked)} className="h-4 w-4 text-teal-600" />
              <label htmlFor="allowNeg" className="text-sm text-gray-700">Allow Negative Stock</label>
            </div>
          </div>
        </div>
      )}

      {tab === 'Invoice' && settings && (
        <div className="card p-5 max-w-xl space-y-4">
          <h3 className="font-semibold text-gray-800">Invoice Configuration</h3>
          <div><label className="label">Invoice Prefix</label><input value={settings.invoicePrefix || 'INV'} onChange={(e) => setSetting('invoicePrefix', e.target.value)} className="input" /></div>
          <div><label className="label">Purchase Order Prefix</label><input value={settings.purchasePrefix || 'PO'} onChange={(e) => setSetting('purchasePrefix', e.target.value)} className="input" /></div>
          <div><label className="label">Return Prefix</label><input value={settings.returnPrefix || 'RET'} onChange={(e) => setSetting('returnPrefix', e.target.value)} className="input" /></div>
          <div><label className="label">Currency Symbol</label><input value={settings.currency || '₹'} onChange={(e) => setSetting('currency', e.target.value)} className="input w-24" /></div>
          <div><label className="label">Terms and Conditions</label><textarea value={settings.termsAndConditions || ''} onChange={(e) => setSetting('termsAndConditions', e.target.value)} className="input resize-none" rows={4} /></div>
        </div>
      )}

      {tab === 'Users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openUserModal()} className="btn-primary"><Plus className="h-4 w-4" /> Add User</button>
          </div>
          <div className="card overflow-hidden">
            {usersLoading ? <div className="py-10"><LoadingSpinner size="lg" /></div> : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Status</th><th className="th">Last Login</th><th className="th">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u._id} className="table-row-hover">
                      <td className="td font-medium">{u.name}</td>
                      <td className="td text-gray-500">{u.email}</td>
                      <td className="td capitalize"><span className={`badge-${u.role === 'admin' ? 'purple' : u.role === 'manager' ? 'blue' : 'green'}`}>{u.role}</span></td>
                      <td className="td"><span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="td text-xs text-gray-400">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                      <td className="td">
                        <div className="flex gap-1.5">
                          <button onClick={() => openUserModal(u)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Save className="h-4 w-4" /></button>
                          <button onClick={() => setPwModal(u)} className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600"><Key className="h-4 w-4" /></button>
                          {u._id !== currentUser?._id && u.isActive && (
                            <button onClick={() => handleDeactivateUser(u)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* User Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editUser ? 'Edit User' : 'Add User'} size="sm"
        footer={<>
          <button onClick={() => setShowUserModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSaveUser} className="btn-primary" disabled={savingUser}>{savingUser && <LoadingSpinner size="sm" />} Save</button>
        </>}
      >
        <div className="space-y-3">
          <div><label className="label">Full Name *</label><input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="input" /></div>
          {!editUser && <div><label className="label">Email *</label><input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="input" /></div>}
          {!editUser && <div><label className="label">Password *</label><input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="input" /></div>}
          <div><label className="label">Role</label><select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="input"><option value="cashier">Cashier</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
          <div><label className="label">Phone</label><input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="input" /></div>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal isOpen={!!pwModal} onClose={() => setPwModal(null)} title={`Change Password — ${pwModal?.name}`} size="sm"
        footer={<>
          <button onClick={() => setPwModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleChangePassword} className="btn-primary">Change Password</button>
        </>}
      >
        <div><label className="label">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="Min 6 characters" /></div>
      </Modal>
    </div>
  );
};

export default Settings;
