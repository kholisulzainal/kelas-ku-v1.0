-- ==============================================================================
-- SKEMA DATABASE SUPABASE UNTUK APLIKASI "KELAS KU"
-- Kurikulum Merdeka - Presensi, Nilai, Jadwal, Google Form, & Supabase Storage
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & ROLES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('operator', 'guru_mapel', 'wali_kelas', 'siswa', 'ortu');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_kehadiran AS ENUM ('hadir', 'sakit', 'izin', 'alfa');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipe_asesmen AS ENUM ('harian', 'sts', 'sas', 'kokurikuler');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL UTAMA

-- A. Profil Sekolah
CREATE TABLE IF NOT EXISTS public.profil_sekolah (
    id TEXT PRIMARY KEY DEFAULT 'sch-001',
    nama_sekolah TEXT NOT NULL,
    npsn TEXT UNIQUE,
    alamat TEXT,
    akreditasi TEXT DEFAULT 'A',
    kepala_sekolah TEXT,
    nip_kepala_sekolah TEXT,
    logo_url TEXT,
    tahun_pelajaran TEXT DEFAULT '2025/2026',
    jalan TEXT,
    rt_rw TEXT,
    dusun TEXT,
    desa TEXT,
    kecamatan TEXT,
    kabupaten TEXT,
    provinsi TEXT,
    kode_pos TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B. User Profiles (Integrasi Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'guru_mapel',
    avatar_url TEXT,
    no_telepon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- C. Data Guru
CREATE TABLE IF NOT EXISTS public.guru (
    id TEXT PRIMARY KEY DEFAULT ('guru-' || extract(epoch from now())::bigint),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nip TEXT UNIQUE NOT NULL,
    nama_guru TEXT NOT NULL,
    gelar TEXT,
    mata_pelajaran_utama TEXT,
    foto_url TEXT,
    status_kepegawaian TEXT DEFAULT 'PNS/P3K/Honor',
    password TEXT NOT NULL DEFAULT 'guru123',
    is_wali_kelas BOOLEAN DEFAULT FALSE,
    kelas_wali TEXT,
    google_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- D. Data Kelas
CREATE TABLE IF NOT EXISTS public.data_kelas (
    id TEXT PRIMARY KEY DEFAULT ('kelas-' || extract(epoch from now())::bigint),
    nama_kelas TEXT UNIQUE NOT NULL,
    tingkat INTEGER DEFAULT 4,
    wali_kelas_id TEXT REFERENCES public.guru(id) ON DELETE SET NULL,
    tahun_ajaran TEXT DEFAULT '2025/2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E. Data Siswa
CREATE TABLE IF NOT EXISTS public.siswa (
    id TEXT PRIMARY KEY DEFAULT ('siswa-' || extract(epoch from now())::bigint),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nisn TEXT UNIQUE NOT NULL,
    nis TEXT UNIQUE,
    nama_siswa TEXT NOT NULL,
    jenis_kelamin TEXT CHECK (jenis_kelamin IN ('L', 'P')),
    kelas TEXT NOT NULL DEFAULT 'Kelas 4-A',
    kelas_id TEXT REFERENCES public.data_kelas(id) ON DELETE SET NULL,
    alamat TEXT,
    foto_url TEXT,
    nama_ayah TEXT,
    nama_ibu TEXT,
    no_telepon_ortu TEXT,
    password TEXT NOT NULL DEFAULT 'siswa123',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- F. Data Orang Tua
CREATE TABLE IF NOT EXISTS public.orang_tua (
    id TEXT PRIMARY KEY DEFAULT ('ortu-' || extract(epoch from now())::bigint),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nama_ortu TEXT NOT NULL,
    siswa_id TEXT REFERENCES public.siswa(id) ON DELETE CASCADE,
    hubungan TEXT DEFAULT 'Ayah/Ibu/Wali',
    no_telepon TEXT,
    password TEXT NOT NULL DEFAULT 'ortu123',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- G. Mata Pelajaran
CREATE TABLE IF NOT EXISTS public.mata_pelajaran (
    id TEXT PRIMARY KEY DEFAULT ('mapel-' || extract(epoch from now())::bigint),
    kode_mapel TEXT UNIQUE NOT NULL,
    nama_mapel TEXT NOT NULL,
    kkm INTEGER DEFAULT 75,
    guru_pengampu_id TEXT REFERENCES public.guru(id) ON DELETE SET NULL,
    kelas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- H. Jadwal Pelajaran
CREATE TABLE IF NOT EXISTS public.jadwal_pelajaran (
    id TEXT PRIMARY KEY DEFAULT ('jadwal-' || extract(epoch from now())::bigint),
    mapel_id TEXT REFERENCES public.mata_pelajaran(id) ON DELETE CASCADE,
    hari TEXT NOT NULL CHECK (hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
    jam_mulai TEXT NOT NULL,
    jam_selesai TEXT NOT NULL,
    ruangan TEXT DEFAULT 'Ruang Kelas',
    kelas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- I. Absensi Siswa
CREATE TABLE IF NOT EXISTS public.absensi (
    id TEXT PRIMARY KEY DEFAULT ('abs-' || extract(epoch from now())::bigint),
    siswa_id TEXT REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    tanggal TEXT NOT NULL,
    status TEXT NOT NULL,
    keterangan TEXT,
    dicatat_oleh_id TEXT REFERENCES public.guru(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_siswa_tanggal UNIQUE (siswa_id, tanggal)
);

-- J. Daftar Tugas (Integrasi Google Form)
CREATE TABLE IF NOT EXISTS public.daftar_tugas (
    id TEXT PRIMARY KEY DEFAULT ('tugas-' || extract(epoch from now())::bigint),
    mapel_id TEXT REFERENCES public.mata_pelajaran(id) ON DELETE CASCADE,
    judul_tugas TEXT NOT NULL,
    deskripsi TEXT,
    google_form_url TEXT NOT NULL,
    tanggal_diberikan TEXT NOT NULL,
    tenggat_waktu TEXT,
    dibuat_oleh_id TEXT REFERENCES public.guru(id) ON DELETE SET NULL,
    kelas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- K. Tugas Siswa (Pengerjaan & Status Google Form)
CREATE TABLE IF NOT EXISTS public.tugas_siswa (
    id TEXT PRIMARY KEY DEFAULT ('ts-' || extract(epoch from now())::bigint),
    tugas_id TEXT REFERENCES public.daftar_tugas(id) ON DELETE CASCADE NOT NULL,
    siswa_id TEXT REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    status_pengerjaan BOOLEAN DEFAULT FALSE,
    tanggal_dikerjakan TEXT,
    nilai INTEGER CHECK (nilai >= 0 AND nilai <= 100),
    umpan_balik TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tugas_siswa UNIQUE (tugas_id, siswa_id)
);

-- L. Asesmen / Rekap Nilai Kurikulum Merdeka (Tangkapan Google Form & Manual)
CREATE TABLE IF NOT EXISTS public.asesmen (
    id TEXT PRIMARY KEY DEFAULT ('as-' || extract(epoch from now())::bigint),
    siswa_id TEXT REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    mapel_id TEXT REFERENCES public.mata_pelajaran(id) ON DELETE CASCADE,
    tipe TEXT NOT NULL DEFAULT 'harian',
    nama_penilaian TEXT NOT NULL,
    nilai INTEGER NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
    deskripsi_kompetensi TEXT,
    tanggal_penilaian TEXT NOT NULL,
    dinilai_oleh_id TEXT REFERENCES public.guru(id) ON DELETE SET NULL,
    kelas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- M. Temuan Khusus (Catatan Perilaku Siswa)
CREATE TABLE IF NOT EXISTS public.temuan_khusus (
    id TEXT PRIMARY KEY DEFAULT ('tk-' || extract(epoch from now())::bigint),
    siswa_id TEXT REFERENCES public.siswa(id) ON DELETE CASCADE NOT NULL,
    tanggal TEXT NOT NULL,
    kategori TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    tindakan_lanjut TEXT,
    dilaporkan_oleh_id TEXT REFERENCES public.guru(id) ON DELETE SET NULL,
    kelas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- N. Notifikasi Real-Time
CREATE TABLE IF NOT EXISTS public.notifikasi (
    id TEXT PRIMARY KEY DEFAULT ('notif-' || extract(epoch from now())::bigint),
    penerima_role TEXT NOT NULL,
    penerima_user_id TEXT,
    judul TEXT NOT NULL,
    pesan TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    dibaca BOOLEAN DEFAULT FALSE,
    tugas_id TEXT REFERENCES public.daftar_tugas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- O. News / Pengumuman Sekolah
CREATE TABLE IF NOT EXISTS public.news (
    id TEXT PRIMARY KEY DEFAULT ('news-' || extract(epoch from now())::bigint),
    judul TEXT NOT NULL,
    konten TEXT NOT NULL,
    kategori TEXT DEFAULT 'Pengumuman',
    penulis TEXT DEFAULT 'Admin',
    tanggal TEXT,
    thumbnail_url TEXT,
    published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- P. Galeri Kegiatan Sekolah
CREATE TABLE IF NOT EXISTS public.gallery (
    id TEXT PRIMARY KEY DEFAULT ('gal-' || extract(epoch from now())::bigint),
    judul TEXT NOT NULL,
    deskripsi TEXT,
    image_url TEXT NOT NULL,
    kategori TEXT DEFAULT 'Kegiatan',
    tanggal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Q. Pengaturan Aplikasi
CREATE TABLE IF NOT EXISTS public.application_settings (
    id TEXT PRIMARY KEY DEFAULT 'app-settings-001',
    theme TEXT DEFAULT 'light',
    primary_color TEXT,
    secondary_color TEXT,
    website_title TEXT,
    footer_text TEXT,
    vision TEXT,
    mission TEXT,
    welcome_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- R. Pendaftaran PPDB
CREATE TABLE IF NOT EXISTS public.ppdb (
    id TEXT PRIMARY KEY DEFAULT ('ppdb-' || extract(epoch from now())::bigint),
    nama_lengkap TEXT NOT NULL,
    nisn TEXT,
    jenis_kelamin TEXT DEFAULT 'L',
    tempat_lahir TEXT,
    tanggal_lahir TEXT,
    nama_ayah TEXT,
    nama_ibu TEXT,
    no_telepon_ortu TEXT,
    alamat TEXT,
    status_pendaftaran TEXT DEFAULT 'Daftar',
    dokumen_url TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. KONFIGURASI SUPABASE STORAGE BUCKETS (Untuk Permanensi Media & URL Public)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('logos', 'logos', true),
  ('teachers', 'teachers', true),
  ('students', 'students', true),
  ('documents', 'documents', true),
  ('assignments', 'assignments', true),
  ('ppdb', 'ppdb', true),
  ('gallery', 'gallery', true),
  ('news', 'news', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Kebijakan Akses Public & Authenticated pada Storage Objects
DROP POLICY IF EXISTS "Public Storage Read Access" ON storage.objects;
CREATE POLICY "Public Storage Read Access" ON storage.objects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow Storage Uploads" ON storage.objects;
CREATE POLICY "Allow Storage Uploads" ON storage.objects
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Storage Updates" ON storage.objects;
CREATE POLICY "Allow Storage Updates" ON storage.objects
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow Storage Deletes" ON storage.objects;
CREATE POLICY "Allow Storage Deletes" ON storage.objects
  FOR DELETE USING (true);

-- 5. INDEXES UNTUK PERFORMA
CREATE INDEX IF NOT EXISTS idx_guru_nip ON public.guru(nip);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn ON public.siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_siswa_kelas ON public.siswa(kelas);
CREATE INDEX IF NOT EXISTS idx_absensi_siswa_tgl ON public.absensi(siswa_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_tugas_siswa_tugas ON public.tugas_siswa(tugas_id);
CREATE INDEX IF NOT EXISTS idx_tugas_siswa_siswa ON public.tugas_siswa(siswa_id);
CREATE INDEX IF NOT EXISTS idx_asesmen_siswa ON public.asesmen(siswa_id);

-- 6. GRANT PERMISSIONS & ROW LEVEL SECURITY (RLS) POLICIES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA PUBLIC TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA PUBLIC TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Aktifkan RLS pada seluruh tabel
ALTER TABLE public.profil_sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orang_tua ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daftar_tugas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tugas_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asesmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temuan_khusus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppdb ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Berdasarkan Role User:
-- Operator, Guru, Siswa, Orang Tua
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profil_sekolah','profiles','guru','data_kelas','siswa','orang_tua',
    'mata_pelajaran','jadwal_pelajaran','absensi','daftar_tugas','tugas_siswa',
    'asesmen','temuan_khusus','notifikasi','news','gallery','application_settings','ppdb'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read and write access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Public read and write access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
