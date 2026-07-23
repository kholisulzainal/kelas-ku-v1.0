import {
  ProfilSekolah,
  Guru,
  Siswa,
  OrangTua,
  MataPelajaran,
  JadwalPelajaran,
  Absensi,
  DaftarTugas,
  TugasSiswa,
  Asesmen,
  TemuanKhusus,
  Notifikasi,
  UserRole
} from '../types';
import { syncRowToSupabase, deleteRowFromSupabase } from './supabase';

// Default initial mock data - NO default sample address text
const defaultProfilSekolah: ProfilSekolah = {
  id: 'sch-001',
  namaSekolah: 'SD NEGERI KITA',
  npsn: '',
  alamat: '',
  akreditasi: 'A',
  kepalaSekolah: '',
  nipKepalaSekolah: '',
  logoUrl: '',
  tahunPelajaran: '2025/2026',
  jalan: '',
  rtRw: '',
  dusun: '',
  desa: '',
  kecamatan: '',
  kabupaten: '',
  provinsi: '',
  kodePos: ''
};

const defaultGuru: Guru[] = [];

const defaultSiswa: Siswa[] = [];

const defaultOrangTua: OrangTua[] = [];

const defaultMataPelajaran: MataPelajaran[] = [];

const defaultJadwalPelajaran: JadwalPelajaran[] = [];

const defaultAbsensi: Absensi[] = [];

const defaultDaftarTugas: DaftarTugas[] = [];

const defaultTugasSiswa: TugasSiswa[] = [];

const defaultAsesmen: Asesmen[] = [];

const defaultTemuanKhusus: TemuanKhusus[] = [];

const defaultNotifikasi: Notifikasi[] = [];

// Database state initializer
const initDatabase = () => {
  // Purge old bulk sample data from localStorage if not already purged
  if (localStorage.getItem('bulk_sample_data_purged_v2') !== 'true') {
    localStorage.removeItem('guru');
    localStorage.removeItem('siswa');
    localStorage.removeItem('orang_tua');
    localStorage.removeItem('mata_pelajaran');
    localStorage.removeItem('jadwal_pelajaran');
    localStorage.removeItem('absensi');
    localStorage.removeItem('daftar_tugas');
    localStorage.removeItem('tugas_siswa');
    localStorage.removeItem('asesmen');
    localStorage.removeItem('temuan_khusus');
    localStorage.removeItem('notifikasi');
    localStorage.setItem('bulk_sample_data_purged_v2', 'true');
  }

  const storedProfile = localStorage.getItem('profil_sekolah');
  if (!storedProfile || storedProfile === '{}' || JSON.parse(storedProfile).namaSekolah === undefined) {
    localStorage.setItem('profil_sekolah', JSON.stringify(defaultProfilSekolah));
  } else {
    try {
      const parsed = JSON.parse(storedProfile);
      // Clean out legacy sample address text if present
      if (parsed.jalan === 'Jl. Pemuda No. 45' || parsed.alamat?.includes('Jl. Pemuda No. 45') || parsed.namaSekolah === 'SD Negeri Harapan Bangsa IA') {
        const cleanedProfile = {
          ...parsed,
          namaSekolah: parsed.namaSekolah === 'SD Negeri Harapan Bangsa IA' ? 'SD NEGERI KITA' : parsed.namaSekolah,
          alamat: parsed.alamat?.includes('Jl. Pemuda No. 45') ? '' : (parsed.alamat || ''),
          jalan: parsed.jalan === 'Jl. Pemuda No. 45' ? '' : (parsed.jalan || ''),
          rtRw: parsed.rtRw === 'RT 02/RW 05' ? '' : (parsed.rtRw || ''),
          dusun: parsed.dusun === 'Dusun Melati' ? '' : (parsed.dusun || ''),
          desa: parsed.desa === 'Desa Sukamaju' ? '' : (parsed.desa || ''),
          kecamatan: parsed.kecamatan === 'Sukamaju' ? '' : (parsed.kecamatan || ''),
          kabupaten: parsed.kabupaten === 'Kota Bandung' ? '' : (parsed.kabupaten || ''),
          provinsi: parsed.provinsi === 'Jawa Barat' ? '' : (parsed.provinsi || ''),
          kodePos: parsed.kodePos === '40123' ? '' : (parsed.kodePos || ''),
          kepalaSekolah: parsed.kepalaSekolah === 'Dr. H. Mulyadi, M.Pd.' ? '' : (parsed.kepalaSekolah || ''),
          nipKepalaSekolah: parsed.nipKepalaSekolah === '197408122001121003' ? '' : (parsed.nipKepalaSekolah || ''),
        };
        localStorage.setItem('profil_sekolah', JSON.stringify(cleanedProfile));
      }
    } catch (e) {
      // ignore
    }
  }

  // Purge legacy sample seed absensi
  const storedAbsensi = localStorage.getItem('absensi');
  if (storedAbsensi) {
    try {
      const parsedAbs = JSON.parse(storedAbsensi);
      if (Array.isArray(parsedAbs)) {
        const filteredAbs = parsedAbs.filter((a: any) => !a.id?.startsWith('absen-seed-'));
        if (filteredAbs.length !== parsedAbs.length) {
          localStorage.setItem('absensi', JSON.stringify(filteredAbs));
        }
      }
    } catch (e) {
      // ignore
    }
  }
  if (!localStorage.getItem('guru')) {
    localStorage.setItem('guru', JSON.stringify(defaultGuru));
  }
  if (!localStorage.getItem('siswa')) {
    localStorage.setItem('siswa', JSON.stringify(defaultSiswa));
  }
  if (!localStorage.getItem('orang_tua')) {
    localStorage.setItem('orang_tua', JSON.stringify(defaultOrangTua));
  }
  if (!localStorage.getItem('mata_pelajaran')) {
    localStorage.setItem('mata_pelajaran', JSON.stringify(defaultMataPelajaran));
  }
  if (!localStorage.getItem('jadwal_pelajaran')) {
    localStorage.setItem('jadwal_pelajaran', JSON.stringify(defaultJadwalPelajaran));
  }
  if (!localStorage.getItem('absensi')) {
    localStorage.setItem('absensi', JSON.stringify(defaultAbsensi));
  }
  if (!localStorage.getItem('daftar_tugas')) {
    localStorage.setItem('daftar_tugas', JSON.stringify(defaultDaftarTugas));
  }
  if (!localStorage.getItem('tugas_siswa')) {
    localStorage.setItem('tugas_siswa', JSON.stringify(defaultTugasSiswa));
  }
  if (!localStorage.getItem('asesmen')) {
    localStorage.setItem('asesmen', JSON.stringify(defaultAsesmen));
  }
  if (!localStorage.getItem('temuan_khusus')) {
    localStorage.setItem('temuan_khusus', JSON.stringify(defaultTemuanKhusus));
  }
  if (!localStorage.getItem('notifikasi')) {
    localStorage.setItem('notifikasi', JSON.stringify(defaultNotifikasi));
  }
  if (!localStorage.getItem('current_user_role')) {
    localStorage.setItem('current_user_role', 'operator');
  }
  if (!localStorage.getItem('current_user_id')) {
    localStorage.setItem('current_user_id', 'operator-id'); 
  }
  if (!localStorage.getItem('is_logged_in')) {
    localStorage.setItem('is_logged_in', 'false'); // require login by default
  }
};

initDatabase();

export const db = {
  // Utility to clear / reset database
  resetToDefault: () => {
    localStorage.removeItem('profil_sekolah');
    localStorage.removeItem('guru');
    localStorage.removeItem('siswa');
    localStorage.removeItem('orang_tua');
    localStorage.removeItem('mata_pelajaran');
    localStorage.removeItem('jadwal_pelajaran');
    localStorage.removeItem('absensi');
    localStorage.removeItem('daftar_tugas');
    localStorage.removeItem('tugas_siswa');
    localStorage.removeItem('asesmen');
    localStorage.removeItem('temuan_khusus');
    localStorage.removeItem('notifikasi');
    localStorage.removeItem('daftar_kelas');
    initDatabase();
    window.location.reload();
  },

  // Active User / Role Simulation API
  getCurrentUser: () => {
    const role = localStorage.getItem('current_user_role') as UserRole || 'guru';
    const id = localStorage.getItem('current_user_id') || 'guru-1';
    const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
    let name = 'Kholisul Zainal Asfan Sholikh, S.Pd.';
    let detailId = id;

    if (role === 'operator') {
      name = 'Staf Operator Sekolah';
    } else if (role === 'guru') {
      const g = db.guru.getAll().find(item => item.id === id);
      name = g ? g.namaGuru : 'Guru';
    } else if (role === 'siswa') {
      const s = db.siswa.getAll().find(item => item.id === id);
      name = s ? s.namaSiswa : 'Siswa';
    } else if (role === 'orang_tua') {
      const o = db.orangTua.getAll().find(item => item.id === id);
      name = o ? o.namaOrtu : 'Orang Tua';
    }

    return { role, id, name, detailId, isLoggedIn };
  },

  isLoggedIn: () => {
    return localStorage.getItem('is_logged_in') === 'true';
  },

  logout: () => {
    localStorage.setItem('is_logged_in', 'false');
  },

  login: (role: UserRole, id: string) => {
    localStorage.setItem('is_logged_in', 'true');
    db.setCurrentUser(role, id);
  },

  setCurrentUser: (role: UserRole, id: string) => {
    localStorage.setItem('current_user_role', role);
    localStorage.setItem('current_user_id', id);
  },

  operatorCredentials: {
    get: () => {
      const u = localStorage.getItem('operator_username') || 'operator';
      const p = localStorage.getItem('operator_password') || 'operator123';
      return { username: u, password: p };
    },
    update: (username: string, password?: string) => {
      localStorage.setItem('operator_username', username.trim().toLowerCase());
      if (password) {
        localStorage.setItem('operator_password', password.trim());
      }
    }
  },

  // 1. Profil Sekolah
  profilSekolah: {
    get: (): ProfilSekolah => {
      const data = localStorage.getItem('profil_sekolah');
      if (!data) return defaultProfilSekolah;
      try {
        const parsed = JSON.parse(data);
        return {
          id: parsed.id || 'sch-001',
          namaSekolah: parsed.namaSekolah !== undefined ? parsed.namaSekolah : 'SD NEGERI KITA',
          npsn: parsed.npsn || '',
          alamat: parsed.alamat || '',
          akreditasi: parsed.akreditasi || 'A',
          kepalaSekolah: parsed.kepalaSekolah || '',
          nipKepalaSekolah: parsed.nipKepalaSekolah || '',
          logoUrl: parsed.logoUrl || '',
          tahunPelajaran: parsed.tahunPelajaran || '2025/2026',
          jalan: parsed.jalan || '',
          rtRw: parsed.rtRw || '',
          dusun: parsed.dusun || '',
          desa: parsed.desa || '',
          kecamatan: parsed.kecamatan || '',
          kabupaten: parsed.kabupaten || '',
          provinsi: parsed.provinsi || '',
          kodePos: parsed.kodePos || ''
        };
      } catch (e) {
        return defaultProfilSekolah;
      }
    },
    update: (updated: ProfilSekolah) => {
      localStorage.setItem('profil_sekolah', JSON.stringify(updated));
      syncRowToSupabase('profil_sekolah', updated);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'profil_sekolah' } }));
    }
  },

  // 2. Guru
  guru: {
    getAll: (): Guru[] => {
      const data = localStorage.getItem('guru');
      return data ? JSON.parse(data) : [];
    },
    save: (items: Guru[]) => {
      localStorage.setItem('guru', JSON.stringify(items));
      if (Array.isArray(items)) items.forEach(item => syncRowToSupabase('guru', item));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'guru' } }));
    },
    upsert: (item: Guru) => {
      const list = db.guru.getAll();
      const finalItem = { ...item, id: item.id || `guru-${Date.now()}` };
      const idx = list.findIndex(g => g.id === finalItem.id);
      if (idx > -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
      db.guru.save(list);
      syncRowToSupabase('guru', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'guru' } }));
    },
    delete: (id: string) => {
      const list = db.guru.getAll().filter(g => g.id !== id);
      db.guru.save(list);
      deleteRowFromSupabase('guru', id);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'guru' } }));
    }
  },

  // 3. Siswa
  siswa: {
    getAll: (): Siswa[] => {
      const data = localStorage.getItem('siswa');
      const list: Siswa[] = data ? JSON.parse(data) : [];
      return list.sort((a, b) => a.namaSiswa.localeCompare(b.namaSiswa));
    },
    save: (items: Siswa[]) => {
      localStorage.setItem('siswa', JSON.stringify(items));
      if (Array.isArray(items)) items.forEach(item => syncRowToSupabase('siswa', item));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'siswa' } }));
    },
    upsert: (item: Siswa) => {
      const list = db.siswa.getAll();
      const finalItem = { ...item, id: item.id || `siswa-${Date.now()}` };
      const idx = list.findIndex(s => s.id === finalItem.id);
      if (idx > -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
      db.siswa.save(list);
      syncRowToSupabase('siswa', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'siswa' } }));
    },
    delete: (id: string) => {
      const list = db.siswa.getAll().filter(s => s.id !== id);
      db.siswa.save(list);
      deleteRowFromSupabase('siswa', id);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'siswa' } }));
    }
  },

  // 4. Orang Tua
  orangTua: {
    getAll: (): OrangTua[] => {
      const data = localStorage.getItem('orang_tua');
      return data ? JSON.parse(data) : [];
    },
    save: (items: OrangTua[]) => {
      localStorage.setItem('orang_tua', JSON.stringify(items));
      if (Array.isArray(items)) items.forEach(item => syncRowToSupabase('orang_tua', item));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'orang_tua' } }));
    },
    upsert: (item: OrangTua) => {
      const list = db.orangTua.getAll();
      const finalItem = { ...item, id: item.id || `ortu-${Date.now()}` };
      const idx = list.findIndex(o => o.id === finalItem.id);
      if (idx > -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
      db.orangTua.save(list);
      syncRowToSupabase('orang_tua', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'orang_tua' } }));
    },
    delete: (id: string) => {
      const list = db.orangTua.getAll().filter(o => o.id !== id);
      db.orangTua.save(list);
      deleteRowFromSupabase('orang_tua', id);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'orang_tua' } }));
    }
  },

  // 5. Mata Pelajaran
  mataPelajaran: {
    getAll: (): MataPelajaran[] => {
      const data = localStorage.getItem('mata_pelajaran');
      const list: MataPelajaran[] = data ? JSON.parse(data) : [];
      return list.sort((a, b) => a.namaMapel.localeCompare(b.namaMapel));
    },
    save: (items: MataPelajaran[]) => {
      localStorage.setItem('mata_pelajaran', JSON.stringify(items));
      if (Array.isArray(items)) items.forEach(item => syncRowToSupabase('mata_pelajaran', item));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'mata_pelajaran' } }));
    },
    upsert: (item: MataPelajaran) => {
      const list = db.mataPelajaran.getAll();
      const finalItem = { ...item, id: item.id || `mapel-${Date.now()}` };
      const idx = list.findIndex(m => m.id === finalItem.id);
      if (idx > -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
      db.mataPelajaran.save(list);
      syncRowToSupabase('mata_pelajaran', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'mata_pelajaran' } }));
    },
    delete: (id: string) => {
      const list = db.mataPelajaran.getAll().filter(m => m.id !== id);
      db.mataPelajaran.save(list);
      deleteRowFromSupabase('mata_pelajaran', id);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'mata_pelajaran' } }));
    }
  },

  // 6. Jadwal Pelajaran
  jadwalPelajaran: {
    getAll: (): JadwalPelajaran[] => {
      const data = localStorage.getItem('jadwal_pelajaran');
      return data ? JSON.parse(data) : [];
    },
    save: (items: JadwalPelajaran[]) => {
      localStorage.setItem('jadwal_pelajaran', JSON.stringify(items));
      if (Array.isArray(items)) items.forEach(item => syncRowToSupabase('jadwal_pelajaran', item));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'jadwal_pelajaran' } }));
    },
    upsert: (item: JadwalPelajaran) => {
      const list = db.jadwalPelajaran.getAll();
      const finalItem = { ...item, id: item.id || `jadwal-${Date.now()}` };
      const idx = list.findIndex(j => j.id === finalItem.id);
      if (idx > -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
      db.jadwalPelajaran.save(list);
      syncRowToSupabase('jadwal_pelajaran', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'jadwal_pelajaran' } }));
    },
    delete: (id: string) => {
      const list = db.jadwalPelajaran.getAll().filter(j => j.id !== id);
      db.jadwalPelajaran.save(list);
      deleteRowFromSupabase('jadwal_pelajaran', id);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'jadwal_pelajaran' } }));
    }
  },

  // 7. Absensi
  absensi: {
    getAll: (): Absensi[] => {
      const data = localStorage.getItem('absensi');
      return data ? JSON.parse(data) : [];
    },
    save: (items: Absensi[]) => {
      localStorage.setItem('absensi', JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'absensi' } }));
    },
    bulkUpsert: (items: Absensi[]) => {
      const list = db.absensi.getAll();
      const syncedItems: Absensi[] = [];
      items.forEach(item => {
        const idx = list.findIndex(a => a.siswaId === item.siswaId && a.tanggal === item.tanggal);
        const finalItem = { ...item, id: item.id || (idx > -1 ? list[idx].id : `abs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`) };
        if (idx > -1) {
          list[idx] = { ...list[idx], ...finalItem };
        } else {
          list.push(finalItem);
        }
        syncedItems.push(list[idx > -1 ? idx : list.length - 1]);
      });
      db.absensi.save(list);
      syncedItems.forEach(item => syncRowToSupabase('absensi', item));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'absensi' } }));
    },
    upsert: (item: Absensi) => {
      const list = db.absensi.getAll();
      const idx = list.findIndex(a => a.id === item.id || (a.siswaId === item.siswaId && a.tanggal === item.tanggal));
      const finalItem = { ...item, id: item.id || (idx > -1 ? list[idx].id : `abs-${Date.now()}`) };
      if (idx > -1) {
        list[idx] = { ...list[idx], ...finalItem };
      } else {
        list.push(finalItem);
      }
      db.absensi.save(list);
      syncRowToSupabase('absensi', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'absensi' } }));
    },
    clearAll: () => {
      const existing = db.absensi.getAll();
      existing.forEach(item => {
        deleteRowFromSupabase('absensi', item.id);
      });
      localStorage.setItem('absensi', '[]');
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'absensi' } }));
    }
  },

  // 8. Daftar Tugas
  daftarTugas: {
    getAll: (): DaftarTugas[] => {
      const data = localStorage.getItem('daftar_tugas');
      return data ? JSON.parse(data) : [];
    },
    save: (items: DaftarTugas[]) => {
      localStorage.setItem('daftar_tugas', JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'daftar_tugas' } }));
    },
    upsert: (item: DaftarTugas) => {
      const list = db.daftarTugas.getAll();
      const isNew = !item.id;
      const finalItem = { ...item, id: item.id || `tugas-${Date.now()}` };

      const idx = list.findIndex(t => t.id === finalItem.id);
      if (idx > -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
      db.daftarTugas.save(list);
      syncRowToSupabase('daftar_tugas', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'daftar_tugas' } }));

      // If new, automatically create tugas_siswa rows for all students (status: false)
      if (isNew) {
        const students = db.siswa.getAll();
        students.forEach(std => {
          db.tugasSiswa.upsert({
            id: `ts-${finalItem.id}-${std.id}`,
            tugasId: finalItem.id,
            siswaId: std.id,
            statusPengerjaan: false
          });
        });

        // Trigger notifications to Students and Parents
        const mapel = db.mataPelajaran.getAll().find(m => m.id === finalItem.mapelId);
        const mapelName = mapel ? mapel.namaMapel : 'Mata Pelajaran';

        // Student Notification
        db.notifikasi.add({
          penerimaRole: 'siswa',
          judul: `Tugas Baru: ${finalItem.judulTugas}`,
          pesan: `Tugas baru untuk mata pelajaran ${mapelName} telah diberikan. Klik untuk mengerjakan menggunakan Google Form!`,
          tugasId: finalItem.id
        });

        // Parent Notification
        db.notifikasi.add({
          penerimaRole: 'orang_tua',
          judul: `Tugas Baru bagi Siswa`,
          pesan: `Siswa mendapat tugas baru "${finalItem.judulTugas}" (${mapelName}). Silakan awasi penyelesaiannya.`,
          tugasId: finalItem.id
        });
      }
    },
    delete: (id: string) => {
      const list = db.daftarTugas.getAll().filter(t => t.id !== id);
      db.daftarTugas.save(list);
      // Clean up child task states
      const childList = db.tugasSiswa.getAll().filter(ts => ts.tugasId !== id);
      db.tugasSiswa.save(childList);
      deleteRowFromSupabase('daftar_tugas', id);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'daftar_tugas' } }));
    }
  },

  // 9. Tugas Siswa (Pengerjaan individual)
  tugasSiswa: {
    getAll: (): TugasSiswa[] => {
      const data = localStorage.getItem('tugas_siswa');
      return data ? JSON.parse(data) : [];
    },
    save: (items: TugasSiswa[]) => {
      localStorage.setItem('tugas_siswa', JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'tugas_siswa' } }));
    },
    upsert: (item: TugasSiswa) => {
      const list = db.tugasSiswa.getAll();
      const finalItem = { ...item, id: item.id || `ts-${Date.now()}` };
      const idx = list.findIndex(ts => ts.id === finalItem.id || (ts.tugasId === finalItem.tugasId && ts.siswaId === finalItem.siswaId));
      if (idx > -1) {
        list[idx] = { ...list[idx], ...finalItem };
      } else {
        list.push(finalItem);
      }
      db.tugasSiswa.save(list);
      syncRowToSupabase('tugas_siswa', list[idx > -1 ? idx : list.length - 1]);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'tugas_siswa' } }));
    },
    // Simulate Automatic Grading and submit from student
    submitTask: (tugasId: string, siswaId: string) => {
      const list = db.tugasSiswa.getAll();
      const idx = list.findIndex(ts => ts.tugasId === tugasId && ts.siswaId === siswaId);
      const student = db.siswa.getAll().find(s => s.id === siswaId);
      const parent = db.orangTua.getAll().find(p => p.siswaId === siswaId);
      const task = db.daftarTugas.getAll().find(t => t.id === tugasId);

      // Generate a realistic score automatically (e.g. 75 to 100)
      const autoScore = Math.floor(Math.random() * 26) + 75; 
      const feedBacks = [
        'Sangat teliti dan tulisan rapi.',
        'Penyelesaian soal runtut dan logis.',
        'Sangat kreatif dalam menjawab pertanyaan.',
        'Bagus sekali, terus pertahankan nilai hebatmu!',
        'Konsep dipahami dengan sempurna.'
      ];
      const feedback = feedBacks[Math.floor(Math.random() * feedBacks.length)];

      const submitted: TugasSiswa = {
        id: idx > -1 ? list[idx].id : `ts-${tugasId}-${siswaId}`,
        tugasId,
        siswaId,
        statusPengerjaan: true,
        tanggalDikerjakan: new Date().toISOString(),
        nilai: autoScore,
        umpanBalik: feedback
      };

      if (idx > -1) {
        list[idx] = submitted;
      } else {
        list.push(submitted);
      }
      db.tugasSiswa.save(list);
      syncRowToSupabase('tugas_siswa', submitted);

      // Save into formal Asesmen (harian) as well!
      if (task) {
        db.asesmen.upsert({
          id: `as-auto-${tugasId}-${siswaId}`,
          siswaId,
          mapelId: task.mapelId,
          tipe: 'harian',
          namaPenilaian: `Tugas: ${task.judulTugas}`,
          nilai: autoScore,
          deskripsiKompetensi: `Siswa dapat menyelesaikan tugas "${task.judulTugas}" dengan baik. ${feedback}`,
          tanggalPenilaian: new Date().toISOString().split('T')[0]
        });
      }

      // Add parent notification
      if (student && parent && task) {
        db.notifikasi.add({
          penerimaRole: 'orang_tua',
          penerimaUserId: parent.id,
          judul: `Ananda Selesai Mengerjakan Tugas`,
          pesan: `${student.namaSiswa} telah menyelesaikan tugas "${task.judulTugas}". Nilai otomatis diperoleh: ${autoScore}.`,
          tugasId: task.id
        });
      }

      // Fire global update events to sync across all dashboards
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'tugas_siswa' } }));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'asesmen' } }));
    }
  },

  // 10. Asesmen Kurikulum Merdeka
  asesmen: {
    getAll: (): Asesmen[] => {
      const data = localStorage.getItem('asesmen');
      return data ? JSON.parse(data) : [];
    },
    save: (items: Asesmen[]) => {
      localStorage.setItem('asesmen', JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'asesmen' } }));
    },
    upsert: (item: Asesmen) => {
      const list = db.asesmen.getAll();
      const finalItem = { ...item, id: item.id || `as-${Date.now()}` };
      const idx = list.findIndex(a => a.id === finalItem.id);
      if (idx > -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
      db.asesmen.save(list);
      syncRowToSupabase('asesmen', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'asesmen' } }));
    },
    delete: (id: string) => {
      const list = db.asesmen.getAll().filter(a => a.id !== id);
      db.asesmen.save(list);
      deleteRowFromSupabase('asesmen', id);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'asesmen' } }));
    }
  },

  // 11. Temuan Khusus
  temuanKhusus: {
    getAll: (): TemuanKhusus[] => {
      const data = localStorage.getItem('temuan_khusus');
      return data ? JSON.parse(data) : [];
    },
    save: (items: TemuanKhusus[]) => {
      localStorage.setItem('temuan_khusus', JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'temuan_khusus' } }));
    },
    upsert: (item: TemuanKhusus) => {
      const list = db.temuanKhusus.getAll();
      const finalItem = { ...item, id: item.id || `tk-${Date.now()}` };
      const idx = list.findIndex(t => t.id === finalItem.id);
      if (idx > -1) {
        list[idx] = finalItem;
      } else {
        list.push(finalItem);
      }
      db.temuanKhusus.save(list);
      syncRowToSupabase('temuan_khusus', finalItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'temuan_khusus' } }));
    },
    delete: (id: string) => {
      const list = db.temuanKhusus.getAll().filter(t => t.id !== id);
      db.temuanKhusus.save(list);
      deleteRowFromSupabase('temuan_khusus', id);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'temuan_khusus' } }));
    }
  },

  // 12. Notifikasi
  notifikasi: {
    getAll: (): Notifikasi[] => {
      const data = localStorage.getItem('notifikasi');
      return data ? JSON.parse(data) : [];
    },
    save: (items: Notifikasi[]) => {
      localStorage.setItem('notifikasi', JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'notifikasi' } }));
    },
    add: (item: Omit<Notifikasi, 'id' | 'tanggal' | 'dibaca'>) => {
      const list = db.notifikasi.getAll();
      const newItem: Notifikasi = {
        ...item,
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tanggal: new Date().toISOString().split('T')[0],
        dibaca: false
      };
      list.unshift(newItem); // Newest first
      db.notifikasi.save(list);
      syncRowToSupabase('notifikasi', newItem);
      window.dispatchEvent(new CustomEvent('supabase-data-updated', { detail: { tableName: 'notifikasi' } }));
    },
    markAsRead: (id: string) => {
      const list = db.notifikasi.getAll();
      const idx = list.findIndex(n => n.id === id);
      if (idx > -1) {
        list[idx].dibaca = true;
        db.notifikasi.save(list);
      }
    },
    markAllAsRead: (role: UserRole) => {
      const list = db.notifikasi.getAll();
      const updated = list.map(n => n.penerimaRole === role ? { ...n, dibaca: true } : n);
      db.notifikasi.save(updated);
    }
  },

  // Simulating image upload by converting to local base64 / using standard Unsplash avatars
  uploadPhoto: async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }
};
