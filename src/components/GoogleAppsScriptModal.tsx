import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Code, HelpCircle, Key, Send, CheckCircle2 } from 'lucide-react';
import { DaftarTugas } from '../types';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: DaftarTugas[];
  selectedTask?: DaftarTugas | null;
}

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({
  isOpen,
  onClose,
  tasks = [],
  selectedTask = null,
}) => {
  const [activeTaskId, setActiveTaskId] = useState<string>(selectedTask?.id || tasks[0]?.id || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [testEmail, setTestEmail] = useState<string>('siswa1@sd.id');
  const [testScoreText, setTestScoreText] = useState<string>('88 / 100');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'script' | 'sql'>('script');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const sqlMigrationCode = `-- =========================================================================
-- SQL MIGRASI SINKRONISASI SUPABASE (EMAIL & ID SISWA UNTUK GOOGLE FORM WEBHOOK)
-- Jalankan Kueri SQL ini di SQL Editor Dashboard Supabase Anda
-- =========================================================================

-- 1. Buat Tabel public.siswa jika belum ada
CREATE TABLE IF NOT EXISTS public.siswa (
  id text PRIMARY KEY,
  nama_siswa text,
  email text,
  nisn text,
  nis text,
  kelas text,
  password text,
  created_at timestamptz DEFAULT now()
);

-- 2. Buat Tabel public.tugas_siswa jika belum ada
CREATE TABLE IF NOT EXISTS public.tugas_siswa (
  id text PRIMARY KEY,
  tugas_id text,
  siswa_id text,
  status_pengerjaan boolean DEFAULT false,
  status text DEFAULT 'BELUM_DIKERJAKAN',
  score numeric,
  nilai numeric,
  submitted_at timestamptz,
  tanggal_dikerjakan text,
  umpan_balik text,
  created_at timestamptz DEFAULT now()
);

-- 3. Buat Tabel public.student_assignments jika belum ada
CREATE TABLE IF NOT EXISTS public.student_assignments (
  id text PRIMARY KEY,
  assignment_id text,
  student_id text,
  status text DEFAULT 'BELUM_DIKERJAKAN',
  score numeric,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. Buat Tabel public.profiles jika belum ada
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  full_name text,
  email text,
  username text,
  role text,
  created_at timestamptz DEFAULT now()
);

-- 5. Tambahkan kolom pendukung (jika tabel sudah ada sebelumnya)
ALTER TABLE public.siswa 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS nisn text,
ADD COLUMN IF NOT EXISTS nis text,
ADD COLUMN IF NOT EXISTS password text;

ALTER TABLE public.tugas_siswa
ADD COLUMN IF NOT EXISTS score numeric,
ADD COLUMN IF NOT EXISTS nilai numeric,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'BELUM_DIKERJAKAN',
ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS tanggal_dikerjakan text,
ADD COLUMN IF NOT EXISTS umpan_balik text;

ALTER TABLE public.student_assignments
ADD COLUMN IF NOT EXISTS score numeric,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'BELUM_DIKERJAKAN',
ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- 6. Buat Index Pencarian Email Cepat
CREATE INDEX IF NOT EXISTS idx_siswa_email ON public.siswa (lower(email));

-- 7. Kebijakan Keamanan RLS (Row Level Security)
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for siswa" ON public.siswa;
CREATE POLICY "Allow public read-write for siswa" ON public.siswa FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tugas_siswa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for tugas_siswa" ON public.tugas_siswa;
CREATE POLICY "Allow public read-write for tugas_siswa" ON public.tugas_siswa FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for student_assignments" ON public.student_assignments;
CREATE POLICY "Allow public read-write for student_assignments" ON public.student_assignments FOR ALL USING (true) WITH CHECK (true);
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kelasku-app.run.app';
  const webhookUrl = `${currentAppUrl}/api/webhook/google-form`;
  const webhookSecret = 'kelasku-secret-key';

  const scriptCode = `/**
 * GOOGLE APPS SCRIPT - HYBRID TRACKING TAHAP 2 (KELAS KU)
 * Pasang skrip ini di Google Sheets Respon Google Form atau Google Form langsung (Extensions -> Apps Script)
 */

var WEBHOOK_URL = "${webhookUrl}";
var WEBHOOK_SECRET = "${webhookSecret}";
var ASSIGNMENT_ID = "${activeTaskId || 'ID_TUGAS_AKAN_DIPILIH'}";

function onFormSubmit(e) {
  try {
    var studentEmail = "";
    var scoreText = "";

    // =========================================================================
    // TEKNIK 1: Event Google Form (e.response dari FormApp)
    // =========================================================================
    if (e && e.response) {
      if (typeof e.response.getRespondentEmail === "function") {
        studentEmail = e.response.getRespondentEmail() || "";
      }
      
      // Jika email terverifikasi kosong, cari dari jawaban item bertema "email"
      if (!studentEmail && typeof e.response.getItemResponses === "function") {
        var itemResponses = e.response.getItemResponses();
        for (var i = 0; i < itemResponses.length; i++) {
          var itemTitle = itemResponses[i].getItem().getTitle().toLowerCase();
          if (itemTitle.indexOf("email") !== -1 || itemTitle.indexOf("surel") !== -1) {
            studentEmail = itemResponses[i].getResponse();
            break;
          }
        }
      }

      // Ambil Skor Quiz dari FormResponse
      if (typeof e.response.getGradableItemResponses === "function") {
        var gradables = e.response.getGradableItemResponses();
        var totalScore = 0;
        for (var j = 0; j < gradables.length; j++) {
          totalScore += gradables[j].getScore() || 0;
        }
        scoreText = String(totalScore);
      }
    }

    // =========================================================================
    // TEKNIK 2: Event Google Sheets (e.namedValues / e.values dari SpreadsheetApp)
    // =========================================================================
    if (!studentEmail && e && e.namedValues) {
      // Cari Email dari e.namedValues (Object nama kolom Google Sheets)
      for (var key in e.namedValues) {
        var lowerKey = key.toLowerCase();
        if (lowerKey.indexOf("email") !== -1 || lowerKey.indexOf("surel") !== -1 || lowerKey.indexOf("alamat") !== -1) {
          var valArr = e.namedValues[key];
          if (valArr && valArr.length > 0 && valArr[0]) {
            studentEmail = String(valArr[0]).trim();
            break;
          }
        }
      }

      // Cari Skor dari e.namedValues
      if (!scoreText || scoreText === "0") {
        for (var keyScore in e.namedValues) {
          var lowerKeyScore = keyScore.toLowerCase();
          if (lowerKeyScore.indexOf("skor") !== -1 || lowerKeyScore.indexOf("score") !== -1 || lowerKeyScore.indexOf("nilai") !== -1) {
            var valScoreArr = e.namedValues[keyScore];
            if (valScoreArr && valScoreArr.length > 0 && valScoreArr[0]) {
              scoreText = String(valScoreArr[0]).trim();
              break;
            }
          }
        }
      }
    }

    // Backup dari e.values (Array kolom mentah Google Sheets)
    if (e && e.values && e.values.length > 0) {
      if (!studentEmail) {
        for (var v = 0; v < e.values.length; v++) {
          var val = String(e.values[v]).trim();
          if (val.indexOf("@") !== -1 && val.indexOf(".") !== -1) {
            studentEmail = val;
            break;
          }
        }
      }

      if (!scoreText || scoreText === "0") {
        for (var s = 0; s < e.values.length; s++) {
          var valS = String(e.values[s]).trim();
          if (valS.indexOf("/") !== -1 || (valS.length <= 5 && !isNaN(parseFloat(valS)))) {
            scoreText = valS;
            break;
          }
        }
      }
    }

    // =========================================================================
    // TEKNIK 3: Fallback Membaca Baris Terakhir Google Sheets
    // =========================================================================
    if (!studentEmail || !scoreText) {
      try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          var rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

          for (var col = 0; col < headers.length; col++) {
            var h = String(headers[col]).toLowerCase();
            var d = String(rowData[col]).trim();

            if (!studentEmail && (h.indexOf("email") !== -1 || d.indexOf("@") !== -1)) {
              studentEmail = d;
            }
            if (!scoreText && (h.indexOf("skor") !== -1 || h.indexOf("score") !== -1 || h.indexOf("nilai") !== -1)) {
              scoreText = d;
            }
          }
        }
      } catch (sheetErr) {
        Logger.log("Info fallback sheet: " + sheetErr.toString());
      }
    }

    // Normalisasi email & skor default
    studentEmail = String(studentEmail || "").trim().toLowerCase();
    scoreText = String(scoreText || "100").trim();

    Logger.log("=== WEBHOOK KELAS KU ===");
    Logger.log("Email Siswa : " + studentEmail);
    Logger.log("ID Tugas    : " + ASSIGNMENT_ID);
    Logger.log("Skor/Nilai  : " + scoreText);

    if (!studentEmail) {
      Logger.log("PERINGATAN: Email siswa tidak ditemukan dari e / sheet!");
      return;
    }

    var payload = {
      "student_email": studentEmail,
      "assignment_id": ASSIGNMENT_ID,
      "score_text": scoreText
    };

    var options = {
      "method": "post",
      "contentType": "application/json",
      "headers": {
        "x-webhook-secret": WEBHOOK_SECRET
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Status Response : " + response.getResponseCode());
    Logger.log("Body Response   : " + response.getContentText());

  } catch (err) {
    Logger.log("ERROR onFormSubmit: " + err.toString());
  }
}

/**
 * FUNGSI UJI COBA (JALANKAN DARI MANAJER SKRIP)
 * Pilih fungsi 'testKirimWebhook' lalu klik tombol 'Run / Jalankan' di Apps Script Editor
 */
function testKirimWebhook() {
  var testEmail = "kholisulzainal@gmail.com"; // Sesuaikan email siswa Anda
  var testScore = "100 / 100";
  
  Logger.log("Menguji pengiriman webhook untuk: " + testEmail);
  
  var payload = {
    "student_email": testEmail,
    "assignment_id": ASSIGNMENT_ID,
    "score_text": testScore
  };

  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "x-webhook-secret": WEBHOOK_SECRET
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var res = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log("=== HASIL TEST WEBHOOK ===");
  Logger.log("HTTP Code : " + res.getResponseCode());
  Logger.log("HTTP Body : " + res.getContentText());
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateWebhook = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/webhook/google-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret
        },
        body: JSON.stringify({
          student_email: testEmail,
          assignment_id: activeTaskId,
          score_text: testScoreText
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus(`✅ BERHASIL: Nilai ${data.data.score} tersimpan untuk ${data.data.student_name || testEmail}!`);
      } else {
        setTestStatus(`❌ GAGAL: ${data.error || 'Server menolak webhook.'}`);
      }
    } catch (err: any) {
      setTestStatus(`❌ ERROR: ${err?.message || 'Gagal terhubung ke API Webhook.'}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md overflow-hidden pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[111] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Modal Header */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4 shrink-0 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-m3-purple/10 text-m3-purple flex items-center justify-center">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Integrasi Google Apps Script & Webhook (Tahap 2)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Otomatisasi pengiriman nilai dari Google Form ke aplikasi Kelas Ku
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              aria-label="Tutup Modal"
              className="relative z-20 w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
            {/* Task Selector */}
            {tasks.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Tugas yang Ingin Dihubungkan:
                </label>
                <select
                  value={activeTaskId}
                  onChange={(e) => setActiveTaskId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.id}] {t.judulTugas} ({t.kelas || 'Semua Kelas'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Credentials Info Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Endpoint URL Webhook
                </span>
                <code className="text-xs font-mono font-bold text-m3-purple break-all">{webhookUrl}</code>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-500" /> Header Secret (x-webhook-secret)
                </span>
                <code className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{webhookSecret}</code>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('script')}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'script'
                    ? 'bg-m3-purple text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>1. Google Apps Script Webhook</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sql')}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'sql'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>2. SQL Migrasi Supabase (Email & ID)</span>
              </button>
            </div>

            {activeTab === 'script' ? (
              <>
                {/* Script Code Block */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-m3-purple" /> Skrip Apps Script Siap Pakai:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 bg-m3-purple hover:bg-m3-purple-dark text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Tersalin!' : 'Salin Kode Skrip'}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-56 border border-slate-800 leading-relaxed">
                    {scriptCode}
                  </pre>
                </div>

                {/* Live Webhook Tester Section */}
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-2xl space-y-3">
                  <h4 className="text-xs font-extrabold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-m3-purple" /> Uji Coba Webhook Secara Langsung (Simulasi Form Submit)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Email Siswa Test
                      </label>
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                        placeholder="siswa1@sd.id"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Nilai / Skor Test (contoh: "90 / 100")
                      </label>
                      <input
                        type="text"
                        value={testScoreText}
                        onChange={(e) => setTestScoreText(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                        placeholder="90 / 100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleSimulateWebhook}
                      disabled={isTesting || !activeTaskId}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isTesting ? 'Mengirim...' : 'Kirim Uji Coba Webhook'}
                    </button>

                    {testStatus && (
                      <span className="text-xs font-extrabold font-mono text-slate-800 dark:text-slate-200">
                        {testStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Step-by-Step Instructions */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-800 rounded-2xl text-xs space-y-2.5">
                  <span className="font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-sm">
                    <HelpCircle className="w-5 h-5 text-amber-600" /> LANGKAH PENTING (PENYEBAB UTAMA WEBHOOK BELUM TERKIRIM):
                  </span>
                  <ol className="list-decimal list-inside space-y-2 text-amber-900 dark:text-amber-300 pl-1 leading-relaxed">
                    <li>
                      <strong>Tempel Kode:</strong> Buka Google Sheets -&gt; <strong>Ekstensi (Extensions)</strong> -&gt; <strong>Apps Script</strong>. Hapus kode lama &amp; tempel skrip di atas.
                    </li>
                    <li className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-xl border border-amber-300 dark:border-amber-700">
                      <strong>WAJIB: PASANG PEMICU (TRIGGERS):</strong> Tanpa pemicu, Google Apps Script TIDAK AKAN PERNAH berjalan otomatis saat siswa isi form!
                      <br />
                      &bull; Klik ikon <strong>Jam Dinding (Pemicu / Triggers)</strong> di menu sebelah kiri Apps Script.
                      <br />
                      &bull; Klik tombol <strong>"+ Tambah Pemicu" (+ Add Trigger)</strong> di kanan bawah.
                      <br />
                      &bull; Pilih jenis acara (Event type): <strong>"Saat mendaftar formulir" (On form submit)</strong>.
                      <br />
                      &bull; Klik <strong>Simpan (Save)</strong> dan izinkan otorisasi Google Account.
                    </li>
                    <li>
                      <strong>TES LANGSUNG SEKARANG:</strong> Kembali ke editor Apps Script, pilih fungsi <code>testKirimWebhook</code> di drop-down paling atas, lalu klik <strong>Run / Jalankan</strong>. Buka <strong>Executions / Log</strong> untuk melihat respon <code>HTTP 200 SUCCESS</code>!
                    </li>
                  </ol>
                </div>
              </>
            ) : (
              /* SQL Migration Tab */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-emerald-600" /> Kueri SQL Migrasi Supabase (Sinkronisasi ID & Email Siswa)
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'Tersalin!' : 'Salin Kueri SQL'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Jalankan skrip SQL di bawah ini pada **SQL Editor Dashboard Supabase** Anda untuk memastikan kolom <code className="font-bold text-emerald-700 font-mono">email</code>, <code className="font-bold text-emerald-700 font-mono">id</code>, dan tabel <code className="font-bold text-emerald-700 font-mono">tugas_siswa</code> tersinkronisasi penuh dengan Webhook Google Form.
                  </p>
                </div>

                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                  {sqlMigrationCode}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
