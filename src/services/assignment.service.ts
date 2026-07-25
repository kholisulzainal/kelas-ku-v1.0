import { db } from './db';
import { getSupabaseClient, syncRowToSupabase, deleteRowFromSupabase } from './supabase';
import { DaftarTugas, TugasSiswa, StudentAssignment, AssignmentStatus } from '../types';

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
            status: ts.status as AssignmentStatus || (ts.status_pengerjaan ? 'SELESAI' : 'BELUM_DIKERJAKAN'),
            startedAt: ts.started_at || null,
            submittedAt: ts.submitted_at || null,
            tanggalDikerjakan: ts.tanggal_dikerjakan || '',
            nilai: ts.nilai ?? undefined,
            score: ts.score ?? ts.nilai ?? null,
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

  async getStudentAssignmentStatus(assignmentId: string, studentId: string): Promise<{
    status: AssignmentStatus;
    score?: number | null;
    startedAt?: string | null;
    submittedAt?: string | null;
    submission?: TugasSiswa;
  }> {
    const client = getSupabaseClient();
    
    // 1. Check Supabase table `student_assignments` first if client connected
    if (client) {
      try {
        const { data, error } = await client
          .from('student_assignments')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId)
          .maybeSingle();

        if (!error && data) {
          return {
            status: (data.status as AssignmentStatus) || 'BELUM_DIKERJAKAN',
            score: data.score != null ? Number(data.score) : null,
            startedAt: data.started_at || null,
            submittedAt: data.submitted_at || null
          };
        }
      } catch (err) {
        console.warn('[Assignment Service] student_assignments fetch warning:', err);
      }
    }

    // 2. Fallback to local DB `tugas_siswa`
    const submissions = db.tugasSiswa.getAll();
    const sub = submissions.find(s => s.tugasId === assignmentId && s.siswaId === studentId);
    
    if (sub) {
      const status: AssignmentStatus = sub.status || (sub.statusPengerjaan ? 'SELESAI' : (sub.startedAt ? 'SEDANG_MENGERJAKAN' : 'BELUM_DIKERJAKAN'));
      return {
        status,
        score: sub.score ?? sub.nilai ?? null,
        startedAt: sub.startedAt || null,
        submittedAt: sub.submittedAt || null,
        submission: sub
      };
    }

    return { status: 'BELUM_DIKERJAKAN' };
  },

  async startAssignment(assignmentId: string, studentId: string): Promise<TugasSiswa> {
    const nowIso = new Date().toISOString();
    
    // 1. Prepare local submission
    const existing = db.tugasSiswa.getAll().find(s => s.tugasId === assignmentId && s.siswaId === studentId);
    const sub: TugasSiswa = {
      id: existing?.id || `ts-${assignmentId}-${studentId}`,
      tugasId: assignmentId,
      siswaId: studentId,
      statusPengerjaan: false,
      status: 'SEDANG_MENGERJAKAN',
      startedAt: existing?.startedAt || nowIso
    };

    db.tugasSiswa.upsert(sub);

    // 2. Sync to Supabase `student_assignments` & `tugas_siswa`
    const client = getSupabaseClient();
    if (client) {
      try {
        // Upsert to `student_assignments`
        await client.from('student_assignments').upsert({
          assignment_id: assignmentId,
          student_id: studentId,
          status: 'SEDANG_MENGERJAKAN',
          started_at: sub.startedAt
        }, { onConflict: 'assignment_id,student_id' });

        // Also sync to `tugas_siswa` for backward compatibility
        await syncRowToSupabase('tugas_siswa', sub, true);
      } catch (err) {
        console.warn('[Assignment Service] Error starting assignment in Supabase:', err);
      }
    }

    return sub;
  },

  async finishAssignment(assignmentId: string, studentId: string, customScore?: number, umpanBalik?: string): Promise<TugasSiswa> {
    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];
    const finalScore = customScore != null ? customScore : null;

    const existing = db.tugasSiswa.getAll().find(s => s.tugasId === assignmentId && s.siswaId === studentId);
    const sub: TugasSiswa = {
      id: existing?.id || `ts-${assignmentId}-${studentId}`,
      tugasId: assignmentId,
      siswaId: studentId,
      statusPengerjaan: true,
      status: 'SELESAI',
      startedAt: existing?.startedAt || nowIso,
      submittedAt: nowIso,
      tanggalDikerjakan: todayStr,
      nilai: finalScore ?? undefined,
      score: finalScore,
      umpanBalik: umpanBalik || (finalScore != null ? 'Tugas diselesaikan melalui Google Form.' : 'Tugas dikirim. Menunggu sinkronisasi nilai dari Webhook Google Form.')
    };

    db.tugasSiswa.upsert(sub);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('student_assignments').upsert({
          assignment_id: assignmentId,
          student_id: studentId,
          status: 'SELESAI',
          score: finalScore,
          submitted_at: nowIso
        }, { onConflict: 'assignment_id,student_id' });

        await syncRowToSupabase('tugas_siswa', sub, true);
      } catch (err) {
        console.warn('[Assignment Service] Error finishing assignment in Supabase:', err);
      }
    }

    return sub;
  },

  async upsertSubmission(sub: TugasSiswa): Promise<{ success: boolean; error?: string }> {
    db.tugasSiswa.upsert(sub);
    const res = await syncRowToSupabase('tugas_siswa', sub, true);
    return { success: res.success, error: res.error };
  }
};

