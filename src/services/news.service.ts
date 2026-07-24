import { getSupabaseClient, syncRowToSupabase, deleteRowFromSupabase } from './supabase';

export interface NewsArticle {
  id: string;
  judul: string;
  konten: string;
  kategori: string;
  penulis: string;
  tanggal: string;
  thumbnailUrl?: string;
  published: boolean;
}

export const newsService = {
  async getAll(): Promise<NewsArticle[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('news').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return data.map(n => ({
            id: n.id,
            judul: n.judul,
            konten: n.konten,
            kategori: n.kategori || 'Pengumuman',
            penulis: n.penulis || 'Admin',
            tanggal: n.tanggal || new Date().toISOString().split('T')[0],
            thumbnailUrl: n.thumbnail_url || '',
            published: n.published !== false
          }));
        }
      } catch (err) {
        console.warn('[News Service] Error fetching news:', err);
      }
    }
    const raw = localStorage.getItem('news_articles');
    return raw ? JSON.parse(raw) : [];
  },

  async upsert(article: NewsArticle): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem('news_articles');
    const list: NewsArticle[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(n => n.id === article.id);
    if (idx > -1) list[idx] = article;
    else list.push(article);
    localStorage.setItem('news_articles', JSON.stringify(list));

    const res = await syncRowToSupabase('news', article, true);
    return { success: res.success, error: res.error };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem('news_articles');
    const list: NewsArticle[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(n => n.id !== id);
    localStorage.setItem('news_articles', JSON.stringify(filtered));

    const res = await deleteRowFromSupabase('news', id);
    return { success: res.success, error: res.error };
  }
};
