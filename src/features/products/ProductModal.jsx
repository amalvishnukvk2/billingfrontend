import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { productAPI } from '../../services/api';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useState } from 'react';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().min(2, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  purchasePrice: z.coerce.number().min(0, 'Required'),
  sellingPrice: z.coerce.number().min(0, 'Required'),
  stock: z.coerce.number().min(0).optional(),
  minStockLevel: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
});

export const ProductModal = ({ product, categories, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const isEdit = !!product;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', sku: '', category: '', purchasePrice: 0, sellingPrice: 0,
      stock: 0, minStockLevel: 5, taxRate: 18, brand: '', barcode: '',
      description: '', unit: 'pcs',
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category?._id || product.category || '',
        purchasePrice: product.purchasePrice || 0,
        sellingPrice: product.sellingPrice || 0,
        stock: product.stock || 0,
        minStockLevel: product.minStockLevel || 5,
        taxRate: product.taxRate || 18,
        brand: product.brand || '',
        barcode: product.barcode || '',
        description: product.description || '',
        unit: product.unit || 'pcs',
      });
    }
  }, [product, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '') formData.append(key, value);
      });

      if (isEdit) {
        await productAPI.update(product._id, formData);
        toast.success('Product updated');
      } else {
        await productAPI.create(formData);
        toast.success('Product created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit Product' : 'Add New Product'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button form="product-form" type="submit" className="btn-primary" disabled={loading}>
            {loading && <LoadingSpinner size="sm" />} {isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Product Name *</label>
            <input {...register('name')} className={`input ${errors.name ? 'border-red-500' : ''}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">SKU *</label>
            <input {...register('sku')} className={`input uppercase ${errors.sku ? 'border-red-500' : ''}`} placeholder="e.g. SHIM-001" />
            {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>}
          </div>

          <div>
            <label className="label">Barcode</label>
            <input {...register('barcode')} className="input" placeholder="Optional" />
          </div>

          <div>
            <label className="label">Category *</label>
            <select {...register('category')} className={`input ${errors.category ? 'border-red-500' : ''}`}>
              <option value="">Select category</option>
              {categories.filter((c) => !c.parent).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="label">Brand</label>
            <input {...register('brand')} className="input" placeholder="e.g. Shimano" />
          </div>

          <div>
            <label className="label">Purchase Price (₹) *</label>
            <input {...register('purchasePrice')} type="number" step="0.01" className={`input ${errors.purchasePrice ? 'border-red-500' : ''}`} />
            {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">{errors.purchasePrice.message}</p>}
          </div>

          <div>
            <label className="label">Selling Price (₹) *</label>
            <input {...register('sellingPrice')} type="number" step="0.01" className={`input ${errors.sellingPrice ? 'border-red-500' : ''}`} />
            {errors.sellingPrice && <p className="text-xs text-red-500 mt-1">{errors.sellingPrice.message}</p>}
          </div>

          <div>
            <label className="label">Tax Rate (%)</label>
            <input {...register('taxRate')} type="number" step="0.5" className="input" />
          </div>

          <div>
            <label className="label">Unit</label>
            <select {...register('unit')} className="input">
              <option value="pcs">Pieces</option>
              <option value="pack">Pack</option>
              <option value="spool">Spool</option>
              <option value="set">Set</option>
              <option value="kg">Kilogram</option>
              <option value="m">Meter</option>
            </select>
          </div>

          {!isEdit && (
            <div>
              <label className="label">Opening Stock</label>
              <input {...register('stock')} type="number" className="input" />
            </div>
          )}

          <div>
            <label className="label">Min Stock Level</label>
            <input {...register('minStockLevel')} type="number" className="input" />
          </div>

          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea {...register('description')} rows={3} className="input resize-none" placeholder="Product description..." />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ProductModal;
