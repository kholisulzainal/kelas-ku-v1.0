# CORE SYSTEM SPECIFICATION & ARCHITECTURAL BOUNDARIES
**Sistem Informasi Manajemen Sekolah Dasar (SIM-SD) & Kurikulum Merdeka Hub**

---

## 1. Filosofi & Batasan Utama Sistem ("Kamar Privasi")
1. **Akses Berbasis Peran & Kamar Privasi Per Kelas**:
   - **Operator**: Memiliki akses penuh (*Full Admin*) terhadap seluruh konfigurasi sekolah, manajemen akun, cadangan database, serta modul global.
   - **Guru / Wali Kelas**: Hanya berhak mengelola siswa, absensi, tugas, serta nilai pada kelas yang diwalikan atau mata pelajaran yang diampu. Guru tidak dapat mengakses atau mengubah data kelas lain.
   - **Siswa**: Hanya dapat melihat tugas, nilai, absensi, serta buku digital yang ditujukan khusus untuk kelas siswa bersangkutan.
   - **Orang Tua**: Hanya dapat memantau perkembangan, kehadiran, serta nilai ananda yang terhubung dengan akunnya.

2. **Keamanan Input Nilai & Mencegah Kecurangan**:
   - Muka input nilai kuis/tugas **DIHAPUS DARI HALAMAN SISWA**. Siswa hanya dapat mengerjakan kuis melalui Google Form resmi.
   - Rekap & sinkronisasi nilai dikontrol sepenuhnya secara otomatis melalui **Google Form Webhook** atau panel **Olah & Sinkronisasi Nilai Guru/Operator**.

---

## 2. Arsitektur Data & Alur Sinkronisasi Database
- **Local Persistence**: Menggunakan `localStorage` terstruktur sebagai primary storage instan di browser.
- **Supabase Cloud Sync**: Sinkronisasi dua arah (*bi-directional*) secara real-time ke tabel PostgreSQL Supabase melalui service `supabase.ts`.
- **Ekspor & Impor**: Dukungan ekspor format Excel (`.xlsx`), CSV, serta backup/restore database JSON komplit di menu **Pengaturan Aplikasi**.

---

## 3. Struktur Modul & Fungsi Fitur
1. **Profil Sekolah & Pengaturan Aplikasi**:
   - Pengaturan Identitas Sekolah (NPSN, Nama, Akreditasi, Alamat, Kepala Sekolah).
   - Backup, Restore, & Audit Trail Database.
2. **Manajemen Guru & Wali Kelas**:
   - Pendataan NIP, Nama, Gelar, Status Kepegawaian, serta penugasan Kelas Wali.
3. **Manajemen Siswa & Orang Tua**:
   - Pendataan NISN, NIS, Kelas, Orang Tua/Wali, dan kredensial login terpisah.
4. **Mata Pelajaran & Jadwal Pelajaran**:
   - Pemetaan KKM, Kode Mapel, Jam Pelajaran, dan Ruangan.
5. **Absensi & Kehadiran Siswa**:
   - Catatan Hadir, Sakit, Izin, Alpa dengan perhitungan rekap persentase kehadiran otomatis.
6. **Asesmen Kurikulum Merdeka (Tabel Excel Matrix)**:
   - Kolom 1: Nama Siswa & NISN.
   - Kolom 2: Mata Pelajaran.
   - Kolom 3: Nilai Formatif Harian (Dynamic Sub-kolom T1, T2, T3, T4, T5...).
   - Kolom 4: Sumatif / Kuis (STS/SAS).
   - Kolom 5: Rata-Rata Nilai (Otomatis terhubung dengan Rekapitulasi & Analisis Nilai).
7. **Tugas Google Form & Webhook Integration**:
   - Pembuatan tugas per kelas dengan tautan Google Form resmi.
   - Penilaian otomatis melalui Webhook Google Form dan notifikasi Gmail API.
8. **Buku Digital & Modul Online**:
   - Media belajar siswa berbasis Web View/Embedded PDF per kelas.
   - Modul diunggah dan dikategorikan oleh Operator & Guru Pengampu.
9. **Jurnal Temuan Khusus**:
   - Catatan bimbingan konseling dan pengembangan karakter siswa.
10. **Kalender Akademik Indonesia**:
    - Agenda sekolah, hari libur nasional, dan jadwal kegiatan akademik.

---

## 4. Aturan Pemeliharaan & Pengembangan Modern
- **Jangan Mengubah Port**: Aplikasi harus tetap berjalan pada Port 3000.
- **Satu Sumber Kebenaran Data**: Semua helper CRUD wajib melalui `/src/services/db.ts`.
- **Sanitasi Kredensial**: Jangan menyimpan token atau Kunci Rahasia di UI publik.
