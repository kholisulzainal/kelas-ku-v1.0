import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Define configuration storage keys
const URL_KEY = 'supabase_project_url';
const ANON_KEY = 'supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  let url = localStorage.getItem(URL_KEY) || '';
  let anonKey = localStorage.getItem(ANON_KEY) || '';

  // Fallback to environment variables if localStorage is empty
  if (!url) {
    const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 
                   ((import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL as string) || 
                   (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.NEXT_PUBLIC_SUPABASE_URL)) || '';
    const envAppUrl = ((import.meta as any).env?.APP_URL as string) || (typeof process !== 'undefined' && process.env?.APP_URL) || '';
    if (envUrl) {
      url = envUrl;
    } else if (envAppUrl && envAppUrl.includes('supabase.co')) {
      url = envAppUrl;
    }
  }

  if (url) {
    url = url.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
  }

  if (!anonKey) {
    const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 
                   ((import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string) || 
                   ((import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || 
                   (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) || '';
    const envGeminiKey = ((import.meta as any).env?.GEMINI_API_KEY as string) || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
    if (envKey) {
      anonKey = envKey;
    } else if (envGeminiKey && envGeminiKey.startsWith('eyJ')) {
      anonKey = envGeminiKey;
    }
  }

  return {
    url: url.trim(),
    anonKey: anonKey.trim()
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  const oldUrl = localStorage.getItem(URL_KEY) || '';
  const oldKey = localStorage.getItem(ANON_KEY) || '';

  let formattedUrl = (config.url || '').trim();
  if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  if (formattedUrl) localStorage.setItem(URL_KEY, formattedUrl);
  else localStorage.removeItem(URL_KEY);

  if (config.anonKey) localStorage.setItem(ANON_KEY, config.anonKey.trim());
  else localStorage.removeItem(ANON_KEY);

  // If the credentials changed, reset the delta sync cache to force a full initial sync
  if (oldUrl.trim() !== formattedUrl || oldKey.trim() !== (config.anonKey || '').trim()) {
    console.log('[Delta Sync] Supabase configuration changed. Clearing delta sync cache.');
    localStorage.removeItem('_supabase_sync_hashes');
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseConfig();
  if (url && anonKey) {
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const parsed = new URL(formattedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      supabaseInstance = createClient(formattedUrl, anonKey, {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`
          }
        }
      });
      return supabaseInstance;
    } catch (e) {
      console.warn('[Supabase] Client initialization skipped due to invalid URL or credentials:', e);
      return null;
    }
  }
  return null;
}

export function resetSupabaseInstance() {
  supabaseInstance = null;
}

// SQL Script generator for the user to copy-paste into Supabase SQL Editor
export const MIGRATION_SQL = `-- SCRIPT INI DI-GENERATE OTOMATIS UNTUK MEMBUAT SCHEMA DATABASE KURIKULUM MERDEKA DI SUPABASE.
-- Copy script ini, buka Dashboard Supabase -> SQL Editor -> klik "New query" -> Paste & Run!

-- 1. Tabel Profil Sekolah
create table if not exists public.profil_sekolah (
  id text primary key,
  nama_sekolah text not null,
  npsn text,
  alamat text,
  akreditasi text,
  kepala_sekolah text,
  nip_kepala_sekolah text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabel Guru
create table if not exists public.guru (
  id text primary key,
  nip text unique not null,
  nama_guru text not null,
  gelar text,
  mata_pelajaran_utama text,
  foto_url text,
  status_kepegawaian text,
  password text not null default 'guru123',
  is_wali_kelas boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabel Siswa
create table if not exists public.siswa (
  id text primary key,
  nisn text unique not null,
  nis text,
  nama_siswa text not null,
  jenis_kelamin text,
  kelas text not null default 'Kelas IV-A',
  alamat text,
  foto_url text,
  nama_ayah text,
  nama_ibu text,
  no_telepon_ortu text,
  password text not null default 'siswa123',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabel Orang Tua
create table if not exists public.orang_tua (
  id text primary key,
  nama_ortu text not null,
  siswa_id text references public.siswa(id) on delete cascade,
  hubungan text,
  no_telepon text,
  password text not null default 'ortu123',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabel Mata Pelajaran
create table if not exists public.mata_pelajaran (
  id text primary key,
  kode_mapel text unique not null,
  nama_mapel text not null,
  kkm integer not null default 75,
  guru_pengampu_id text references public.guru(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabel Jadwal Pelajaran
create table if not exists public.jadwal_pelajaran (
  id text primary key,
  mapel_id text references public.mata_pelajaran(id) on delete cascade,
  hari text not null,
  jam_mulai text not null,
  jam_selesai text not null,
  ruangan text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Tabel Absensi
create table if not exists public.absensi (
  id text primary key,
  siswa_id text references public.siswa(id) on delete cascade,
  tanggal text not null,
  status text not null,
  keterangan text,
  dicatat_oleh_id text references public.guru(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Tabel Daftar Tugas
create table if not exists public.daftar_tugas (
  id text primary key,
  mapel_id text references public.mata_pelajaran(id) on delete cascade,
  judul_tugas text not null,
  deskripsi text,
  google_form_url text not null,
  tanggal_diberikan text not null,
  tenggat_waktu text,
  dibuat_oleh_id text references public.guru(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Tabel Tugas Siswa
create table if not exists public.tugas_siswa (
  id text primary key,
  tugas_id text references public.daftar_tugas(id) on delete cascade,
  siswa_id text references public.siswa(id) on delete cascade,
  status_pengerjaan boolean default false,
  tanggal_dikerjakan text,
  nilai integer,
  umpan_balik text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Tabel Asesmen (Nilai Utama)
create table if not exists public.asesmen (
  id text primary key,
  siswa_id text references public.siswa(id) on delete cascade,
  mapel_id text references public.mata_pelajaran(id) on delete cascade,
  tipe text not null,
  nama_penilaian text not null,
  nilai integer not null,
  deskripsi_kompetensi text,
  tanggal_penilaian text not null,
  dinilai_oleh_id text references public.guru(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Tabel Temuan Khusus
create table if not exists public.temuan_khusus (
  id text primary key,
  siswa_id text references public.siswa(id) on delete cascade,
  tanggal text not null,
  kategori text not null,
  deskripsi text not null,
  tindakan_lanjut text,
  dilaporkan_oleh_id text references public.guru(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Tabel Notifikasi
create table if not exists public.notifikasi (
  id text primary key,
  penerima_role text not null,
  penerima_user_id text,
  judul text not null,
  pesan text not null,
  tanggal text not null,
  dibaca boolean default false,
  tugas_id text references public.daftar_tugas(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Izinkan akses publik (Row Level Security dinonaktifkan untuk mempermudah sinkronisasi awal)
alter table public.profil_sekolah disable row level security;
alter table public.guru disable row level security;
alter table public.siswa disable row level security;
alter table public.orang_tua disable row level security;
alter table public.mata_pelajaran disable row level security;
alter table public.jadwal_pelajaran disable row level security;
alter table public.absensi disable row level security;
alter table public.daftar_tugas disable row level security;
alter table public.tugas_siswa disable row level security;
alter table public.asesmen disable row level security;
alter table public.temuan_khusus disable row level security;
alter table public.notifikasi disable row level security;

-- JIKA TABEL SUDAH DIBUAT SEBELUMNYA DAN ANDA MENGALAMI ERROR:
-- Jalankan perintah di bawah ini untuk menambahkan kolom yang kurang dan menonaktifkan Row Level Security secara paksa tanpa menghapus data yang ada!
alter table public.profil_sekolah add column if not exists logo_url text;
alter table public.profil_sekolah add column if not exists tahun_pelajaran text;
alter table public.profil_sekolah add column if not exists jalan text;
alter table public.profil_sekolah add column if not exists rt_rw text;
alter table public.profil_sekolah add column if not exists dusun text;
alter table public.profil_sekolah add column if not exists desa text;
alter table public.profil_sekolah add column if not exists kecamatan text;
alter table public.profil_sekolah add column if not exists kabupaten text;
alter table public.profil_sekolah add column if not exists provinsi text;
alter table public.profil_sekolah add column if not exists kode_pos text;
alter table public.guru add column if not exists foto_url text;
alter table public.guru add column if not exists gelar text;
alter table public.guru add column if not exists status_kepegawaian text;
alter table public.guru add column if not exists mata_pelajaran_utama text;
alter table public.guru add column if not exists is_wali_kelas boolean default false;
alter table public.siswa add column if not exists nis text;
alter table public.siswa add column if not exists foto_url text;
alter table public.orang_tua add column if not exists hubungan text;

-- Nonaktifkan Row Level Security (RLS) & Berikan Izin Akses Penuh
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

alter table public.profil_sekolah disable row level security;
alter table public.guru disable row level security;
alter table public.siswa disable row level security;
alter table public.orang_tua disable row level security;
alter table public.mata_pelajaran disable row level security;
alter table public.jadwal_pelajaran disable row level security;
alter table public.absensi disable row level security;
alter table public.daftar_tugas disable row level security;
alter table public.tugas_siswa disable row level security;
alter table public.asesmen disable row level security;
alter table public.temuan_khusus disable row level security;
alter table public.notifikasi disable row level security;

-- Buat Kebijakan Akses Publik (RLS Open Policy) sebagai jaminan jika RLS diaktifkan kembali
do $$
declare
  t text;
begin
  for t in select unnest(array['profil_sekolah','guru','siswa','orang_tua','mata_pelajaran','jadwal_pelajaran','absensi','daftar_tugas','tugas_siswa','asesmen','temuan_khusus','notifikasi'])
  loop
    execute format('drop policy if exists "Allow public access" on public.%I', t);
    execute format('create policy "Allow public access" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Bersihkan cache schema Supabase (PostgREST) secara paksa agar langsung mendeteksi kolom baru
notify pgrst, 'reload schema';
`;

const VALID_COLUMNS: { [key: string]: string[] } = {
  profil_sekolah: [
    'id', 'nama_sekolah', 'npsn', 'alamat', 'akreditasi', 'kepala_sekolah', 'nip_kepala_sekolah', 'logo_url', 'daftar_kelas',
    'tahun_pelajaran', 'jalan', 'rt_rw', 'dusun', 'desa', 'kecamatan', 'kabupaten', 'provinsi', 'kode_pos'
  ],
  guru: ['id', 'nip', 'nama_guru', 'gelar', 'mata_pelajaran_utama', 'foto_url', 'status_kepegawaian', 'password', 'is_wali_kelas', 'kelas_wali', 'google_email'],
  siswa: ['id', 'nisn', 'nis', 'nama_siswa', 'jenis_kelamin', 'kelas', 'alamat', 'foto_url', 'nama_ayah', 'nama_ibu', 'no_telepon_ortu', 'password'],
  orang_tua: ['id', 'nama_ortu', 'siswa_id', 'hubungan', 'no_telepon', 'password'],
  mata_pelajaran: ['id', 'kode_mapel', 'nama_mapel', 'kkm', 'guru_pengampu_id', 'kelas'],
  jadwal_pelajaran: ['id', 'mapel_id', 'hari', 'jam_mulai', 'jam_selesai', 'ruangan', 'kelas'],
  absensi: ['id', 'siswa_id', 'tanggal', 'status', 'keterangan', 'dicatat_oleh_id'],
  daftar_tugas: ['id', 'mapel_id', 'judul_tugas', 'deskripsi', 'google_form_url', 'tanggal_diberikan', 'tenggat_waktu', 'dibuat_oleh_id', 'kelas'],
  tugas_siswa: ['id', 'tugas_id', 'siswa_id', 'status_pengerjaan', 'tanggal_dikerjakan', 'nilai', 'umpan_balik'],
  asesmen: ['id', 'siswa_id', 'mapel_id', 'tipe', 'nama_penilaian', 'nilai', 'deskripsi_kompetensi', 'tanggal_penilaian', 'dinilai_oleh_id', 'kelas'],
  temuan_khusus: ['id', 'siswa_id', 'tanggal', 'kategori', 'deskripsi', 'tindakan_lanjut', 'dilaporkan_oleh_id', 'kelas'],
  notifikasi: ['id', 'penerima_role', 'penerima_user_id', 'judul', 'pesan', 'tanggal', 'dibaca', 'tugas_id']
};

const DEFAULT_SISWA_NISNS: { [id: string]: string } = {
  'siswa-1': '0123456781',
  'siswa-2': '0123456782',
  'siswa-3': '0123456783',
  'siswa-4': '0123456784',
  'siswa-5': '0123456785'
};

export function getCanonicalSiswaId(siswaId: string): string {
  const rawSiswa = localStorage.getItem('siswa');
  if (!rawSiswa) return siswaId;

  try {
    const siswas = JSON.parse(rawSiswa);
    if (!Array.isArray(siswas)) return siswaId;

    // 1. Determine the NISN for the requested siswaId
    let targetNisn = '';
    const foundSiswa = siswas.find(s => s.id === siswaId);
    if (foundSiswa && foundSiswa.nisn) {
      targetNisn = foundSiswa.nisn.trim();
    } else {
      // Fallback: Check if the ID is a default ID known to map to a default NISN
      const fallbackNisn = DEFAULT_SISWA_NISNS[siswaId];
      if (fallbackNisn) {
        targetNisn = fallbackNisn.trim();
      }
    }

    if (!targetNisn) return siswaId;

    // 2. Find all students in local storage sharing this NISN
    const matchingSiswas = siswas.filter(s => s.nisn && s.nisn.trim() === targetNisn);
    if (matchingSiswas.length === 0) {
      return siswaId;
    }

    // 3. Sort matching students to pick the canonical one
    // We prefer a short ID starting with 'siswa-' and length < 10 (e.g. 'siswa-1')
    const sortedSiswas = [...matchingSiswas].sort((a, b) => {
      const aIsDefault = a.id && a.id.startsWith('siswa-') && a.id.length < 10;
      const bIsDefault = b.id && b.id.startsWith('siswa-') && b.id.length < 10;
      if (aIsDefault && !bIsDefault) return -1;
      if (!aIsDefault && bIsDefault) return 1;
      return a.id.localeCompare(b.id);
    });

    return sortedSiswas[0].id;
  } catch (e) {
    console.error('Error in getCanonicalSiswaId:', e);
    return siswaId;
  }
}

interface DbCache {
  siswas: { id: string; nisn: string; nama_siswa: string }[];
  gurus: { id: string; nip: string; nama_guru: string }[];
  mapels: { id: string; kode_mapel: string; nama_mapel: string }[];
  tugases: { id: string; judul_tugas: string }[];
  lastFetch: number;
}

let dbCache: DbCache | null = null;

async function refreshDbCache(force = false): Promise<DbCache | null> {
  const now = Date.now();
  if (dbCache && !force && (now - dbCache.lastFetch < 10000)) {
    return dbCache;
  }

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [siswasRes, gurusRes, mapelsRes, tugasesRes] = await Promise.all([
      client.from('siswa').select('id, nisn, nama_siswa'),
      client.from('guru').select('id, nip, nama_guru'),
      client.from('mata_pelajaran').select('id, kode_mapel, nama_mapel'),
      client.from('daftar_tugas').select('id, judul_tugas')
    ]);

    if (
      siswasRes.error?.code === 'PGRST205' ||
      gurusRes.error?.code === 'PGRST205' ||
      mapelsRes.error?.code === 'PGRST205' ||
      tugasesRes.error?.code === 'PGRST205'
    ) {
      console.warn('[Supabase Sync] Database tables do not exist in Supabase yet. SQL schema migration is required.');
      return null;
    }

    dbCache = {
      siswas: (siswasRes.data || []) as any[],
      gurus: (gurusRes.data || []) as any[],
      mapels: (mapelsRes.data || []) as any[],
      tugases: (tugasesRes.data || []) as any[],
      lastFetch: Date.now()
    };
    return dbCache;
  } catch (e) {
    console.warn('[Supabase Sync] Could not refresh DB cache:', e);
    return null;
  }
}

// Resilient upsert that automatically retries if a column is missing from the database schema
async function resilientUpsert(tableName: string, rawData: any, client: any): Promise<{ error: any }> {
  const validCols = VALID_COLUMNS[tableName];
  let pgData = { ...rawData };
  if (validCols) {
    const filtered: any = {};
    for (const col of validCols) {
      if (pgData[col] !== undefined) {
        filtered[col] = pgData[col];
      }
    }
    pgData = filtered;
  }

  const MAX_RETRIES = 10;
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    attempts++;
    const { error } = await client.from(tableName).upsert(pgData);
    if (!error) {
      return { error: null };
    }

    // Stop immediately if table does not exist in schema cache
    if (error.code === 'PGRST205' || (error.message && error.message.includes('Could not find the table'))) {
      return { error };
    }

    // Handle PGRST204 (Missing column in schema cache)
    if (error.code === 'PGRST204' || (error.message && error.message.includes("Could not find the") && error.message.includes("column"))) {
      const match = error.message.match(/Could not find the '([^']+)' column/);
      if (match) {
        const missingCol = match[1];
        console.warn(`Resilient Sync [${tableName}]: Stripping missing column '${missingCol}' from payload and retrying.`);
        delete pgData[missingCol];
        
        // Update valid columns list to avoid future attempts
        if (VALID_COLUMNS[tableName]) {
          VALID_COLUMNS[tableName] = VALID_COLUMNS[tableName].filter(c => c !== missingCol);
        }
        continue;
      }
    }

    return { error };
  }

  return { error: { message: `Max retries exceeded while stripping missing columns for ${tableName}` } };
}

async function ensureGuruExists(guruId: string, localGurus: any[]): Promise<string> {
  const cache = await refreshDbCache();
  if (!cache) return guruId;

  if (cache.gurus.some(g => g.id === guruId)) {
    return guruId;
  }

  const localGuru = localGurus.find(g => g.id === guruId);
  const localNip = localGuru?.nip?.trim();
  const localName = localGuru?.namaGuru?.trim();

  if (localNip) {
    const matchByNip = cache.gurus.find(g => g.nip && g.nip.trim() === localNip);
    if (matchByNip) return matchByNip.id;
  }

  if (localName) {
    const matchByName = cache.gurus.find(g => g.nama_guru && g.nama_guru.trim().toLowerCase() === localName.toLowerCase());
    if (matchByName) return matchByName.id;
  }

  const client = getSupabaseClient();
  if (client) {
    const placeholderNip = localNip || `TEMP-GURU-${Date.now()}`;
    const placeholderName = localName || `Guru Terhapus (${guruId})`;
    
    console.log(`Inserting placeholder guru ${guruId} (${placeholderName}) into DB...`);
    const { error } = await resilientUpsert('guru', {
      id: guruId,
      nip: placeholderNip,
      nama_guru: placeholderName,
      gelar: localGuru?.gelar || '',
      mata_pelajaran_utama: localGuru?.mataPelajaranUtama || '',
      status_kepegawaian: localGuru?.statusKepegawaian || 'GTT',
      password: localGuru?.password || 'guru123',
      is_wali_kelas: localGuru?.isWaliKelas || false
    }, client);

    if (!error) {
      cache.gurus.push({ id: guruId, nip: placeholderNip, nama_guru: placeholderName });
      return guruId;
    }
  }

  return guruId;
}

async function ensureSiswaExists(siswaId: string, localSiswas: any[]): Promise<string> {
  const cache = await refreshDbCache();
  if (!cache) return siswaId;

  // 1. Check if siswaId exists in database
  if (cache.siswas.some(s => s.id === siswaId)) {
    return siswaId;
  }

  // 2. Find local student info
  const localSiswa = localSiswas.find(s => s.id === siswaId);
  const localNisn = localSiswa?.nisn?.trim();
  const localName = localSiswa?.namaSiswa?.trim();

  // 3. Try matching by NISN
  if (localNisn) {
    const matchByNisn = cache.siswas.find(s => s.nisn && s.nisn.trim() === localNisn);
    if (matchByNisn) {
      console.log(`Matched local siswa_id ${siswaId} to DB siswa_id ${matchByNisn.id} by NISN ${localNisn}`);
      return matchByNisn.id;
    }
  }

  // 4. Try matching by Name
  if (localName) {
    const matchByName = cache.siswas.find(s => s.nama_siswa && s.nama_siswa.trim().toLowerCase() === localName.toLowerCase());
    if (matchByName) {
      console.log(`Matched local siswa_id ${siswaId} to DB siswa_id ${matchByName.id} by Name "${localName}"`);
      return matchByName.id;
    }
  }

  // 5. If not found, dynamically insert a placeholder student record in the DB
  const client = getSupabaseClient();
  if (client) {
    const placeholderNisn = localNisn || `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const placeholderName = localName || `Siswa Terhapus (${siswaId})`;
    
    console.log(`Inserting placeholder student ${siswaId} (${placeholderName}) into DB...`);
    const { error } = await resilientUpsert('siswa', {
      id: siswaId,
      nisn: placeholderNisn,
      nama_siswa: placeholderName,
      kelas: localSiswa?.kelas || 'Kelas IV-A',
      jenis_kelamin: localSiswa?.jenisKelamin || 'L',
      alamat: localSiswa?.alamat || '',
      nama_ayah: localSiswa?.namaAyah || '',
      nama_ibu: localSiswa?.namaIbu || '',
      no_telepon_ortu: localSiswa?.noTeleponOrtu || '',
      password: localSiswa?.password || 'siswa123'
    }, client);

    if (!error) {
      cache.siswas.push({ id: siswaId, nisn: placeholderNisn, nama_siswa: placeholderName });
      return siswaId;
    } else {
      if (error.code === 'PGRST205' || (error.message && error.message.includes('Could not find the table'))) {
        console.warn(`[Supabase Sync] Skip inserting placeholder student ${siswaId}: table 'siswa' does not exist in Supabase yet.`);
      } else if (error.code === '42501' || (error.message && error.message.includes('row-level security policy'))) {
        console.warn(`[Supabase Sync] Skip inserting placeholder student ${siswaId}: RLS policy restriction on table 'siswa'.`);
      } else {
        console.warn(`[Supabase Sync] Skip inserting placeholder student ${siswaId}:`, error.message || error);
      }
    }
  }

  return siswaId;
}

async function ensureMapelExists(mapelId: string, localMapels: any[]): Promise<string> {
  const cache = await refreshDbCache();
  if (!cache) return mapelId;

  if (cache.mapels.some(m => m.id === mapelId)) {
    return mapelId;
  }

  const localMapel = localMapels.find(m => m.id === mapelId);
  const localKode = localMapel?.kodeMapel?.trim();
  const localName = localMapel?.namaMapel?.trim();

  if (localKode) {
    const matchByKode = cache.mapels.find(m => m.kode_mapel && m.kode_mapel.trim() === localKode);
    if (matchByKode) return matchByKode.id;
  }

  if (localName) {
    const matchByName = cache.mapels.find(m => m.nama_mapel && m.nama_mapel.trim().toLowerCase() === localName.toLowerCase());
    if (matchByName) return matchByName.id;
  }

  const client = getSupabaseClient();
  if (client) {
    const placeholderKode = localKode || `TEMP-MAPEL-${Date.now()}`;
    const placeholderName = localName || `Mapel Terhapus (${mapelId})`;
    
    const rawGuru = localStorage.getItem('guru');
    const localGurus = rawGuru ? JSON.parse(rawGuru) : [];
    let finalGuruId = localMapel?.guruPengampuId;
    if (finalGuruId) {
      finalGuruId = await ensureGuruExists(finalGuruId, localGurus);
    }

    console.log(`Inserting placeholder mapel ${mapelId} (${placeholderName}) into DB...`);
    const { error } = await resilientUpsert('mata_pelajaran', {
      id: mapelId,
      kode_mapel: placeholderKode,
      nama_mapel: placeholderName,
      kkm: localMapel?.kkm || 75,
      guru_pengampu_id: finalGuruId || null
    }, client);

    if (!error) {
      cache.mapels.push({ id: mapelId, kode_mapel: placeholderKode, nama_mapel: placeholderName });
      return mapelId;
    }
  }

  return mapelId;
}

async function ensureTugasExists(tugasId: string, localTugases: any[]): Promise<string> {
  const cache = await refreshDbCache();
  if (!cache) return tugasId;

  if (cache.tugases.some(t => t.id === tugasId)) {
    return tugasId;
  }

  const localTugas = localTugases.find(t => t.id === tugasId);
  const localTitle = localTugas?.judulTugas?.trim();

  if (localTitle) {
    const matchByTitle = cache.tugases.find(t => t.judul_tugas && t.judul_tugas.trim().toLowerCase() === localTitle.toLowerCase());
    if (matchByTitle) return matchByTitle.id;
  }

  const client = getSupabaseClient();
  if (client) {
    const placeholderTitle = localTitle || `Tugas Terhapus (${tugasId})`;
    
    const rawMapel = localStorage.getItem('mata_pelajaran');
    const localMapels = rawMapel ? JSON.parse(rawMapel) : [];
    let finalMapelId = localTugas?.mapelId;
    if (finalMapelId) {
      finalMapelId = await ensureMapelExists(finalMapelId, localMapels);
    }

    const rawGuru = localStorage.getItem('guru');
    const localGurus = rawGuru ? JSON.parse(rawGuru) : [];
    let finalGuruId = localTugas?.dibuatOlehId;
    if (finalGuruId) {
      finalGuruId = await ensureGuruExists(finalGuruId, localGurus);
    }

    console.log(`Inserting placeholder tugas ${tugasId} (${placeholderTitle}) into DB...`);
    const { error } = await resilientUpsert('daftar_tugas', {
      id: tugasId,
      mapel_id: finalMapelId || null,
      judul_tugas: placeholderTitle,
      deskripsi: localTugas?.deskripsi || '',
      google_form_url: localTugas?.googleFormUrl || 'https://forms.google.com',
      tanggal_diberikan: localTugas?.tanggalDiberikan || new Date().toISOString().split('T')[0],
      tenggat_waktu: localTugas?.tenggatWaktu || '',
      dibuat_oleh_id: finalGuruId || null
    }, client);

    if (!error) {
      cache.tugases.push({ id: tugasId, judul_tugas: placeholderTitle });
      return tugasId;
    }
  }

  return tugasId;
}

// Dynamic database upsert helper to sync a single row to a Supabase table with Delta Sync
export async function syncRowToSupabase(tableName: string, data: any, force = false): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Koneksi Supabase tidak diinisialisasi atau tidak aktif.' };

  try {
    // Convert camelCase keys to snake_case for PostgreSQL compatibility
    let pgData = transformKeysToSnakeCase(data);
    
    // Filter out columns that do not exist in the database table schema
    const validCols = VALID_COLUMNS[tableName];
    if (validCols) {
      const filteredData: any = {};
      for (const col of validCols) {
        if (pgData[col] !== undefined) {
          filteredData[col] = pgData[col];
        }
      }
      pgData = filteredData;
    }

    const rowKey = `${tableName}:${pgData.id || 'singleton'}`;
    const pgDataString = JSON.stringify(pgData);

    // Delta Sync Check: skip if data matches stored hash
    if (!force) {
      try {
        const rawHashes = localStorage.getItem('_supabase_sync_hashes');
        const syncHashes = rawHashes ? JSON.parse(rawHashes) : {};
        if (syncHashes[rowKey] === pgDataString) {
          console.log(`[Delta Sync] Skipping ${rowKey} - data unchanged.`);
          return { success: true, skipped: true };
        }
      } catch (e) {
        console.warn('Error reading delta sync hashes:', e);
      }
    }

    // Skip syncing duplicate non-canonical student records to avoid constraint conflicts and cascade deletes
    if (tableName === 'siswa' && pgData.id) {
      const canonicalId = getCanonicalSiswaId(pgData.id);
      if (canonicalId !== pgData.id) {
        console.log(`Skipping sync of non-canonical student record ${pgData.id} (canonical is ${canonicalId})`);
        return { success: true };
      }
    }

    // Map any student ID foreign keys to their canonical IDs and guarantee presence in the DB before database upsert
    if (pgData.siswa_id) {
      const rawSiswa = localStorage.getItem('siswa');
      const localSiswas = rawSiswa ? JSON.parse(rawSiswa) : [];
      const canonicalId = getCanonicalSiswaId(pgData.siswa_id);
      pgData.siswa_id = await ensureSiswaExists(canonicalId, localSiswas);
    }

    // Ensure referenced guru exists in database
    const guruIdKey = ['guru_pengampu_id', 'dicatat_oleh_id', 'dibuat_oleh_id', 'dinilai_oleh_id', 'dilaporkan_oleh_id'].find(k => pgData[k] !== undefined);
    if (guruIdKey && pgData[guruIdKey]) {
      const rawGuru = localStorage.getItem('guru');
      const localGurus = rawGuru ? JSON.parse(rawGuru) : [];
      pgData[guruIdKey] = await ensureGuruExists(pgData[guruIdKey], localGurus);
    }

    // Ensure referenced mapel exists in database
    if (pgData.mapel_id) {
      const rawMapel = localStorage.getItem('mata_pelajaran');
      const localMapels = rawMapel ? JSON.parse(rawMapel) : [];
      pgData.mapel_id = await ensureMapelExists(pgData.mapel_id, localMapels);
    }

    // Ensure referenced tugas exists in database
    if (pgData.tugas_id) {
      const rawTugas = localStorage.getItem('daftar_tugas');
      const localTugases = rawTugas ? JSON.parse(rawTugas) : [];
      pgData.tugas_id = await ensureTugasExists(pgData.tugas_id, localTugases);
    }

    // Resolve unique constraint conflicts before upserting (e.g. unique columns: nisn, nip, kode_mapel)
    if (tableName === 'siswa' && pgData.nisn) {
      const { data: existing, error: existingErr } = await client
        .from('siswa')
        .select('id')
        .eq('nisn', pgData.nisn)
        .maybeSingle();
      if (existingErr) {
        console.warn('Error checking existing student NISN:', existingErr);
      }
      if (existing && existing.id !== pgData.id) {
        console.log(`Resolving unique constraint conflict for siswa: nisn ${pgData.nisn} is already used by id ${existing.id}. Deleting old record...`);
        const { error: deleteErr } = await client.from('siswa').delete().eq('id', existing.id);
        if (deleteErr) console.error('Error deleting old student record:', deleteErr);
      }
    } else if (tableName === 'guru' && pgData.nip) {
      const { data: existing, error: existingErr } = await client
        .from('guru')
        .select('id')
        .eq('nip', pgData.nip)
        .maybeSingle();
      if (existingErr) {
        console.warn('Error checking existing guru NIP:', existingErr);
      }
      if (existing && existing.id !== pgData.id) {
        console.log(`Resolving unique constraint conflict for guru: nip ${pgData.nip} is already used by id ${existing.id}. Deleting old record...`);
        const { error: deleteErr } = await client.from('guru').delete().eq('id', existing.id);
        if (deleteErr) console.error('Error deleting old guru record:', deleteErr);
      }
    } else if (tableName === 'mata_pelajaran' && pgData.kode_mapel) {
      const { data: existing, error: existingErr } = await client
        .from('mata_pelajaran')
        .select('id')
        .eq('kode_mapel', pgData.kode_mapel)
        .maybeSingle();
      if (existingErr) {
        console.warn('Error checking existing mapel kode_mapel:', existingErr);
      }
      if (existing && existing.id !== pgData.id) {
        console.log(`Resolving unique constraint conflict for mata_pelajaran: kode_mapel ${pgData.kode_mapel} is already used by id ${existing.id}. Deleting old record...`);
        const { error: deleteErr } = await client.from('mata_pelajaran').delete().eq('id', existing.id);
        if (deleteErr) console.error('Error deleting old mapel record:', deleteErr);
      }
    }

    const { error } = await resilientUpsert(tableName, pgData, client);
    if (error) {
      if (error.code === 'PGRST205' || (error.message && error.message.includes('Could not find the table'))) {
        console.warn(`[Supabase Sync] Tabel '${tableName}' belum dibuat di Supabase. Silakan jalankan Skema SQL di Supabase SQL Editor.`);
        return { success: false, error: `Tabel '${tableName}' belum ada di Supabase. Jalankan skema SQL terlebih dahulu.` };
      }
      if (error.code === '42501' || (error.message && error.message.includes('row-level security policy'))) {
        console.warn(`[Supabase Sync] Penulisan ke tabel '${tableName}' dibatasi oleh kebijakan Row Level Security (RLS) di Supabase.`);
        return { success: false, error: `Row Level Security (RLS) di tabel '${tableName}' membatasi akses.` };
      }
      if (error.message && error.message.includes('Failed to fetch')) {
        console.warn(`[Supabase Sync] Gagal terhubung ke server Supabase untuk tabel '${tableName}': Network Error.`);
        return { success: false, error: 'Gagal terhubung ke Supabase (network error).' };
      }
      const errorMsg = `[Supabase Sync] Warning syncing row to ${tableName}: ${error.message || ''} | Details: ${error.details || ''} | Code: ${error.code || ''}`;
      console.warn(errorMsg, error);
      return { success: false, error: error.message || 'API Error' };
    }

    // Save delta sync hash on successful push
    try {
      const rawHashes = localStorage.getItem('_supabase_sync_hashes');
      const syncHashes = rawHashes ? JSON.parse(rawHashes) : {};
      syncHashes[rowKey] = pgDataString;
      localStorage.setItem('_supabase_sync_hashes', JSON.stringify(syncHashes));
    } catch (e) {
      console.warn('Error writing delta sync hash:', e);
    }

    return { success: true };
  } catch (e: any) {
    const errorMsg = `[Supabase Sync] Exception syncing row to ${tableName}: ${e?.message || ''}`;
    console.warn(errorMsg, e);
    return { success: false, error: e?.message || 'Exception occurred' };
  }
}

// Dynamic database delete helper to delete a single row from a Supabase table
export async function deleteRowFromSupabase(tableName: string, id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Koneksi Supabase tidak diinisialisasi atau tidak aktif.' };

  try {
    const { error } = await client.from(tableName).delete().eq('id', id);
    if (error) {
      if (error.code === '42501' || (error.message && error.message.includes('row-level security policy'))) {
        console.warn(`[Supabase Sync] Penghapusan baris di '${tableName}' dibatasi oleh RLS policy.`);
      } else {
        console.warn(`[Supabase Sync] Warning deleting row from ${tableName} with id ${id}:`, error.message);
      }
      return { success: false, error: error.message };
    }

    // Remove deleted row from sync hashes cache
    try {
      const rawHashes = localStorage.getItem('_supabase_sync_hashes');
      if (rawHashes) {
        const syncHashes = JSON.parse(rawHashes);
        const rowKey = `${tableName}:${id}`;
        if (syncHashes[rowKey]) {
          delete syncHashes[rowKey];
          localStorage.setItem('_supabase_sync_hashes', JSON.stringify(syncHashes));
        }
      }
    } catch (e) {
      console.warn('Error removing deleted row hash:', e);
    }

    return { success: true };
  } catch (e: any) {
    console.warn(`[Supabase Sync] Exception deleting row from ${tableName} with id ${id}:`, e?.message);
    return { success: false, error: e?.message || 'Exception occurred' };
  }
}

// Transform camelCase object to snake_case keys for database matching
function transformKeysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => transformKeysToSnakeCase(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      result[snakeKey] = transformKeysToSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export interface SyncResults {
  [key: string]: { success: number; failed: number; total: number; skipped?: number; errors?: string[] };
}

export async function syncAllToSupabase(): Promise<{ success: boolean; results?: SyncResults; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Koneksi Supabase tidak aktif. Silakan periksa URL dan API Key Anda.' };
  }

  const tablesToSync = [
    { name: 'profil_sekolah', isArray: false },
    { name: 'guru', isArray: true },
    { name: 'siswa', isArray: true },
    { name: 'orang_tua', isArray: true },
    { name: 'mata_pelajaran', isArray: true },
    { name: 'jadwal_pelajaran', isArray: true },
    { name: 'absensi', isArray: true },
    { name: 'daftar_tugas', isArray: true },
    { name: 'tugas_siswa', isArray: true },
    { name: 'asesmen', isArray: true },
    { name: 'temuan_khusus', isArray: true },
    { name: 'notifikasi', isArray: true }
  ];

  const results: SyncResults = {};
  let overallSuccess = true;

  console.log('Starting sync of all tables to Supabase with Delta Sync...');
  
  // Force-refresh the DB cache of existing records to guarantee up-to-date validation
  await refreshDbCache(true);

  for (const table of tablesToSync) {
    results[table.name] = { success: 0, failed: 0, total: 0, skipped: 0, errors: [] };
    const rawData = localStorage.getItem(table.name);
    if (!rawData) {
      console.warn(`Sync skipped for table "${table.name}": no data found in localStorage.`);
      continue;
    }

    try {
      const parsed = JSON.parse(rawData);
      if (table.isArray && Array.isArray(parsed)) {
        results[table.name].total = parsed.length;
        console.log(`Syncing table "${table.name}" with ${parsed.length} rows...`);
        for (const item of parsed) {
          const res = await syncRowToSupabase(table.name, item);
          if (res.success) {
            results[table.name].success++;
            if (res.skipped) {
              results[table.name].skipped = (results[table.name].skipped || 0) + 1;
            }
          } else {
            results[table.name].failed++;
            overallSuccess = false;
            if (res.error && !results[table.name].errors?.includes(res.error)) {
              results[table.name].errors?.push(res.error);
            }
          }
        }
        console.log(`Finished table "${table.name}": ${results[table.name].success} succeeded (${results[table.name].skipped} unchanged), ${results[table.name].failed} failed.`);
      } else if (!table.isArray && parsed && typeof parsed === 'object') {
        results[table.name].total = 1;
        console.log(`Syncing single object for table "${table.name}"...`);
        const res = await syncRowToSupabase(table.name, parsed);
        if (res.success) {
          results[table.name].success++;
          if (res.skipped) {
            results[table.name].skipped = 1;
          }
          console.log(`Finished table "${table.name}": succeeded.`);
        } else {
          results[table.name].failed++;
          overallSuccess = false;
          if (res.error && !results[table.name].errors?.includes(res.error)) {
            results[table.name].errors?.push(res.error);
          }
          console.log(`Finished table "${table.name}": failed.`);
        }
      } else {
        console.warn(`Sync skipped for table "${table.name}": data format is invalid (expected ${table.isArray ? 'array' : 'object'}).`);
      }
    } catch (e: any) {
      console.error(`Error parsing or syncing local storage key '${table.name}':`, e);
      overallSuccess = false;
      results[table.name].errors?.push(e?.message || 'JSON Parse Error');
    }
  }

  console.log(`Sync completed. Overall success: ${overallSuccess}`);
  return { success: overallSuccess, results };
}

// Transform snake_case keys back to camelCase keys for localStorage matching
export function transformKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => transformKeysToCamelCase(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = transformKeysToCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Download/pull all tables from Supabase database to synchronize local application storage
export async function pullAllFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Koneksi Supabase tidak aktif. Silakan periksa URL dan API Key Anda.' };
  }

  const tablesToPull = [
    { dbName: 'profil_sekolah', localName: 'profil_sekolah', isArray: false },
    { dbName: 'guru', localName: 'guru', isArray: true },
    { dbName: 'siswa', localName: 'siswa', isArray: true },
    { dbName: 'orang_tua', localName: 'orang_tua', isArray: true },
    { dbName: 'mata_pelajaran', localName: 'mata_pelajaran', isArray: true },
    { dbName: 'jadwal_pelajaran', localName: 'jadwal_pelajaran', isArray: true },
    { dbName: 'absensi', localName: 'absensi', isArray: true },
    { dbName: 'daftar_tugas', localName: 'daftar_tugas', isArray: true },
    { dbName: 'tugas_siswa', localName: 'tugas_siswa', isArray: true },
    { dbName: 'asesmen', localName: 'asesmen', isArray: true },
    { dbName: 'temuan_khusus', localName: 'temuan_khusus', isArray: true },
    { dbName: 'notifikasi', localName: 'notifikasi', isArray: true }
  ];

  try {
    for (const table of tablesToPull) {
      console.log(`Pulling table "${table.dbName}" from Supabase...`);
      const { data, error } = await client.from(table.dbName).select('*');
      if (error) {
        console.warn(`Error pulling ${table.dbName}:`, error);
        continue;
      }

      if (data) {
        // Strip out 'created_at' if any
        const cleanedData = Array.isArray(data)
          ? data.map(({ created_at, ...rest }) => rest)
          : data;

        const transformed = transformKeysToCamelCase(cleanedData);

        if (table.isArray) {
          if (Array.isArray(transformed) && transformed.length > 0) {
            localStorage.setItem(table.localName, JSON.stringify(transformed));
          } else {
            // Supabase table is empty. Preserve local data if exists and auto-push it
            const existingLocal = localStorage.getItem(table.localName);
            if (existingLocal && existingLocal !== '[]') {
              console.log(`[Auto Sync] Supabase table "${table.dbName}" is empty. Pushing existing local items to Supabase...`);
              try {
                const localItems = JSON.parse(existingLocal);
                if (Array.isArray(localItems) && localItems.length > 0) {
                  for (const item of localItems) {
                    await syncRowToSupabase(table.dbName, item, true);
                  }
                }
              } catch (e) {
                console.warn(`[Auto Sync] Error auto-pushing local data for "${table.dbName}":`, e);
              }
            }
          }
        } else {
          if (Array.isArray(transformed)) {
            if (transformed.length > 0) {
              localStorage.setItem(table.localName, JSON.stringify(transformed[0]));
            } else {
              // Supabase singleton table is empty. Preserve local data and auto-push
              const existingLocal = localStorage.getItem(table.localName);
              if (existingLocal && existingLocal !== '{}') {
                try {
                  const localObj = JSON.parse(existingLocal);
                  if (localObj && Object.keys(localObj).length > 0) {
                    console.log(`[Auto Sync] Supabase singleton "${table.dbName}" is empty. Pushing local data...`);
                    await syncRowToSupabase(table.dbName, localObj, true);
                  }
                } catch (e) {
                  console.warn(`[Auto Sync] Error auto-pushing local singleton for "${table.dbName}":`, e);
                }
              }
            }
          } else if (transformed && Object.keys(transformed).length > 0) {
            localStorage.setItem(table.localName, JSON.stringify(transformed));
          }
        }

        // Update delta sync hashes for the pulled data to prevent redundant future pushes
        try {
          const rawHashes = localStorage.getItem('_supabase_sync_hashes');
          const syncHashes = rawHashes ? JSON.parse(rawHashes) : {};
          const items = Array.isArray(cleanedData) ? cleanedData : [cleanedData];
          
          for (const item of items) {
            if (!item) continue;
            const validCols = VALID_COLUMNS[table.dbName];
            let filteredItem: any = {};
            if (validCols) {
              for (const col of validCols) {
                if (item[col] !== undefined) {
                  filteredItem[col] = item[col];
                }
              }
            } else {
              filteredItem = item;
            }
            const rowKey = `${table.dbName}:${filteredItem.id || 'singleton'}`;
            syncHashes[rowKey] = JSON.stringify(filteredItem);
          }
          localStorage.setItem('_supabase_sync_hashes', JSON.stringify(syncHashes));
        } catch (e) {
          console.warn(`Error updating delta sync hashes for pulled table: ${table.dbName}`, e);
        }
      }
    }
    return { success: true };
  } catch (e: any) {
    console.error('Exception during pull from Supabase:', e);
    return { success: false, error: e?.message || 'Exception occurred during pull' };
  }
}
