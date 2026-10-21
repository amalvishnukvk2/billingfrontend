import { create } from 'zustand';
import { settingsAPI } from '../services/api';

const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    if (get().loading) return; // prevent duplicate concurrent calls
    set({ loading: true, error: null });
    try {
      const { data } = await settingsAPI.get();
      set({ settings: data.data, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  // Force re-fetch even if already loaded (used after settings save)
  refetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await settingsAPI.get();
      set({ settings: data.data, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  updateSettings: async (formData) => {
    const { data } = await settingsAPI.update(formData);
    set({ settings: data.data });
    return data.data;
  },

  // Call on logout to clear cached settings
  clearSettings: () => set({ settings: null }),
}));

export default useSettingsStore;
