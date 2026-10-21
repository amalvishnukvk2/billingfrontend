import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoryAPI } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryAPI.getAll();
      setCategories(res.data.data);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openModal = (cat = null) => {
    setEditCat(cat);
    setForm({ name: cat?.name || '', description: cat?.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Category name is required');
    setSaving(true);
    try {
      if (editCat) {
        await categoryAPI.update(editCat._id, form);
        toast.success('Category updated');
      } else {
        await categoryAPI.create(form);
        toast.success('Category created');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save category'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await categoryAPI.delete(deleteTarget._id);
      toast.success('Category deleted');
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <button onClick={() => openModal()} className="btn-primary"><Plus className="h-4 w-4" /> Add Category</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="py-20"><LoadingSpinner size="lg" /></div> : categories.length === 0 ? <EmptyState title="No categories yet" /> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Category Name</th>
                <th className="th">Description</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat._id} className="table-row-hover">
                  <td className="td font-medium">{cat.name}</td>
                  <td className="td text-gray-500">{cat.description || '-'}</td>
                  <td className="td"><span className={cat.isActive ? 'badge-green' : 'badge-gray'}>{cat.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="td">
                    <div className="flex gap-2">
                      <button onClick={() => openModal(cat)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(cat)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editCat ? 'Edit Category' : 'Add Category'}
        size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving && <LoadingSpinner size="sm" />} Save
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. Fishing Rods" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input resize-none" rows={3} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Products in this category must be reassigned first.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default Categories;
