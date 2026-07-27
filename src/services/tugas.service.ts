import { db } from './db';
import { getSupabaseClient, syncRowToSupabase, deleteRowFromSupabase } from './supabase';
import { DaftarTugas, TugasSiswa, AssignmentStatus } from '../types';

export const tugasService = {
  async getDaftarTugas(): Promise<DaftarTugas[]> {
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
        console.warn('[Tugas Service] Error fetching tasks from Supabase:', err);
      }
    }
    return db.daftarTugas.getAll();
  },

  async getTasks(): Promise<DaftarTugas[]> {
    return this.getDaftarTugas();
  },

  async upsertDaftarTugas(task: DaftarTugas): Promise<{ success: boolean; error?: string }> {
    db.daftarTugas.upsert(task);
    const res = await syncRowToSupabase('daftar_tugas', task, true);
    return { success: res.success, error: res.error };
  },

  async upsertTask(task: DaftarTugas): Promise<{ success: boolean; error?: string }> {
    return this.upsertDaftarTugas(task);
  },

  async deleteDaftarTugas(id: string): Promise<{ success: boolean; error?: string }> {
    db.daftarTugas.delete(id);
    const res = await deleteRowFromSupabase('daftar_tugas', id);
    return { success: res.success, error: res.error };
  },

  async deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
    return this.deleteDaftarTugas(id);
  },

  async getTugasSiswa(): Promise<TugasSiswa[]> {
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
            status: (ts.status as AssignmentStatus) || (ts.status_pengerjaan ? 'SELESAI' : 'BELUM_DIKERJAKAN'),
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
        console.warn('[Tugas Service] Error fetching submissions from Supabase:', err);
      }
    }
    return db.tugasSiswa.getAll();
  },

  async getSubmissions(): Promise<TugasSiswa[]> {
    return this.getTugasSiswa();
  },

  async getStatusTugasSiswa(tugasId: string, siswaId: string): Promise<{
    status: AssignmentStatus;
    score?: number | null;
    startedAt?: string | null;
    submittedAt?: string | null;
    submission?: TugasSiswa;
  }> {
    const client = getSupabaseClient();
    
    // Find student details to get candidate IDs (id, email, emailPrefix)
    const currentSiswa = db.siswa.getAll().find(s => s.id === siswaId);
    const studentEmail = currentSiswa?.email?.trim().toLowerCase();
    const emailPrefix = studentEmail ? studentEmail.split('@')[0] : (siswaId.includes('@') ? siswaId.split('@')[0] : null);

    const targetIds = Array.from(
      new Set([siswaId, studentEmail, emailPrefix].filter(Boolean) as string[])
    );

    if (client) {
      try {
        const { data: tsData, error: tsError } = await client
          .from('tugas_siswa')
          .select('*')
          .eq('tugas_id', tugasId)
          .in('siswa_id', targetIds)
          .order('submitted_at', { ascending: false })
          .limit(1);

        if (!tsError && tsData && tsData.length > 0) {
          const tsRow = tsData[0];
          let parsedScore = tsRow.score ?? tsRow.nilai ?? null;

          if (parsedScore == null) {
            const { data: pnlData } = await client
              .from('penilaian')
              .select('*')
              .in('siswa_id', targetIds)
              .order('created_at', { ascending: false });

            if (pnlData && pnlData.length > 0) {
              const taskObj = db.daftarTugas.getAll().find(t => t.id === tugasId);
              const matchPnl = pnlData.find(p => p.id?.includes(tugasId) || p.nama_penilaian === taskObj?.judulTugas);
              if (matchPnl && matchPnl.nilai != null) {
                parsedScore = Number(matchPnl.nilai);
              }
            }
          }

          const localSub: TugasSiswa = {
            id: tsRow.id || `ts-${tugasId}-${siswaId}`,
            tugasId: tugasId,
            siswaId: siswaId,
            statusPengerjaan: Boolean(tsRow.status_pengerjaan || tsRow.status === 'SELESAI'),
            status: (tsRow.status as AssignmentStatus) || (tsRow.status_pengerjaan ? 'SELESAI' : 'BELUM_DIKERJAKAN'),
            startedAt: tsRow.started_at || null,
            submittedAt: tsRow.submitted_at || null,
            tanggalDikerjakan: tsRow.tanggal_dikerjakan || '',
            nilai: parsedScore ?? undefined,
            score: parsedScore,
            umpanBalik: tsRow.umpan_balik || ''
          };

          db.tugasSiswa.upsert(localSub);

          if (parsedScore != null) {
            const task = db.daftarTugas.getAll().find(t => t.id === tugasId);
            const student = db.siswa.getAll().find(s => s.id === siswaId);
            db.penilaian.upsert({
              id: `as-${tugasId}-${siswaId}`,
              siswaId: siswaId,
              mapelId: task?.mapelId || 'mapel-1',
              tipe: 'harian',
              namaPenilaian: task?.judulTugas || 'Kuis Google Form',
              nilai: parsedScore,
              deskripsiKompetensi: `Nilai kuis Google Form disinkronkan dari server`,
              tanggalPenilaian: tsRow.tanggal_dikerjakan || new Date().toISOString().split('T')[0],
              dinilaiOlehId: task?.dibuatOlehId || 'guru-1',
              kelas: student?.kelas || task?.kelas || 'Kelas 4-A'
            });
            window.dispatchEvent(new Event('penilaians-updated'));
            window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'penilaian' } }));
          }

          return {
            status: (tsRow.status as AssignmentStatus) || (tsRow.status_pengerjaan ? 'SELESAI' : 'BELUM_DIKERJAKAN'),
            score: parsedScore,
            startedAt: tsRow.started_at || null,
            submittedAt: tsRow.submitted_at || null,
            submission: localSub
          };
        }
      } catch (err) {
        console.warn('[Tugas Service] tugas_siswa check notice:', err);
      }
    }

    const submissions = db.tugasSiswa.getAll();
    const sub = submissions.find(s => s.tugasId === tugasId && targetIds.includes(s.siswaId));
    
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

  async getStudentAssignmentStatus(assignmentId: string, studentId: string) {
    return this.getStatusTugasSiswa(assignmentId, studentId);
  },

  async mulaiTugas(tugasId: string, siswaId: string): Promise<TugasSiswa> {
    const nowIso = new Date().toISOString();
    
    const existing = db.tugasSiswa.getAll().find(s => s.tugasId === tugasId && s.siswaId === siswaId);
    const sub: TugasSiswa = {
      id: existing?.id || `ts-${tugasId}-${siswaId}`,
      tugasId: tugasId,
      siswaId: siswaId,
      statusPengerjaan: false,
      status: 'SEDANG_MENGERJAKAN',
      startedAt: existing?.startedAt || nowIso
    };

    db.tugasSiswa.upsert(sub);
    await syncRowToSupabase('tugas_siswa', sub, true).catch(e => console.warn(e));

    return sub;
  },

  async startAssignment(assignmentId: string, studentId: string): Promise<TugasSiswa> {
    return this.mulaiTugas(assignmentId, studentId);
  },

  async selesaiTugas(tugasId: string, siswaId: string, customScore?: number, umpanBalik?: string): Promise<TugasSiswa> {
    const client = getSupabaseClient();
    const currentSiswa = db.siswa.getAll().find(s => s.id === siswaId);
    const studentEmail = currentSiswa?.email?.trim().toLowerCase();
    const studentNisn = currentSiswa?.nisn?.trim();
    const emailPrefix = studentEmail ? studentEmail.split('@')[0] : (siswaId.includes('@') ? siswaId.split('@')[0] : null);

    const targetIds = Array.from(
      new Set([siswaId, studentEmail, studentNisn, emailPrefix].filter(Boolean) as string[])
    );

    let resolvedScore: number | null = customScore != null ? customScore : null;

    // 1. If customScore was not provided, check if Supabase already received score from Apps Script
    if (resolvedScore == null && client) {
      const fetchScoreFromSupabase = async () => {
        try {
          const { data: tsData } = await client
            .from('tugas_siswa')
            .select('*')
            .eq('tugas_id', tugasId)
            .in('siswa_id', targetIds)
            .order('submitted_at', { ascending: false })
            .limit(1);

          if (tsData && tsData.length > 0) {
            const sc = tsData[0].score ?? tsData[0].nilai ?? null;
            if (sc != null) return Number(sc);
          }

          const { data: pnlData } = await client
            .from('penilaian')
            .select('*')
            .in('siswa_id', targetIds)
            .order('created_at', { ascending: false });

          if (pnlData && pnlData.length > 0) {
            const taskObj = db.daftarTugas.getAll().find(t => t.id === tugasId);
            const matchPnl = pnlData.find(p => p.id?.includes(tugasId) || p.nama_penilaian === taskObj?.judulTugas);
            if (matchPnl && matchPnl.nilai != null) {
              return Number(matchPnl.nilai);
            }
          }
        } catch (err) {
          console.warn('[Tugas Service] Check score in Supabase failed:', err);
        }
        return null;
      };

      resolvedScore = await fetchScoreFromSupabase();

      // If null, pause 600ms and retry once in case Apps Script webhook is landing right now
      if (resolvedScore == null) {
        await new Promise(resolve => setTimeout(resolve, 600));
        resolvedScore = await fetchScoreFromSupabase();
      }
    }

    // 2. Fallback check local database if still null
    if (resolvedScore == null) {
      const existingSub = db.tugasSiswa.getAll().find(s => s.tugasId === tugasId && targetIds.includes(s.siswaId));
      if (existingSub?.score != null) resolvedScore = existingSub.score;
      else if (existingSub?.nilai != null) resolvedScore = existingSub.nilai;

      if (resolvedScore == null) {
        const localPnl = db.penilaian.getAll().find(p => targetIds.includes(p.siswaId) && p.id.includes(tugasId));
        if (localPnl && localPnl.nilai != null) resolvedScore = localPnl.nilai;
      }
    }

    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = db.tugasSiswa.getAll().find(s => s.tugasId === tugasId && targetIds.includes(s.siswaId));

    const sub: TugasSiswa = {
      id: existing?.id || `ts-${tugasId}-${siswaId}`,
      tugasId: tugasId,
      siswaId: siswaId,
      statusPengerjaan: true,
      status: 'SELESAI',
      startedAt: existing?.startedAt || nowIso,
      submittedAt: nowIso,
      tanggalDikerjakan: todayStr,
      nilai: resolvedScore ?? undefined,
      score: resolvedScore,
      umpanBalik: umpanBalik || (resolvedScore != null ? 'Tugas diselesaikan melalui Google Form (Nilai tersinkron otomatis).' : 'Tugas dikirim. Menunggu sinkronisasi nilai dari Webhook Google Form.')
    };

    db.tugasSiswa.upsert(sub);

    if (resolvedScore != null) {
      const task = db.daftarTugas.getAll().find(t => t.id === tugasId);
      const student = db.siswa.getAll().find(s => s.id === siswaId);

      const pnlItem = {
        id: `as-${tugasId}-${siswaId}`,
        siswaId: siswaId,
        mapelId: task?.mapelId || 'mapel-1',
        tipe: 'harian' as const,
        namaPenilaian: task?.judulTugas || 'Tugas Google Form',
        nilai: resolvedScore,
        deskripsiKompetensi: `Nilai dari pengerjaan tugas ${task?.judulTugas || ''}`,
        tanggalPenilaian: todayStr,
        dinilaiOlehId: task?.dibuatOlehId || 'guru-1',
        kelas: student?.kelas || task?.kelas || 'Kelas 4-A'
      };

      db.penilaian.upsert(pnlItem);
      syncRowToSupabase('penilaian', pnlItem, true).catch(err => console.warn(err));
      window.dispatchEvent(new Event('penilaians-updated'));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'penilaian' } }));
    }

    await syncRowToSupabase('tugas_siswa', sub, true).catch(err => console.warn(err));

    return sub;
  },

  async finishAssignment(assignmentId: string, studentId: string, customScore?: number, umpanBalik?: string): Promise<TugasSiswa> {
    return this.selesaiTugas(assignmentId, studentId, customScore, umpanBalik);
  },

  async upsertTugasSiswa(sub: TugasSiswa): Promise<{ success: boolean; error?: string }> {
    db.tugasSiswa.upsert(sub);

    const scoreVal = sub.score ?? sub.nilai;
    if (scoreVal != null) {
      const task = db.daftarTugas.getAll().find(t => t.id === sub.tugasId);
      const student = db.siswa.getAll().find(s => s.id === sub.siswaId);
      const pnlItem = {
        id: `as-${sub.tugasId}-${sub.siswaId}`,
        siswaId: sub.siswaId,
        mapelId: task?.mapelId || 'mapel-1',
        tipe: 'harian' as const,
        namaPenilaian: task?.judulTugas || 'Tugas Google Form',
        nilai: scoreVal,
        deskripsiKompetensi: `Nilai dari pengerjaan tugas ${task?.judulTugas || ''}`,
        tanggalPenilaian: sub.tanggalDikerjakan || new Date().toISOString().split('T')[0],
        dinilaiOlehId: task?.dibuatOlehId || 'guru-1',
        kelas: student?.kelas || task?.kelas || 'Kelas 4-A'
      };
      db.penilaian.upsert(pnlItem);
      syncRowToSupabase('penilaian', pnlItem, true).catch(err => console.warn(err));
      window.dispatchEvent(new Event('penilaians-updated'));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'penilaian' } }));
    }

    const res = await syncRowToSupabase('tugas_siswa', sub, true);
    return { success: res.success, error: res.error };
  },

  async upsertSubmission(sub: TugasSiswa) {
    return this.upsertTugasSiswa(sub);
  }
};
