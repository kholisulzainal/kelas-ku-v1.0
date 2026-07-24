import { getSupabaseClient, syncRowToSupabase, deleteRowFromSupabase } from './supabase';

export interface GalleryItem {
  id: string;
  judul: string;
  deskripsi?: string;
  imageUrl: string;
  kategori?: string;
  tanggal?: string;
}

export const galleryService = {
  async getAll(): Promise<GalleryItem[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('gallery').select('*');
        if (!error && data) {
          return data.map(g => ({
            id: g.id,
            judul: g.judul || '',
            deskripsi: g.deskripsi || '',
            imageUrl: g.image_url || g.photo_url || '',
            kategori: g.kategori || 'Kegiatan',
            tanggal: g.tanggal || new Date().toISOString().split('T')[0]
          }));
        }
      } catch (err) {
        console.warn('[Gallery Service] Error fetching gallery:', err);
      }
    }
    const raw = localStorage.getItem('gallery_items');
    return raw ? JSON.parse(raw) : [];
  },

  async upsert(item: GalleryItem): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem('gallery_items');
    const list: GalleryItem[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(g => g.id === item.id);
    if (idx > -1) list[idx] = item;
    else list.push(item);
    localStorage.setItem('gallery_items', JSON.stringify(list));

    const res = await syncRowToSupabase('gallery', item, true);
    return { success: res.success, error: res.error };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem('gallery_items');
    const list: GalleryItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(g => g.id !== id);
    localStorage.setItem('gallery_items', JSON.stringify(filtered));

    const res = await deleteRowFromSupabase('gallery', id);
    return { success: res.success, error: res.error };
  }
};
