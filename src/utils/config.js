// Single source of truth for the backend base URL.
// All image/file URLs are constructed from this.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

export const getImageUrl = (path) =>
  path ? `${API_BASE_URL}/${path}` : null;

export const getProductImageUrl = (filename) =>
  filename ? `${API_BASE_URL}/uploads/products/${filename}` : null;

export const getLogoUrl = (filename) =>
  filename ? `${API_BASE_URL}/uploads/logos/${filename}` : null;
