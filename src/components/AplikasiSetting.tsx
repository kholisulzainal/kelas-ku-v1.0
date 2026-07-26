import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Shield,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Server,
  Globe,
  Key,
  BookOpen,
  Lock,
  Save,
  HelpCircle
} from 'lucide-react';
import { db } from '../services/db';
import { pullAllFromSupabase, syncAllToSupabase, getSupabaseConfig } from '../services/supabase';

export function AplikasiSetting() {
  const [profil, setProfil] = useState(() => db.profilSekolah.get());
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const supabaseConfig = getSupabaseConfig();
  const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  const handleSaveProfil = () => {
    setIsSaving(true);
    db.profilSekolah.update(profil);
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Pengaturan aplikasi & profil sekolah berhasil disimpan!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 400);
  };

  const handleForceSyncSupabase = async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    setSyncStatus('Sedang menyingkronkan dengan database Supabase...');
    try {
      const pullRes = await pullAllFromSupabase();
      if (pullRes.success) {
        setSyncStatus('Singkronisasi berhasil! Data lokal dan Supabase telah diperbarui.');
      } else {
        setSyncStatus(`Perhatian: ${pullRes.error || 'Gagal tersambung ke Supabase'}`);
      }
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackupJSON = () => {
    const backupData = {
      profil_sekolah: db.profilSekolah.get(),
      guru: db.guru.getAll(),
      siswa: db.siswa.getAll(),
      orang_tua: db.orangTua.getAll(),
      mata_pelajaran: db.mataPelajaran.getAll(),
      jadwal_pelajaran: db.jadwalPelajaran.getAll(),
      absensi: db.absensi.getAll(),
      daftar_tugas: db.daftarTugas.getAll(),
      tugas_siswa: db.tugasSiswa.getAll(),
      asesmen: db.asesmen.getAll(),
      temuan_khusus: db.temuanKhusus.getAll(),
      buku_digital: db.bukuDigital.getAll(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KELAS_KU_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (data.profil_sekolah) db.profilSekolah.update(data.profil_sekolah);
        if (Array.isArray(data.guru)) db.guru.save(data.guru);
        if (Array.isArray(data.siswa)) db.siswa.save(data.siswa);
        if (Array.isArray(data.orang_tua)) db.orangTua.save(data.orang_tua);
        if (Array.isArray(data.mata_pelajaran)) db.mataPelajaran.save(data.mata_pelajaran);
        if (Array.isArray(data.jadwal_pelajaran)) db.jadwalPelajaran.save(data.jadwal_pelajaran);
        if (Array.isArray(data.absensi)) db.absensi.save(data.absensi);
        if (Array.isArray(data.daftar_tugas)) db.daftarTugas.save(data.daftar_tugas);
        if (Array.isArray(data.tugas_siswa)) db.tugasSiswa.save(data.tugas_siswa);
        if (Array.isArray(data.asesmen)) db.asesmen.save(data.asesmen);
        if (Array.isArray(data.temuan_khusus)) db.temuanKhusus.save(data.temuan_khusus);
        if (Array.isArray(data.buku_digital)) db.bukuDigital.save(data.buku_digital);

        alert('Restore data berhasil dilakukan! Halaman akan dimuat ulang.');
        window.location.reload();
      } catch (err) {
        alert('Gagal membaca file backup JSON. Format tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Settings className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black">Pengaturan Aplikasi Operator (System Admin)</h2>
            <p className="text-xs text-blue-200 mt-1">
              Pusat kendali konfigurasi sekolah, integrasi database Supabase, lisensi, dan privasi akses warga sekolah.
            </p>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {saveMessage}
        </div>
      )}

      {/* 1. Pengaturan Tahun Ajaran & Identitas */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-m3-border dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Identitas &amp; Periode Akademik</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tahun Pelajaran Aktif
            </label>
            <input
              type="text"
              value={profil.tahunPelajaran || '2025/2026'}
              onChange={(e) => setProfil({ ...profil, tahunPelajaran: e.target.value })}
              placeholder="Contoh: 2025/2026"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Aplikasi / Lembaga
            </label>
            <input
              type="text"
              value={profil.namaSekolah || 'KELAS KU'}
              onChange={(e) => setProfil({ ...profil, namaSekolah: e.target.value })}
              placeholder="Nama Sekolah / Aplikasi"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveProfil}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl flex items-center gap-2 cursor-pointer transition-all shadow-md"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>

      {/* 2. Database Supabase & Backup */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-m3-border dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Database &amp; Sinkronisasi Supabase</h3>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status Supabase PostgreSQL:</span>
            {isSupabaseConfigured ? (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terkoneksi &amp; Aktif
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Mode Database Lokal (Offline)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            URL: {supabaseConfig.url || 'Belum dikonfigurasi di environment'}
          </p>
        </div>

        {syncStatus && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs rounded-xl font-medium">
            {syncStatus}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {isSupabaseConfigured && (
            <button
              onClick={handleForceSyncSupabase}
              disabled={isSyncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sinkronkan dengan Supabase Sekarang
            </button>
          )}

          <button
            onClick={handleBackupJSON}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Backup Database Lokal (.JSON)
          </button>

          <label className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 cursor-pointer transition-all shadow-sm border border-slate-300 dark:border-slate-700">
            <Upload className="w-4 h-4" />
            Restore Database (.JSON)
            <input type="file" accept=".json" onChange={handleRestoreJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* 3. Aturan Privasi & Keamanan Akses Per Kelas */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-m3-border dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Kebijakan Privasi &amp; Isolasi Data Warga Sekolah</h3>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-2 text-xs text-purple-900 dark:text-purple-200">
          <div className="font-extrabold flex items-center gap-1.5 text-sm">
            <Lock className="w-4 h-4 text-purple-600" /> Sistem "Kamar Privasi" Aktif
          </div>
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">
            Aplikasi ini mengisolasi data antar kelas untuk mencegah miskomunikasi:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1">
            <li><strong>Siswa &amp; Orang Tua:</strong> Hanya dapat melihat tugas, absensi, dan nilai dari kelasnya sendiri.</li>
            <li><strong>Guru Wali Kelas:</strong> Mengelola tugas, absensi, dan nilai khusus untuk kelas yang diampu.</li>
            <li><strong>Operator / Admin:</strong> Memegang hak akses penuh untuk kontrol seluruh kelas dan profil sekolah.</li>
          </ul>
        </div>
      </div>

      {/* 4. Webhook Google Form Endpoint */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-m3-border dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Webhook Integrasi Google Form</h3>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Endpoint Webhook Server Nilai Kuis (POST):
          </label>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-xs text-blue-600 dark:text-blue-400 font-bold select-all border border-slate-300 dark:border-slate-700">
            {window.location.origin}/api/webhooks/google-form
          </div>
          <p className="text-[11px] text-slate-500">
            Pemicu <code>onFormSubmit</code> di Google Apps Script akan mengirimkan nilai kuis secara otomatis ke endpoint di atas.
          </p>
        </div>
      </div>
    </div>
  );
}
