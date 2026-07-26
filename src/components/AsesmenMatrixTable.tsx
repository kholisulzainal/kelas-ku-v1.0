import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Save,
  Search,
  CheckCircle2,
  Trash2,
  Download,
  Award,
  BookOpen,
  Users,
  RefreshCw
} from 'lucide-react';
import { db } from '../services/db';
import { Siswa, MataPelajaran, Asesmen, UserRole } from '../types';
import * as XLSX from 'xlsx';

interface AsesmenMatrixTableProps {
  currentRole: UserRole;
  activeClassFilter: string;
  loggedInUserId?: string;
  isCurrentGuruWaliKelas?: boolean;
}

export function AsesmenMatrixTable({
  currentRole,
  activeClassFilter,
  loggedInUserId,
  isCurrentGuruWaliKelas
}: AsesmenMatrixTableProps) {
  const [siswas, setSiswas] = useState<Siswa[]>(() => db.siswa.getAll());
  const [mapels, setMapels] = useState<MataPelajaran[]>(() => db.mataPelajaran.getAll());
  const [asesmens, setAsesmens] = useState<Asesmen[]>(() => db.asesmen.getAll());
  const [daftarTugas] = useState(() => db.daftarTugas.getAll());

  const [selectedMapelId, setSelectedMapelId] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Default number of harian/task columns = 5, or max assignments found
  const [harianColCount, setHarianColCount] = useState<number>(5);

  const refreshData = () => {
    setSiswas(db.siswa.getAll());
    setMapels(db.mataPelajaran.getAll());
    setAsesmens(db.asesmen.getAll());
  };

  useEffect(() => {
    const handleSync = () => refreshData();
    window.addEventListener('supabase-data-updated', handleSync);
    return () => window.removeEventListener('supabase-data-updated', handleSync);
  }, []);

  // Filter students based on active class filter
  const filteredStudents = siswas.filter(s => {
    const matchClass = activeClassFilter === 'Semua' || s.kelas === activeClassFilter;
    const matchSearch = !searchQuery.trim() ||
      s.namaSiswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery);
    return matchClass && matchSearch;
  });

  // Filter subjects based on selected mapel or teacher permissions
  const filteredMapels = mapels.filter(m => {
    if (selectedMapelId !== 'Semua' && m.id !== selectedMapelId) return false;
    if (currentRole === 'guru' && !isCurrentGuruWaliKelas) {
      return m.guruPengampuId === loggedInUserId;
    }
    return true;
  });

  // Automatically count max task assignments per subject to adjust harian columns if needed
  useEffect(() => {
    let maxTasks = 5;
    filteredMapels.forEach(m => {
      const tasksCount = daftarTugas.filter(t => t.mapelId === m.id).length;
      if (tasksCount > maxTasks) maxTasks = tasksCount;
    });
    if (maxTasks > harianColCount) {
      setHarianColCount(maxTasks);
    }
  }, [filteredMapels, daftarTugas]);

  // Matrix cell getter
  const getNilaiValue = (siswaId: string, mapelId: string, namaPenilaian: string): number | '' => {
    const match = asesmens.find(
      a => a.siswaId === siswaId && a.mapelId === mapelId && a.namaPenilaian === namaPenilaian
    );
    return match !== undefined ? match.nilai : '';
  };

  // Matrix cell handler (updates state & db in real time)
  const handleScoreChange = (
    siswaId: string,
    mapelId: string,
    tipe: 'harian' | 'sts' | 'sas',
    namaPenilaian: string,
    valStr: string
  ) => {
    const num = parseInt(valStr, 10);
    const existing = asesmens.find(
      a => a.siswaId === siswaId && a.mapelId === mapelId && a.namaPenilaian === namaPenilaian
    );

    if (isNaN(num) || valStr === '') {
      if (existing) {
        db.asesmen.delete(existing.id);
        refreshData();
      }
      return;
    }

    const student = siswas.find(s => s.id === siswaId);
    const updatedAsesmen: Asesmen = {
      id: existing ? existing.id : `asm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      siswaId,
      mapelId,
      tipe,
      namaPenilaian,
      nilai: Math.min(100, Math.max(0, num)),
      tanggalPenilaian: new Date().toISOString().split('T')[0],
      dinilaiOlehId: loggedInUserId,
      kelas: student?.kelas || activeClassFilter
    };

    db.asesmen.upsert(updatedAsesmen);
    refreshData();
  };

  // Calculate average for a student in a specific subject
  const calculateRowAverage = (siswaId: string, mapelId: string) => {
    const studentScores = asesmens.filter(a => a.siswaId === siswaId && a.mapelId === mapelId);
    if (studentScores.length === 0) return 0;
    const sum = studentScores.reduce((acc, curr) => acc + curr.nilai, 0);
    return Math.round(sum / studentScores.length);
  };

  // Export matrix to Excel
  const exportMatrixExcel = () => {
    const exportData: any[] = [];

    filteredStudents.forEach(s => {
      filteredMapels.forEach(m => {
        const row: any = {
          'Nama Siswa': s.namaSiswa,
          'NISN': s.nisn,
          'Kelas': s.kelas,
          'Mata Pelajaran': m.namaMapel
        };

        // Add Harian columns
        let totalSum = 0;
        let validCount = 0;

        for (let i = 1; i <= harianColCount; i++) {
          const score = getNilaiValue(s.id, m.id, `T${i}`);
          row[`Nilai Harian T${i}`] = score !== '' ? score : '-';
          if (typeof score === 'number') {
            totalSum += score;
            validCount++;
          }
        }

        // Add Kuis / STS Column
        const kuisScore = getNilaiValue(s.id, m.id, 'Kuis/STS');
        row['Nilai Kuis / Tes'] = kuisScore !== '' ? kuisScore : '-';
        if (typeof kuisScore === 'number') {
          totalSum += kuisScore;
          validCount++;
        }

        row['Rata-Rata Nilai Formatif'] = validCount > 0 ? Math.round(totalSum / validCount) : 0;
        exportData.push(row);
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Nilai Excel');
    XLSX.writeFile(workbook, `DAFTAR_NILAI_EXCEL_${activeClassFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-m3-border dark:border-slate-800 shadow-sm gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Tabel Excel Asesmen Kurikulum Terstruktur
          </h3>
          <p className="text-xs text-slate-500">
            Daftar nilai terstruktur per siswa &amp; per mata pelajaran (Kolom Harian T1-T5+, Kuis/Tes, dan Rata-rata Otomatis).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mapel Filter */}
          <select
            value={selectedMapelId}
            onChange={(e) => setSelectedMapelId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold"
          >
            <option value="Semua">Semua Mata Pelajaran</option>
            {mapels.map(m => (
              <option key={m.id} value={m.id}>{m.namaMapel}</option>
            ))}
          </select>

          {/* Add Column Button */}
          <button
            onClick={() => setHarianColCount(prev => prev + 1)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            title="Tambah kolom Tugas Harian (T6, T7, dst.)"
          >
            <Plus className="w-3.5 h-3.5" /> Kolom Tugas ({harianColCount})
          </button>

          {/* Export Excel Button */}
          <button
            onClick={exportMatrixExcel}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {saveSuccess}
        </div>
      )}

      {/* Spreadsheet Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-m3-border dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 min-w-[180px]">
                  Kolom 1: Nama Siswa
                </th>
                <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 min-w-[150px]">
                  Kolom 2: Mata Pelajaran
                </th>

                {/* Kolom 3: Sub-kolom Nilai Harian (T1, T2, T3, T4, T5...) */}
                {Array.from({ length: harianColCount }).map((_, idx) => (
                  <th
                    key={idx}
                    className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-700 min-w-[60px] bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300"
                  >
                    T{idx + 1}
                  </th>
                ))}

                {/* Kolom 4: Nilai Kuis / Tes */}
                <th className="px-3 py-3 text-center border-r border-slate-200 dark:border-slate-700 min-w-[85px] bg-purple-50/60 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300">
                  Kolom 4: Kuis/Tes
                </th>

                {/* Kolom 5: Rata-Rata Nilai */}
                <th className="px-4 py-3 text-center min-w-[100px] bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-black">
                  Kolom 5: Rata-Rata
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5 + harianColCount} className="text-center py-10 text-slate-400">
                    Tidak ada data siswa ditemukan untuk kelas {activeClassFilter}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((siswa) => {
                  return filteredMapels.map((mapel, mapelIdx) => {
                    const rowAvg = calculateRowAverage(siswa.id, mapel.id);

                    return (
                      <tr
                        key={`${siswa.id}-${mapel.id}`}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Kolom 1: Nama Siswa */}
                        <td className="px-4 py-2.5 font-bold border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-900 dark:text-white">{siswa.namaSiswa}</span>
                            <span className="text-[10px] text-slate-400">NISN: {siswa.nisn} &bull; {siswa.kelas}</span>
                          </div>
                        </td>

                        {/* Kolom 2: Mata Pelajaran */}
                        <td className="px-4 py-2.5 font-semibold border-r border-slate-200 dark:border-slate-800">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {mapel.namaMapel}
                          </span>
                        </td>

                        {/* Kolom 3: Nilai Harian (T1, T2, T3, T4, T5, ...) */}
                        {Array.from({ length: harianColCount }).map((_, colIdx) => {
                          const penName = `T${colIdx + 1}`;
                          const currentVal = getNilaiValue(siswa.id, mapel.id, penName);

                          return (
                            <td
                              key={colIdx}
                              className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center"
                            >
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={currentVal}
                                onChange={(e) =>
                                  handleScoreChange(siswa.id, mapel.id, 'harian', penName, e.target.value)
                                }
                                placeholder="-"
                                className="w-12 text-center bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg py-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                          );
                        })}

                        {/* Kolom 4: Kuis / Tes */}
                        <td className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={getNilaiValue(siswa.id, mapel.id, 'Kuis/STS')}
                            onChange={(e) =>
                              handleScoreChange(siswa.id, mapel.id, 'sts', 'Kuis/STS', e.target.value)
                            }
                            placeholder="-"
                            className="w-14 text-center bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg py-1 font-mono text-xs font-bold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </td>

                        {/* Kolom 5: Rata-Rata Nilai */}
                        <td className="px-4 py-2.5 text-center bg-emerald-50/40 dark:bg-emerald-950/20 font-mono font-black text-sm">
                          <span
                            className={
                              rowAvg >= 75
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : rowAvg > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-400'
                            }
                          >
                            {rowAvg > 0 ? rowAvg : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
