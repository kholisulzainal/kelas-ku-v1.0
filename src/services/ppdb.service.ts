import { getSupabaseClient, syncRowToSupabase, deleteRowFromSupabase } from './supabase';

export interface PpdbPendaftar {
  id: string;
  namaLengkap: string;
  nisn?: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string;
  namaAyah?: string;
  namaIbu?: string;
  noTeleponOrtu: string;
  alamat: string;
  statusPendaftaran: 'Draft' | 'Daftar' | 'Diterima' | 'Ditolak';
  dokumenUrl?: string;
  fotoUrl?: string;
  created_at?: string;
}

export const ppdbService = {
  async getAll(): Promise<PpdbPendaftar[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('ppdb').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return data.map(p => ({
            id: p.id,
            namaLengkap: p.nama_lengkap || p.nama_siswa || '',
            nisn: p.nisn || '',
            jenisKelamin: p.jenis_kelamin || 'L',
            tempatLahir: p.tempat_lahir || '',
            tanggalLahir: p.tanggal_lahir || '',
            namaAyah: p.nama_ayah || '',
            namaIbu: p.nama_ibu || '',
            noTeleponOrtu: p.no_telepon_ortu || p.no_telepon || '',
            alamat: p.alamat || '',
            statusPendaftaran: p.status_pendaftaran || 'Daftar',
            dokumenUrl: p.dokumen_url || '',
            fotoUrl: p.foto_url || ''
          }));
        }
      } catch (err) {
        console.warn('[PPDB Service] Error fetching PPDB applicants:', err);
      }
    }
    const raw = localStorage.getItem('ppdb_applicants');
    return raw ? JSON.parse(raw) : [];
  },

  async upsert(pendaftar: PpdbPendaftar): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem('ppdb_applicants');
    const list: PpdbPendaftar[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(p => p.id === pendaftar.id);
    if (idx > -1) list[idx] = pendaftar;
    else list.push(pendaftar);
    localStorage.setItem('ppdb_applicants', JSON.stringify(list));

    const res = await syncRowToSupabase('ppdb', pendaftar, true);
    return { success: res.success, error: res.error };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem('ppdb_applicants');
    const list: PpdbPendaftar[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(p => p.id !== id);
    localStorage.setItem('ppdb_applicants', JSON.stringify(filtered));

    const res = await deleteRowFromSupabase('ppdb', id);
    return { success: res.success, error: res.error };
  }
};
