-- Schema Database PostgreSQL untuk Aplikasi Pengelolaan Kelas (Supabase)
-- Termasuk Foreign Keys, Indexes, Triggers, dan Row Level Security (RLS)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS / ROLES
CREATE TYPE user_role AS ENUM ('guru', 'siswa', 'orang_tua');
CREATE TYPE status_kehadiran AS ENUM ('hadir', 'sakit', 'izin', 'alfa');
CREATE TYPE tipe_asesmen AS ENUM ('harian', 'sts', 'sas', 'kokurikuler');

-- 3. TABLES

-- A. Profil Sekolah
CREATE TABLE profil_sekolah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_sekolah VARCHAR(255) NOT NULL,
    npsn VARCHAR(50) UNIQUE NOT NULL,
    alamat TEXT,
    akreditasi VARCHAR(10),
    kepala_sekolah VARCHAR(150),
    nip_kepala_sekolah VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B. Users & Profiles (Sinkronisasi dengan Auth Supabase)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    avatar_url TEXT,
    no_telepon VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- C. Data Guru
CREATE TABLE data_guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    nip VARCHAR(50) UNIQUE,
    nama_guru VARCHAR(255) NOT NULL,
    gelar VARCHAR(50),
    mata_pelajaran_utama VARCHAR(100),
    foto_url TEXT,
    status_kepegawaian VARCHAR(50) DEFAULT 'PNS/P3K/Honor'
);

-- D. Data Siswa
CREATE TABLE data_siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    nisn VARCHAR(50) UNIQUE NOT NULL,
    nis VARCHAR(50) UNIQUE,
    nama_siswa VARCHAR(255) NOT NULL,
    jenis_kelamin VARCHAR(10) CHECK (jenis_kelamin IN ('L', 'P')),
    kelas VARCHAR(50) NOT NULL,
    alamat TEXT,
    foto_url TEXT,
    nama_ayah VARCHAR(150),
    nama_ibu VARCHAR(150),
    no_telepon_ortu VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E. Data Orang Tua (Relasi ke Siswa)
CREATE TABLE data_orang_tua (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    nama_ortu VARCHAR(255) NOT NULL,
    siswa_id UUID REFERENCES data_siswa(id) ON DELETE CASCADE NOT NULL,
    hubungan VARCHAR(50) DEFAULT 'Ayah/Ibu/Wali',
    no_telepon VARCHAR(20)
);

-- F. Mata Pelajaran
CREATE TABLE mata_pelajaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_mapel VARCHAR(50) UNIQUE NOT NULL,
    nama_mapel VARCHAR(150) NOT NULL,
    kkm INT DEFAULT 75,
    guru_pengampu UUID REFERENCES data_guru(id) ON DELETE SET NULL
);

-- G. Jadwal Pelajaran
CREATE TABLE jadwal_pelajaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mapel_id UUID REFERENCES mata_pelajaran(id) ON DELETE CASCADE NOT NULL,
    hari VARCHAR(20) NOT NULL CHECK (hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    ruangan VARCHAR(50) DEFAULT 'Ruang Kelas 1A'
);

-- H. Absensi Siswa
CREATE TABLE absensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID REFERENCES data_siswa(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    status status_kehadiran NOT NULL,
    keterangan TEXT,
    dicatat_oleh UUID REFERENCES data_guru(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_siswa_tanggal UNIQUE (siswa_id, tanggal)
);

-- I. Daftar Tugas (Google Form Integration)
CREATE TABLE daftar_tugas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mapel_id UUID REFERENCES mata_pelajaran(id) ON DELETE CASCADE NOT NULL,
    judul_tugas VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    google_form_url TEXT NOT NULL,
    tanggal_diberikan DATE NOT NULL DEFAULT CURRENT_DATE,
    tenggat_waktu TIMESTAMP WITH TIME ZONE,
    dibuat_oleh UUID REFERENCES data_guru(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- J. Tugas Siswa (Pengerjaan dan Nilai Otomatis)
CREATE TABLE tugas_siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tugas_id UUID REFERENCES daftar_tugas(id) ON DELETE CASCADE NOT NULL,
    siswa_id UUID REFERENCES data_siswa(id) ON DELETE CASCADE NOT NULL,
    status_pengerjaan BOOLEAN DEFAULT FALSE,
    tanggal_dikerjakan TIMESTAMP WITH TIME ZONE,
    nilai INT CHECK (nilai >= 0 AND nilai <= 100),
    umpan_balik TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tugas_siswa UNIQUE (tugas_id, siswa_id)
);

-- K. Asesmen Kurikulum Merdeka
CREATE TABLE asesmen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID REFERENCES data_siswa(id) ON DELETE CASCADE NOT NULL,
    mapel_id UUID REFERENCES mata_pelajaran(id) ON DELETE CASCADE NOT NULL,
    tipe tipe_asesmen NOT NULL,
    nama_penilaian VARCHAR(255) NOT NULL, -- Contoh: 'PH 1', 'Sumatif Tengah Semester', 'Projek P5'
    nilai INT NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
    deskripsi_kompetensi TEXT, -- Deskripsi capaian pembelajaran
    tanggal_penilaian DATE NOT NULL DEFAULT CURRENT_DATE,
    dinilai_oleh UUID REFERENCES data_guru(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- L. Temuan Khusus (Catatan Perilaku & Karakter Siswa)
CREATE TABLE temuan_khusus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID REFERENCES data_siswa(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    kategori VARCHAR(100) NOT NULL, -- Contoh: 'Positif', 'Perlu Bimbingan'
    deskripsi TEXT NOT NULL,
    tindakan_lanjut TEXT,
    dilaporkan_oleh UUID REFERENCES data_guru(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. INDEXES (Optimasi Kueri)
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_siswa_kelas ON data_siswa(kelas);
CREATE INDEX idx_absensi_siswa_tgl ON absensi(siswa_id, tanggal);
CREATE INDEX idx_tugas_siswa_tugas ON tugas_siswa(tugas_id);
CREATE INDEX idx_tugas_siswa_siswa ON tugas_siswa(siswa_id);
CREATE INDEX idx_asesmen_siswa_mapel ON asesmen(siswa_id, mapel_id, tipe);
CREATE INDEX idx_temuan_siswa ON temuan_khusus(siswa_id);

-- 5. TRIGGER UNTUK UPDATE TIMESTAMP (updated_at)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profil_sekolah_modtime BEFORE UPDATE ON profil_sekolah FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- Mengaktifkan RLS pada seluruh tabel sensitif
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_orang_tua ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE daftar_tugas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tugas_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE asesmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE temuan_khusus ENABLE ROW LEVEL SECURITY;

-- A. Kebijakan Tabel PROFILES
-- Guru dapat melihat semua profil
CREATE POLICY "Guru dapat melihat semua profil" ON profiles
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
    );
-- Pengguna hanya bisa memperbarui profilnya sendiri
CREATE POLICY "Pengguna dapat memperbarui profil sendiri" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- B. Kebijakan Tabel DATA SISWA
-- Guru memiliki akses penuh
CREATE POLICY "Guru akses penuh data siswa" ON data_siswa
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
    );
-- Siswa hanya bisa melihat datanya sendiri
CREATE POLICY "Siswa melihat data sendiri" ON data_siswa
    FOR SELECT TO authenticated USING (profile_id = auth.uid());
-- Orang tua melihat data anaknya
CREATE POLICY "Orang tua melihat data anak" ON data_siswa
    FOR SELECT TO authenticated USING (
        id IN (SELECT siswa_id FROM data_orang_tua WHERE profile_id = auth.uid())
    );

-- C. Kebijakan Tabel ABSENSI
-- Guru akses penuh
CREATE POLICY "Guru akses penuh absensi" ON absensi
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
    );
-- Siswa melihat absensinya sendiri
CREATE POLICY "Siswa melihat absensi sendiri" ON absensi
    FOR SELECT TO authenticated USING (
        siswa_id IN (SELECT id FROM data_siswa WHERE profile_id = auth.uid())
    );
-- Orang tua melihat absensi anaknya
CREATE POLICY "Orang tua melihat absensi anak" ON absensi
    FOR SELECT TO authenticated USING (
        siswa_id IN (SELECT siswa_id FROM data_orang_tua WHERE profile_id = auth.uid())
    );

-- D. Kebijakan Tabel TUGAS SISWA
-- Guru akses penuh
CREATE POLICY "Guru akses penuh tugas siswa" ON tugas_siswa
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
    );
-- Siswa melihat dan memperbarui status tugas sendiri
CREATE POLICY "Siswa melihat dan update tugas sendiri" ON tugas_siswa
    FOR SELECT TO authenticated USING (
        siswa_id IN (SELECT id FROM data_siswa WHERE profile_id = auth.uid())
    );
CREATE POLICY "Siswa update pengerjaan tugas" ON tugas_siswa
    FOR UPDATE TO authenticated USING (
        siswa_id IN (SELECT id FROM data_siswa WHERE profile_id = auth.uid())
    );
-- Orang tua melihat tugas anaknya
CREATE POLICY "Orang tua melihat tugas anak" ON tugas_siswa
    FOR SELECT TO authenticated USING (
        siswa_id IN (SELECT siswa_id FROM data_orang_tua WHERE profile_id = auth.uid())
    );

-- E. Kebijakan Tabel ASESMEN
-- Guru akses penuh
CREATE POLICY "Guru akses penuh asesmen" ON asesmen
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'guru')
    );
-- Siswa melihat nilainya sendiri
CREATE POLICY "Siswa melihat nilai sendiri" ON asesmen
    FOR SELECT TO authenticated USING (
        siswa_id IN (SELECT id FROM data_siswa WHERE profile_id = auth.uid())
    );
-- Orang tua melihat nilai anaknya
CREATE POLICY "Orang tua melihat nilai anak" ON asesmen
    FOR SELECT TO authenticated USING (
        siswa_id IN (SELECT siswa_id FROM data_orang_tua WHERE profile_id = auth.uid())
    );

-- F. Kebijakan Tambahan untuk RLS Lengkap (Mencegah Unrestricted / Error RLS)
ALTER TABLE profil_sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_pelajaran ENABLE ROW LEVEL SECURITY;

-- 1. Profil Sekolah (Semua orang terautentikasi dapat melihat, hanya guru/admin/operator yang dapat mengedit)
CREATE POLICY "Semua dapat melihat profil sekolah" ON profil_sekolah
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hanya guru/operator dapat edit profil sekolah" ON profil_sekolah
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'guru' OR role = 'operator'::user_role))
    );

-- 2. Mata Pelajaran (Semua dapat melihat, hanya guru/operator yang dapat mengedit)
CREATE POLICY "Semua dapat melihat mata pelajaran" ON mata_pelajaran
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hanya guru/operator dapat edit mata pelajaran" ON mata_pelajaran
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'guru' OR role = 'operator'::user_role))
    );

-- 3. Jadwal Pelajaran (Semua dapat melihat, hanya guru/operator yang dapat mengedit)
CREATE POLICY "Semua dapat melihat jadwal pelajaran" ON jadwal_pelajaran
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hanya guru/operator dapat edit jadwal pelajaran" ON jadwal_pelajaran
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'guru' OR role = 'operator'::user_role))
    );

-- G. Kebijakan Global untuk OPERATOR (Akses Penuh Tanpa Batasan)
-- RLS Policy helper to allow bypass to Operator
CREATE POLICY "Operator akses penuh profiles" ON profiles FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
CREATE POLICY "Operator akses penuh data_siswa" ON data_siswa FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
CREATE POLICY "Operator akses penuh data_guru" ON data_guru FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
CREATE POLICY "Operator akses penuh data_orang_tua" ON data_orang_tua FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
CREATE POLICY "Operator akses penuh absensi" ON absensi FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
CREATE POLICY "Operator akses penuh daftar_tugas" ON daftar_tugas FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
CREATE POLICY "Operator akses penuh tugas_siswa" ON tugas_siswa FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
CREATE POLICY "Operator akses penuh asesmen" ON asesmen FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
CREATE POLICY "Operator akses penuh temuan_khusus" ON temuan_khusus FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator'::user_role)
);
