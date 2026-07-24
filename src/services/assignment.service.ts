import { db } from './db';
import { getSupabaseClient, syncRowToSupabase, deleteRowFromSupabase } from './supabase';
import { DaftarTugas, TugasSiswa } from '../types';

export const assignmentService = {
  async getTasks(): Promise<DaftarTugas[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('daftar_tugas').select('*');
        if (!error && data) {
          const items: DaftarTugas[] = data.map(t => ({
            id: t.id,
            mapelId: t.mapel_id,
            judulTugas: t.judul_tugas,
            deskripsi: t.deskripsi || '',
            googleFormUrl: t.google_form_url || '',
            tanggalDiberikan: t.tanggal_diberikan,
            tenggatWaktu: t.tenggat_waktu || '',
            dibuatOlehId: t.dibuat_oleh_id || '',
            kelas: t.kelas || 'Kelas 4'
          }));
          db.daftarTugas.save(items);
          return items;
        }
      } catch (err) {
        console.warn('[Assignment Service] Error fetching tasks from Supabase:', err);
      }
    }
    return db.daftarTugas.getAll();
  },

  async upsertTask(task: DaftarTugas): Promise<{ success: boolean; error?: string }> {
    db.daftarTugas.upsert(task);
    const res = await syncRowToSupabase('daftar_tugas', task, true);
    return { success: res.success, error: res.error };
  },

  async deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
    db.daftarTugas.delete(id);
    const res = await deleteRowFromSupabase('daftar_tugas', id);
    return { success: res.success, error: res.error };
  },

  async getSubmissions(): Promise<TugasSiswa[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('tugas_siswa').select('*');
        if (!error && data) {
          const items: TugasSiswa[] = data.map(ts => ({
            id: ts.id,
            tugasId: ts.tugas_id,
            siswaId: ts.siswa_id,
            statusPengerjaan: Boolean(ts.status_pengerjaan),
            tanggalDikerjakan: ts.tanggal_dikerjakan || '',
            nilai: ts.nilai ?? undefined,
            umpanBalik: ts.umpan_balik || ''
          }));
          db.tugasSiswa.save(items);
          return items;
        }
      } catch (err) {
        console.warn('[Assignment Service] Error fetching submissions from Supabase:', err);
      }
    }
    return db.tugasSiswa.getAll();
  },

  async upsertSubmission(sub: TugasSiswa): Promise<{ success: boolean; error?: string }> {
    db.tugasSiswa.upsert(sub);
    const res = await syncRowToSupabase('tugas_siswa', sub, true);
    return { success: res.success, error: res.error };
  }
};
