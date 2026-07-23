import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Award,
  CheckSquare,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  Calendar,
  Camera
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/db';
import { exportToCSV } from '../utils/export';
import { Absensi, Asesmen, DaftarTugas, TugasSiswa } from '../types';

interface SiswaDashboardProps {
  activeTab: string;
  siswaId: string;
}

export function SiswaDashboard({ activeTab, siswaId }: SiswaDashboardProps) {
  const currentSiswa = db.siswa.getAll().find(s => s.id === siswaId);

  // Load States
  const [tasks, setTasks] = useState<DaftarTugas[]>(db.daftarTugas.getAll());
  const [mySubmissions, setMySubmissions] = useState<TugasSiswa[]>(db.tugasSiswa.getAll().filter(ts => ts.siswaId === siswaId));
  const [myGrades, setMyGrades] = useState<Asesmen[]>(db.asesmen.getAll().filter(a => a.siswaId === siswaId));
  const [myAttendance, setMyAttendance] = useState<Absensi[]>(db.absensi.getAll().filter(a => a.siswaId === siswaId));
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [syncStep, setSyncStep] = useState<number>(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState(currentSiswa?.fotoUrl || '');
  const [avatarTab, setAvatarTab] = useState<'boys' | 'girls'>('boys');
  const siswaKelas = currentSiswa?.kelas || 'Kelas IV';
  const subjects = db.mataPelajaran.getAll().filter(m => !m.kelas || m.kelas === siswaKelas);

  const handleSavePhoto = () => {
    if (currentSiswa) {
      const updated = { ...currentSiswa, fotoUrl: photoUrlInput };
      db.siswa.upsert(updated);
      setShowPhotoModal(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrlInput(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Sync states on real-time event or fallback interval
    const sync = () => {
      setTasks(db.daftarTugas.getAll());
      setMySubmissions(db.tugasSiswa.getAll().filter(ts => ts.siswaId === siswaId));
      setMyGrades(db.asesmen.getAll().filter(a => a.siswaId === siswaId));
      setMyAttendance(db.absensi.getAll().filter(a => a.siswaId === siswaId));
    };

    window.addEventListener('supabase-data-updated', sync);
    const interval = setInterval(sync, 4000); // larger interval fallback

    return () => {
      window.removeEventListener('supabase-data-updated', sync);
      clearInterval(interval);
    };
  }, [siswaId]);

  // Calculations for attendance rekap
  const totalDays = myAttendance.length;
  const hadirCount = myAttendance.filter(a => a.status === 'hadir').length;
  const sakitCount = myAttendance.filter(a => a.status === 'sakit').length;
  const izinCount = myAttendance.filter(a => a.status === 'izin').length;
  const alfaCount = myAttendance.filter(a => a.status === 'alfa').length;
  const kehadiranRate = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 100;

  // Formatting chart data for grades
  const getChartData = () => {
    // Map average grades by subject
    return subjects.map(sub => {
      const gradesOfSub = myGrades.filter(g => g.mapelId === sub.id);
      const avg = gradesOfSub.length > 0 
        ? Math.round(gradesOfSub.reduce((acc, g) => acc + g.nilai, 0) / gradesOfSub.length)
        : 0;
      return {
        name: sub.namaMapel,
        Nilai: avg,
        KKM: sub.kkm
      };
    });
  };

  // Submit confirmation handler with real-time Google Form & Supabase Sync simulation
  const handleConfirmTaskDone = (tugasId: string) => {
    setSyncingTaskId(tugasId);
    setSyncStep(1);

    setTimeout(() => {
      setSyncStep(2);
      setTimeout(() => {
        setSyncStep(3);
        setTimeout(() => {
          setSyncStep(4);
          // Perform actual save in DB (Simulating real Supabase write)
          db.tugasSiswa.submitTask(tugasId, siswaId);
          // Refresh local states
          setMySubmissions(db.tugasSiswa.getAll().filter(ts => ts.siswaId === siswaId));
          setMyGrades(db.asesmen.getAll().filter(a => a.siswaId === siswaId));
          
          setTimeout(() => {
            setSyncingTaskId(null);
            setSyncStep(0);
          }, 1500);
        }, 1200);
      }, 1000);
    }, 1000);
  };

  // Exports
  const exportMyGradesCSV = () => {
    const formatted = myGrades.map(g => {
      const mapel = subjects.find(m => m.id === g.mapelId);
      return {
        namaPenilaian: g.namaPenilaian,
        mapel: mapel ? mapel.namaMapel : 'Mapel',
        tipe: g.tipe.toUpperCase(),
        nilai: g.nilai,
        kkm: mapel ? mapel.kkm : 75,
        status: g.nilai >= (mapel ? mapel.kkm : 75) ? 'TUNTAS' : 'REMEDIAL',
        deskripsi: g.deskripsiKompetensi || '-'
      };
    });
    exportToCSV(
      formatted,
      [
        { key: 'namaPenilaian', label: 'Kegiatan Penilaian' },
        { key: 'mapel', label: 'Mata Pelajaran' },
        { key: 'tipe', label: 'Jenis Penilaian' },
        { key: 'nilai', label: 'Nilai Anda' },
        { key: 'kkm', label: 'KKM Kelulusan' },
        { key: 'status', label: 'Status Kelulusan' },
        { key: 'deskripsi', label: 'Capaian Pembelajaran' }
      ],
      `Laporan_Nilai_Siswa_${currentSiswa?.namaSiswa || 'Siswa'}`
    );
  };

  const exportMyAttendanceCSV = () => {
    const formatted = myAttendance.map(a => ({
      tanggal: a.tanggal,
      status: a.status.toUpperCase(),
      keterangan: a.keterangan || '-'
    }));
    exportToCSV(
      formatted,
      [
        { key: 'tanggal', label: 'Tanggal Belajar' },
        { key: 'status', label: 'Status Kehadiran' },
        { key: 'keterangan', label: 'Keterangan/Sebab' }
      ],
      `Rekap_Absensi_Siswa_${currentSiswa?.namaSiswa || 'Siswa'}`
    );
  };

  return (
    <div id="siswa_dashboard_container" className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-m3-purple to-[#21005D] text-white p-6 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={() => {
              setPhotoUrlInput(currentSiswa?.fotoUrl || '');
              setShowPhotoModal(true);
            }} 
            className="group relative cursor-pointer outline-none shrink-0"
            title="Klik untuk mengubah foto profil"
          >
            <div className="relative rounded-full overflow-hidden border-2 border-white/20 shadow-md">
              {currentSiswa?.fotoUrl ? (
                <img
                  src={currentSiswa.fotoUrl}
                  alt={currentSiswa.namaSiswa}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover shrink-0 aspect-square group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <div className="w-16 h-16 bg-white/10 flex items-center justify-center font-bold text-lg group-hover:bg-white/20 transition-all">
                  {currentSiswa?.namaSiswa ? currentSiswa.namaSiswa.substring(0, 2).toUpperCase() : 'SD'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 bg-emerald-600 rounded-full p-1 border border-white text-[9px] shadow-sm flex items-center justify-center">
              ✏️
            </span>
          </button>

          <div>
            <h2 className="text-xl font-extrabold">Halo, {currentSiswa?.namaSiswa}! 👋</h2>
            <p className="text-xs text-m3-purple-light mt-1 max-w-xl">
              Selamat datang di portal belajarmu. Pantau tugas Google Form, cek laporan nilai Kurikulum Merdeka, dan pertahankan prestasimu!
            </p>
          </div>
        </div>
        
        <div className="bg-white/10 px-5 py-3 rounded-2xl text-xs backdrop-blur-sm border border-white/10 text-right min-w-[160px]">
          <div className="font-extrabold text-sm text-white leading-tight">{currentSiswa?.namaSiswa}</div>
          <div className="text-m3-purple-light text-xs font-semibold mt-1">Kelas {currentSiswa?.kelas}</div>
          <button 
            type="button" 
            onClick={() => {
              setPhotoUrlInput(currentSiswa?.fotoUrl || '');
              setShowPhotoModal(true);
            }}
            className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer inline-flex items-center gap-1"
          >
            <Camera className="w-3 h-3" /> Ubah Foto Profil
          </button>
        </div>
      </div>

      {/* 1. TUGAS HARIAN SAYA */}
      {activeTab === 'siswa_tugas' && (
        <div id="student_tasks_view" className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-m3-border dark:border-slate-800/80 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-m3-text dark:text-white flex items-center gap-1.5">
                <Bookmark className="w-5 h-5 text-m3-purple" />
                Tugas Google Form Aktif
              </h3>
              <p className="text-xs text-m3-sec-text">Selesaikan tugas di Google Form lalu klik Konfirmasi Selesai untuk penilaian otomatis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.filter(t => !t.kelas || t.kelas === siswaKelas).map((t) => {
              const mapel = subjects.find(m => m.id === t.mapelId);
              const submission = mySubmissions.find(sub => sub.tugasId === t.id);
              const isCompleted = submission?.statusPengerjaan;

              return (
                <div
                  key={t.id}
                  className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-colors ${
                    isCompleted
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30'
                      : 'bg-white dark:bg-slate-900 border-m3-border dark:border-slate-800/80'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-m3-purple-light text-m3-purple-dark'
                      }`}>
                        {mapel ? mapel.namaMapel : 'Mapel'}
                      </span>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-100/50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-50 dark:bg-amber-950/20 px-2.5 py-0.5 rounded-full">
                          <AlertCircle className="w-3.5 h-3.5" /> Belum Selesai
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-m3-text dark:text-white mt-3">{t.judulTugas}</h4>
                    <p className="text-xs text-m3-sec-text mt-1">{t.deskripsi}</p>

                    <div className="mt-4 bg-m3-lavender/30 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-m3-border dark:border-slate-800 space-y-1.5 text-xs">
                      <p className="flex justify-between">
                        <span className="text-m3-sec-text">Tenggat Waktu:</span>
                        <strong className="text-m3-text dark:text-slate-300">
                          {new Date(t.tenggatWaktu).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </strong>
                      </p>
                      {isCompleted && (
                        <>
                          <p className="flex justify-between border-t border-m3-border dark:border-slate-800 pt-1.5">
                            <span className="text-m3-sec-text">Nilai Otomatis:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{submission.nilai} Poin</strong>
                          </p>
                          <p className="text-[11px] text-m3-sec-text italic mt-1 bg-white dark:bg-slate-900 p-2 rounded-lg border border-m3-border dark:border-slate-800">
                            " {submission.umpanBalik || 'Sangat baik, pertahankan!' } "
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-m3-border dark:border-slate-800 grid grid-cols-2 gap-3">
                    <a
                      href={t.googleFormUrl}
                      target="_blank"
                      rel="noreferrer"
                      id={`open_gform_${t.id}`}
                      className="bg-m3-purple text-white text-xs font-bold py-2.5 rounded-full text-center shadow-sm cursor-pointer hover:bg-m3-purple-dark transition-all flex items-center justify-center gap-1 hover:scale-105"
                    >
                      Kerjakan Tugas <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      id={`confirm_task_${t.id}`}
                      disabled={!!isCompleted}
                      onClick={() => handleConfirmTaskDone(t.id)}
                      className={`text-xs font-bold py-2.5 rounded-full text-center shadow-sm transition-all ${
                        isCompleted
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/50'
                          : 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 hover:scale-105'
                      }`}
                    >
                      {isCompleted ? 'Selesai ✓' : 'Lanjutkan Tugas'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. LAPORAN NILAI SAYA */}
      {activeTab === 'siswa_nilai' && (
        <div id="student_grades_view" className="space-y-6">
          <div className="flex flex-wrap justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-m3-border dark:border-slate-800/80 shadow-sm gap-4">
            <div>
              <h3 className="text-base font-bold text-m3-text dark:text-white flex items-center gap-1.5">
                <Award className="w-5 h-5 text-m3-purple" />
                Laporan Hasil Belajar Kurikulum Merdeka
              </h3>
              <p className="text-xs text-m3-sec-text">Analisis rata-rata nilai mata pelajaran harian serta sumatif</p>
            </div>
            <button
              id="export_my_grades_btn"
              onClick={exportMyGradesCSV}
              className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-emerald-700 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ekspor Nilai Saya (Excel)
            </button>
          </div>

          {/* Visual Chart Analysis */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-m3-border dark:border-slate-800/80 shadow-sm">
            <h4 className="text-xs font-bold text-m3-sec-text uppercase tracking-widest mb-4 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Grafik Analisis Nilai vs KKM Kelas
            </h4>
            <div className="h-48 sm:h-64 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={45} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Nilai" fill="#6750A4" radius={[6, 6, 0, 0]} name="Nilai Rata-rata" />
                  <Bar dataKey="KKM" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Batas KKM" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Grades List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-m3-border dark:border-slate-800/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-m3-border dark:border-slate-800">
              <h4 className="text-sm font-bold text-m3-text dark:text-white">Daftar Transkrip Nilai Siswa</h4>
            </div>

            {/* Mobile View Card Layout (Highly Responsive and Elegant) */}
            <div className="block sm:hidden divide-y divide-m3-border dark:divide-slate-800/50">
              {myGrades.length > 0 ? (
                myGrades.map((g) => {
                  const mapel = subjects.find(m => m.id === g.mapelId);
                  const isRemedial = g.nilai < (mapel ? mapel.kkm : 75);
                  return (
                    <div key={g.id} className="p-4 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-m3-purple dark:text-indigo-400">
                            {mapel ? mapel.namaMapel : '-'}
                          </span>
                          <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                            {g.namaPenilaian}
                          </h5>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block text-base font-black font-mono text-m3-purple dark:text-indigo-400">
                            {g.nilai} <span className="text-[9px] font-normal text-slate-400">Poin</span>
                          </span>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 text-[8px] uppercase font-extrabold rounded-full ${
                            isRemedial ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                          }`}>
                            {isRemedial ? 'Remedial' : 'Tuntas'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                          g.tipe === 'harian' ? 'bg-m3-purple-light text-m3-purple-dark' :
                          g.tipe === 'sts' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' :
                          'bg-pink-50 text-pink-600 dark:bg-pink-950/40'
                        }`}>
                          {g.tipe}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                          KKM: {mapel ? mapel.kkm : 75}
                        </span>
                      </div>

                      {g.deskripsiKompetensi && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/50 mt-1">
                          <span className="block font-bold text-[9px] uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-0.5">Capaian Kompetensi:</span>
                          <p className="leading-relaxed text-[11px] font-medium">{g.deskripsiKompetensi}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Belum ada transkrip nilai asesmen.
                </div>
              )}
            </div>

            {/* Desktop View Table Layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-m3-lavender/50 dark:bg-slate-800/50 text-m3-sec-text dark:text-slate-400 font-bold text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Mata Pelajaran</th>
                    <th className="px-6 py-4">Nama Asesmen</th>
                    <th className="px-6 py-4">Tipe Asesmen</th>
                    <th className="px-6 py-4">Nilai Diperoleh</th>
                    <th className="px-6 py-4">Capaian Kompetensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-border dark:divide-slate-800 text-m3-sec-text dark:text-slate-300">
                  {myGrades.map((g) => {
                    const mapel = subjects.find(m => m.id === g.mapelId);
                    return (
                      <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4 font-bold text-m3-text dark:text-white">
                          {mapel ? mapel.namaMapel : '-'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-m3-text dark:text-white">{g.namaPenilaian}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                            g.tipe === 'harian' ? 'bg-m3-purple-light text-m3-purple-dark' :
                            g.tipe === 'sts' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' :
                            'bg-pink-50 text-pink-600 dark:bg-pink-950/40'
                          }`}>
                            {g.tipe}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-m3-purple dark:text-indigo-400 text-sm">
                          {g.nilai} Poin
                        </td>
                        <td className="px-6 py-4 text-xs text-m3-sec-text max-w-xs truncate">
                          {g.deskripsiKompetensi || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. REKAPITULASI ABSENSI SAYA */}
      {activeTab === 'siswa_absensi' && (
        <div id="student_attendance_view" className="space-y-6">
          <div className="flex flex-wrap justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-m3-border dark:border-slate-800/80 shadow-sm gap-4">
            <div>
              <h3 className="text-base font-bold text-m3-text dark:text-white flex items-center gap-1.5">
                <CheckSquare className="w-5 h-5 text-m3-purple" />
                Rekapitulasi Kehadiran & Presensi
              </h3>
              <p className="text-xs text-m3-sec-text">Ringkasan tingkat kehadiran Anda sepanjang semester berjalan</p>
            </div>
            <button
              id="export_my_attendance_btn"
              onClick={exportMyAttendanceCSV}
              className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-emerald-700 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ekspor Kehadiran (Excel)
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-m3-border dark:border-slate-800 shadow-sm text-center">
              <span className="text-xs text-m3-sec-text">Hadir</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{hadirCount} Hari</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-m3-border dark:border-slate-800 shadow-sm text-center">
              <span className="text-xs text-m3-sec-text">Sakit</span>
              <p className="text-2xl font-bold text-amber-500 mt-1">{sakitCount} Hari</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-m3-border dark:border-slate-800 shadow-sm text-center">
              <span className="text-xs text-m3-sec-text">Izin</span>
              <p className="text-2xl font-bold text-blue-500 mt-1">{izinCount} Hari</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-m3-border dark:border-slate-800 shadow-sm text-center">
              <span className="text-xs text-m3-sec-text">Alfa</span>
              <p className="text-2xl font-bold text-red-500 mt-1">{alfaCount} Hari</p>
            </div>
            <div className="bg-gradient-to-br from-m3-purple to-[#21005D] p-4 rounded-3xl text-white text-center shadow-sm col-span-2 lg:col-span-1 flex flex-col justify-center">
              <span className="text-xs text-m3-purple-light">Rasio Kehadiran</span>
              <p className="text-2xl font-extrabold mt-1">{kehadiranRate}%</p>
            </div>
          </div>

          {/* Log List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-m3-border dark:border-slate-800/80 shadow-sm overflow-hidden max-w-2xl mx-auto">
            <div className="p-4 border-b border-m3-border dark:border-slate-800">
              <h4 className="text-sm font-bold text-m3-text dark:text-white flex items-center gap-1">
                <Activity className="w-4 h-4 text-m3-purple" />
                Daftar Riwayat Kehadiran Siswa
              </h4>
            </div>
            <div className="divide-y divide-m3-border dark:divide-slate-800">
              {myAttendance.map((a) => (
                <div key={a.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/40 transition-all">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-m3-sec-text" />
                    <span className="font-semibold text-m3-text dark:text-slate-200">
                      {new Date(a.tanggal).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                    a.status === 'hadir' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                    a.status === 'sakit' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                    'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400'
                  }`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {syncingTaskId && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 text-center transform transition-transform duration-300 scale-100">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-600/20 border-t-emerald-600"></div>
                <Bookmark className="absolute text-emerald-600 w-6 h-6 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Sinkronisasi Real-Time Database</h4>
              <p className="text-xs text-slate-500">Sinkronisasi data pengerjaan Google Form Kurikulum Merdeka Anda dengan Database Supabase</p>
            </div>

            <div className="space-y-3.5 text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  syncStep >= 1 ? 'bg-emerald-600 text-white animate-bounce' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {syncStep > 1 ? '✓' : '1'}
                </span>
                <span className={`font-semibold ${syncStep >= 1 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                  Menghubungkan ke API Google Form...
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  syncStep >= 2 ? 'bg-emerald-600 text-white animate-bounce' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {syncStep > 2 ? '✓' : '2'}
                </span>
                <span className={`font-semibold ${syncStep >= 2 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                  Mengunduh respons & nilai pengerjaan...
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  syncStep >= 3 ? 'bg-emerald-600 text-white animate-bounce' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {syncStep > 3 ? '✓' : '3'}
                </span>
                <span className={`font-semibold ${syncStep >= 3 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                  Menyimpan & sinkronisasi data dengan Supabase...
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  syncStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {syncStep >= 4 ? '✓' : '4'}
                </span>
                <span className={`font-semibold ${syncStep >= 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  Sinkronisasi Berhasil! Nilai terekam real-time.
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-600 h-2 transition-all duration-500 ease-out"
                style={{ width: `${(syncStep / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PHOTO EDITING MODAL */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 transform transition-transform duration-300 scale-100">
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center justify-center gap-1.5">
                <span>📸</span> Ubah Foto Profil Saya
              </h4>
              <p className="text-[11px] text-slate-500">Ambil foto baru atau upload gambar langsung dari HP-mu!</p>
            </div>

            {/* PREVIEW & DEVICE UPLOAD */}
            <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/70 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
              {photoUrlInput ? (
                <img 
                  src={photoUrlInput} 
                  alt="Preview" 
                  className="w-24 h-24 rounded-full object-cover shrink-0 aspect-square border-4 border-m3-purple shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-2xl border-4 border-slate-300 dark:border-slate-600">
                  SD
                </div>
              )}
              
              {/* UPLOAD FROM PHONE */}
              <div className="w-full">
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm w-full text-center">
                  <Camera className="w-4 h-4" />
                  <span>Pilih / Ambil Foto Sekarang</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                className="flex-1 py-1.5 rounded-xl bg-m3-purple hover:bg-m3-purple-dark text-white text-xs font-bold shadow-md transition-colors"
              >
                Simpan Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
