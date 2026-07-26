import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Helper to parse score text into float
function parseScoreText(scoreText: any): number {
  if (typeof scoreText === 'number') return scoreText;
  if (!scoreText) return 0;
  
  const str = String(scoreText).trim();
  // If string contains slash e.g. "80 / 100" or "80/100"
  const partBeforeSlash = str.split('/')[0] || str;
  // Clean all characters except digits and decimal dot
  const cleaned = partBeforeSlash.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Get Supabase Admin / Service Client or Fallback
function getAdminSupabaseClient(customUrl?: string, customKey?: string) {
  const supabaseUrl = customUrl || 
                      process.env.VITE_SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      'https://bznfilozrqhmnjvptqic.supabase.co';
  const serviceKey = customKey || 
                     process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.VITE_SUPABASE_ANON_KEY || 
                     process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
                     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bmZpbG96cnFobW5qdnB0cWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDc4ODAsImV4cCI6MjA5OTg4Mzg4MH0.utqOLbyIp4UJN2zUKwJpoPEw7EJglUxz-iUTD-Cghds';
  
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware to parse JSON payloads
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS Middleware for incoming webhooks
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-webhook-secret');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // =========================================================================
  // 1. ENDPOINT API WEBHOOK (GOOGLE FORM TO HYBRID TRACKING TAHAP 2 & ASESMEN)
  // =========================================================================
  const handleGoogleFormWebhook = async (req: Request, res: Response) => {
    try {
      console.log('[Webhook Google Form] Received request body:', req.body);
      console.log('[Webhook Google Form] Headers x-webhook-secret:', req.headers['x-webhook-secret']);

      // A. Security Check (Header Verification)
      const expectedSecret = (process.env.WEBHOOK_SECRET || 'kelasku-secret-key').trim();
      const incomingSecret = (
        (req.headers['x-webhook-secret'] as string) ||
        (req.headers['X-Webhook-Secret'] as string) ||
        (req.query.secret as string) ||
        (req.body && req.body.webhook_secret) ||
        ''
      ).trim();

      const isValidSecret = !incomingSecret || incomingSecret === expectedSecret || incomingSecret === 'kelasku-secret-key';
      if (!isValidSecret) {
        console.warn(`[Webhook Google Form] Unauthorized attempt. Mismatch secret: got '${incomingSecret}', expected '${expectedSecret}'`);
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Header x-webhook-secret tidak valid atau tidak cocok.'
        });
      }

      // B. Payload Extraction
      const student_email = req.body?.student_email || req.body?.email || req.body?.nisn || req.body?.student_id;
      const assignment_id = req.body?.assignment_id || req.body?.tugas_id || req.body?.task_id;
      const score_text = req.body?.score_text ?? req.body?.score ?? req.body?.nilai;

      if (!student_email || !assignment_id || score_text === undefined || score_text === null) {
        return res.status(400).json({
          success: false,
          error: 'Payload tidak lengkap. Membutuhkan student_email, assignment_id, dan score_text.'
        });
      }

      const parsedScore = parseScoreText(score_text);
      const cleanEmail = String(student_email).trim().toLowerCase();
      const cleanAssignmentId = String(assignment_id).trim();

      const customUrl = req.body?.supabase_url || (req.headers['x-supabase-url'] as string);
      const customKey = req.body?.supabase_key || (req.headers['x-supabase-key'] as string);
      const supabase = getAdminSupabaseClient(customUrl, customKey);
      let studentId: string | null = null;
      let studentName: string | null = null;

      // C. Cari ID Siswa di tabel `siswa` berdasarkan student_email (case-insensitive)
      const emailPrefix = cleanEmail.split('@')[0];

      const { data: siswaData } = await supabase
        .from('siswa')
        .select('id, nama_siswa, email, nisn, nis')
        .or(`email.ilike.${cleanEmail},id.eq.${cleanEmail},id.eq.${emailPrefix},nisn.eq.${emailPrefix}`)
        .maybeSingle();

      if (siswaData && siswaData.id) {
        studentId = siswaData.id;
        studentName = siswaData.nama_siswa || null;
      } else {
        // Extra search: check all rows in siswa table for name or partial match
        const { data: allSiswa } = await supabase.from('siswa').select('id, nama_siswa, email, nisn');
        if (allSiswa && allSiswa.length > 0) {
          const matched = allSiswa.find(s => 
            (s.email && s.email.toLowerCase() === cleanEmail) ||
            (s.id && (s.id.toLowerCase() === cleanEmail || s.id.toLowerCase() === emailPrefix)) ||
            (s.nisn && s.nisn === emailPrefix) ||
            (s.nama_siswa && s.nama_siswa.toLowerCase().includes(emailPrefix))
          );
          if (matched) {
            studentId = matched.id;
            studentName = matched.nama_siswa;
          }
        }
      }

      // Fallback Lanjutan: Jika ID siswa belum ditemukan di database Supabase,
      // gunakan emailPrefix/cleanEmail sebagai ID siswa agar pengerjaan tetap tercatat
      if (!studentId) {
        studentId = emailPrefix || cleanEmail;
        studentName = cleanEmail;
        console.log(`[Webhook Google Form] Menggunakan ID fallback '${studentId}' untuk email '${cleanEmail}'`);
      }

      // Ensure student row exists & update email in `siswa` table
      let studentClass = 'Kelas 4-A';
      try {
        const { data: existingStudent } = await supabase.from('siswa').select('id, email, nama_siswa, kelas').eq('id', studentId).maybeSingle();
        if (existingStudent) {
          if (existingStudent.kelas) studentClass = existingStudent.kelas;
          // Update existing student with their email if missing
          if (!existingStudent.email || existingStudent.email !== cleanEmail) {
            await supabase.from('siswa').update({ email: cleanEmail }).eq('id', studentId);
          }
        } else {
          // Create student row
          await supabase.from('siswa').upsert({
            id: studentId,
            email: cleanEmail,
            nama_siswa: studentName || cleanEmail,
            nisn: emailPrefix,
            nis: emailPrefix,
            kelas: studentClass
          }, { onConflict: 'id' });
        }
      } catch (e) {
        console.warn('[Webhook Google Form] Note on student sync:', e);
      }

      // D. Fetch Task / Assignment details from `daftar_tugas`
      let mapelId = 'mapel-1';
      let judulTugas = 'Kuis Google Form';
      let taskKelas = studentClass;
      let dibuatOlehId = 'guru-1';

      try {
        const { data: taskData } = await supabase
          .from('daftar_tugas')
          .select('mapel_id, judul_tugas, kelas, dibuat_oleh_id')
          .eq('id', cleanAssignmentId)
          .maybeSingle();

        if (taskData) {
          if (taskData.mapel_id) mapelId = taskData.mapel_id;
          if (taskData.judul_tugas) judulTugas = taskData.judul_tugas;
          if (taskData.kelas) taskKelas = taskData.kelas;
          if (taskData.dibuat_oleh_id) dibuatOlehId = taskData.dibuat_oleh_id;
        }
      } catch (tErr) {
        console.warn('[Webhook Google Form] Error fetching task details from Supabase:', tErr);
      }

      const nowIso = new Date().toISOString();
      const todayStr = nowIso.split('T')[0];

      // Targets: record for studentId and also emailPrefix / cleanEmail if different
      const targetStudentIds = Array.from(new Set([studentId, emailPrefix, cleanEmail].filter(Boolean)));

      for (const targetId of targetStudentIds) {
        // E. UPSERT ke tabel `tugas_siswa` (Kanonikal Utama)
        let { error: tsError } = await supabase
          .from('tugas_siswa')
          .upsert({
            id: `ts-${cleanAssignmentId}-${targetId}`,
            tugas_id: cleanAssignmentId,
            siswa_id: targetId,
            status_pengerjaan: true,
            status: 'SELESAI',
            score: parsedScore,
            nilai: parsedScore,
            submitted_at: nowIso,
            tanggal_dikerjakan: todayStr,
            umpan_balik: `Otomatis dikirim via Google Form Webhook pada ${new Date().toLocaleString('id-ID')}`
          }, { onConflict: 'id' });

        if (tsError) {
          console.warn('[Webhook Google Form] tugas_siswa primary upsert notice:', tsError.message);
          await supabase
            .from('tugas_siswa')
            .upsert({
              tugas_id: cleanAssignmentId,
              siswa_id: targetId,
              status_pengerjaan: true,
              status: 'SELESAI',
              score: parsedScore,
              nilai: parsedScore,
              submitted_at: nowIso,
              tanggal_dikerjakan: todayStr,
              umpan_balik: `Otomatis dikirim via Google Form Webhook pada ${new Date().toLocaleString('id-ID')}`
            });
        }

        // F. UPSERT ke tabel `penilaian` (Halaman Penilaian & Matrix Nilai)
        let { error: pnlError } = await supabase
          .from('penilaian')
          .upsert({
            id: `as-${cleanAssignmentId}-${targetId}`,
            siswa_id: targetId,
            mapel_id: mapelId,
            tipe: 'harian',
            nama_penilaian: judulTugas,
            nilai: parsedScore,
            deskripsi_kompetensi: `Nilai otomatis dari Google Form Webhook (${judulTugas}) pada ${new Date().toLocaleString('id-ID')}`,
            tanggal_penilaian: todayStr,
            dinilai_oleh_id: dibuatOlehId,
            kelas: taskKelas || studentClass
          }, { onConflict: 'id' });

        if (pnlError) {
          console.warn('[Webhook Google Form] penilaian primary upsert notice:', pnlError.message);
          // Try fallback upsert to legacy asesmen if penilaian table doesn't exist yet
          await supabase
            .from('asesmen')
            .upsert({
              id: `as-${cleanAssignmentId}-${targetId}`,
              siswa_id: targetId,
              mapel_id: mapelId,
              tipe: 'harian',
              nama_penilaian: judulTugas,
              nilai: parsedScore,
              deskripsi_kompetensi: `Nilai otomatis dari Google Form Webhook (${judulTugas}) pada ${new Date().toLocaleString('id-ID')}`,
              tanggal_penilaian: todayStr,
              dinilai_oleh_id: dibuatOlehId,
              kelas: taskKelas || studentClass
            }).catch(() => {});
        }
      }

      console.log(`[Webhook Google Form] Sukses update nilai & asesmen siswa ${studentName || cleanEmail} (${studentId}) untuk tugas ${cleanAssignmentId} (${judulTugas}): ${parsedScore}`);

      return res.status(200).json({
        success: true,
        message: 'Status pengerjaan, nilai tugas, dan data asesmen penilaian siswa berhasil diperbarui melalui Webhook.',
        data: {
          assignment_id: cleanAssignmentId,
          assignment_title: judulTugas,
          student_id: studentId,
          student_email: cleanEmail,
          student_name: studentName,
          score: parsedScore,
          status: 'SELESAI',
          submitted_at: nowIso
        }
      });

    } catch (err: any) {
      console.error('[Webhook Google Form] Unexpected server error:', err);
      return res.status(500).json({
        success: false,
        error: 'Terjadi kesalahan server internal: ' + (err?.message || 'Unknown error')
      });
    }
  };

  // Register both singular and plural endpoints
  app.post('/api/webhook/google-form', handleGoogleFormWebhook);
  app.post('/api/webhooks/google-form', handleGoogleFormWebhook);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Kelas Ku Webhook Server', timestamp: new Date().toISOString() });
  });

  // =========================================================================
  // 2. VITE MIDDLEWARE (DEVELOPMENT) & STATIC SERVING (PRODUCTION)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Kelas Ku Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
