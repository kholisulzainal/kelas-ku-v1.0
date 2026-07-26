# 📚 KELAS KU (Aplikasi Manajemen Sekolah & LMS Digital)

> **Dokumen Kontrol Alur Database, Arsitektur Sistem, dan Panduan Monitoring Bug**  
> *Versi Rilis: 2.5.0 | Framework: React 18 + Vite + Express + Supabase PostgreSQL*

---

## 1. 📐 BLUEPRINT APLIKASI & KERANGKA DASAR

**KELAS KU** adalah platform School Management System (SMS) dan Learning Management System (LMS) modern yang dirancang untuk sekolah tingkat SD, SMP, SMA, dan SMK di Indonesia. Sistem ini menggabungkan manajemen akademik sekolah dengan pelacakan tugas otomatis via Google Form Webhook.

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND CLIENT                                  |
|         React 18 (TypeScript) + Vite + Tailwind CSS + Lucide Icons               |
|   +-------------------+    +--------------------+    +------------------------+   |
|   |   Portal Siswa    |    |    Portal Guru     |    |   Portal Admin/Kepsek  |   |
|   +-------------------+    +--------------------+    +------------------------+   |
+------------------------------------------+----------------------------------------+
                                           |
                                     HTTP / REST API
                                           v
+-----------------------------------------------------------------------------------+
|                                  BACKEND SERVER                                   |
|                          Node.js + Express (Port 3000)                            |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | /api/webhooks/gform|   | /api/sync/supabase    |   | /api/health            |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
+---------------------+-------------------------------------------------------------+
                      |
        +-------------+-------------+
        |                           |
        v                           v
+---------------+           +---------------+
|   DATABASE    |           | EXTERNAL HOOK |
|   Supabase    |           | Google Apps   |
| (PostgreSQL)  |           | Script (GAS)  |
+---------------+           +---------------+
```

### Stack Teknologi Utama:
* **Frontend UI**: React 18, Vite, Tailwind CSS, Lucide React, Canvas Confetti.
* **Backend Runtime**: Node.js, Express JS, TSX / ESBuild CJS bundler.
* **Database Layer**: Supabase PostgreSQL (Aturan RLS enabled, fallback local persistent DB jika offline).
* **Integrasi Eksternal**: Google Apps Script (GAS) Webhook untuk kuis Google Form, Google Docs/Drive generator.

---

## 2. 👥 FUNGSI HAK AKSES AKUN, HALAMAN, DAN MANAJEMEN MENU

### 👨‍🎓 1. Akun Siswa (Role: `STUDENT`)
* **Halaman Beranda Siswa**:
  * **Kartu Ringkasan**: Menampilkan statistik kehadiran, jumlah tugas belum dikerjakan, dan nilai rata-rata.
  * **Tugas & Kuis**: Menampilkan daftar tugas dengan status: `BELUM_DIKERJAKAN`, `SEDANG_MENGERJAKAN`, dan `SELESAI`.
  * **Tombol "Kerjakan Tugas"**: Membuka Google Form tertanam di dalam modal iframe yang aman.
  * **Tombol "Refresh Status Webhook"**: Memeriksa pembaruan nilai kuis yang dikirim otomatis oleh Google Form.
  * **Jadwal Pelajaran Siswa**: Menampilkan jadwal harian sesuai kelas siswa.
  * **Presensi Mandiri / Scan QR**: Memungkinkan siswa melakukan absensi masuk/pulang.

### 👨‍🏫 2. Akun Guru (Role: `TEACHER`)
* **Dasbor Guru**:
  * **Manajemen Tugas & Google Form**: Membuat tugas baru, memasukkan link Google Form, dan mengunduh skrip Google Apps Script terintegrasi.
  * **Input Nilai Manual & Asesmen**: Guru dapat memasukkan, mengubah, dan mengunci nilai siswa (Formatif/Sumatif/Kuis) langsung dari dasbor guru.
  * **Manajemen Presensi Kelas**: Mencatat kehadiran harian siswa (Hadir, Izin, Sakit, Alpa) dan mencetak rekapitulasi.
  * **Temuan Khusus & Karakter**: Mencatat perilaku positif maupun pelanggaran karakter siswa beserta tindak lanjutnya.

### 🏫 3. Akun Admin / Kepala Sekolah (Role: `ADMIN` / `KEPSEK`)
* **Dasbor Kepala Sekolah / Admin**:
  * **Profil Sekolah**: Mengedit Identitas Sekolah, NPSN, Alamat, Logo, Nama Kepala Sekolah, dan NIP.
  * **Manajemen Guru & Tendik**: Tambah, edit, nonaktifkan, dan atur mata pelajaran yang diampu guru.
  * **Manajemen Siswa & Kelas**: Import data siswa via Excel/CSV, kenaikan kelas, dan penataan NISN.
  * **Kalender Akademik & Agenda**: Mengatur libur sekolah, ujian nasional/daerah, dan kegiatan tahunan.
  * **Ekspor & Cetak Laporan**: Ekspor Laporan Rapor, Rekap Absensi, dan Rekap Nilai ke format Excel / PDF / Google Docs.

---

## 3. 🔄 ALUR KERJA APLIKASI PER USER

### Alur Kerja Siswa:
1. Siswa login menggunakan NISN/Email.
2. Siswa melihat daftar tugas pada kelasnya.
3. Siswa menekan **"Kerjakan Tugas"** -> Status berubah menjadi `SEDANG_MENGERJAKAN`.
4. Siswa mengisi Google Form yang terbuka di modal interaktif.
5. Setelah mengirimkan Form, Google Apps Script pemicu (`onFormSubmit`) secara otomatis mengirimkan webhook payload berisi `student_email`, `assignment_id`, dan `score_text` ke backend `/api/webhooks/google-form`.
6. Status tugas siswa otomatis ter-update menjadi `SELESAI` dan nilainya tersimpan di Supabase table `student_assignments`.

### Alur Kerja Guru:
1. Guru membuat Tugas di Dasbor Guru -> Sistem menghasilkan `ID Tugas` unik.
2. Guru menekan tombol **"Salin Skrip Webhook (Apps Script)"** dan menempelkannya di Google Sheets / Google Form kuis terkait.
3. Guru memasang pemicu *On form submit* di Apps Script.
4. Guru memantau rekap nilai siswa yang masuk secara real-time di tabel rekapitulasi nilai guru.
5. Guru dapat mengedit atau memberi skor nilai susulan secara manual.

---

## 4. ⚙️ SISTEM MANAJEMEN MODUL KELAS KU

| Modul | Deskripsi & Entitas Database |
| :--- | :--- |
| **Profil Sekolah** | Menyimpan profil dasar sekolah, tahun ajaran aktif, semester (Ganjil/Genap), dan kop surat resmi. |
| **Manajemen Guru** | Pendataan NIP, NUPTK, Jabatan, Email, Mapel diampu, serta nomor kontak. |
| **Manajemen Siswa** | Pendataan NIS/NISN, Nama, Kelas, Jenis Kelamin, Orang Tua, dan status aktif. |
| **Manajemen Pelajaran & Jadwal** | Pemetaan Mata Pelajaran, Kelompok Kurikulum (Merdeka/K13), Jam Pelajaran, dan Ruangan. |
| **Manajemen Absensi** | Pencatatan kehadiran real-time harian & per jam pelajaran dengan persentase kehadiran otomatis. |
| **Manajemen Nilai & Asesmen** | Penilaian Formatif, Sumatif Lingkup Materi, Sumatif Akhir Semester (SAS), dan Nilai Rapor. |
| **Manajemen Tugas Siswa** | Pelacakan integrasi tugas kuis Google Form, status pengerjaan, dan waktu submit. |
| **Temuan Khusus / Karakter** | Jurnal perkembangan karakter siswa (catatan kedisiplinan, prestasi, dan bimbingan). |
| **Kalender Akademik** | Penjadwalan kegiatan sekolah, jadwal libur, dan agenda rapat/kegiatan kelas. |

---

## 5. 🛠️ PETUNJUK INSTALASI & DEPLOYMENT LENGKAP

### 💻 A. Instalasi di Localhost (PC / Laptop)

**Prasyarat**: Node.js versi 18.x atau lebih baru, NPM/Yarn.

1. **Clone / Extract Proyek**:
   ```bash
   git clone <repository-url>
   cd kelas-ku
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables (`.env`)**:
   Buat file `.env` di root direktori:
   ```env
   PORT=3000
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Jalankan Aplikasi Mode Development**:
   ```bash
   npm run dev
   ```
   Akses aplikasi melalui browser di `http://localhost:3000`.

---

### 🌐 B. Deploy di Cloud & Hosting (Vercel / Cloud Run / VPS)

#### 1. Deployment via Cloud Run / Docker Container:
Proyek ini sudah dilengkapi dengan `server.ts` Express yang mendukung Vite SSR/Static serving.
* Command Build: `npm run build`
* Command Start: `npm start` (menjalankan `node dist/server.cjs` pada port `3000`).

#### 2. Deployment via Vercel / Netlify:
* Set **Build Command**: `npm run build`
* Set **Output Directory**: `dist`
* Masukkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di Environment Variables dashboard Vercel.

---

### 🗄️ C. Koneksi Database Supabase (PostgreSQL)

1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Jalankan SQL Query Skema dari file modal skrip aplikasi pada **SQL Editor** Supabase:
   * Tabel yang dibuat: `profile_sekolah`, `data_guru`, `data_siswa`, `data_mapel`, `jadwal_pelajaran`, `student_assignments`, `tugas_siswa`, `presensi_siswa`, `catatan_karakter`.
3. Aktifkan **Row Level Security (RLS)** dan buat policy perizinan read/write publik untuk lingkungan sekolah.
4. Salun **Project URL** dan **Anon Key** ke `.env`.

---

### 🌐 D. Kustomisasi Domain

1. Buka pengaturan DNS pada penyedia domain Anda (Cloudflare, Niagahoster, Rumahweb, dll.).
2. Tambahkan **A Record** mengarah ke IP Server VPS / Cloud Run Anda, atau **CNAME Record** mengarah ke `cname.vercel-dns.com` jika menggunakan Vercel.
3. Aktifkan SSL / HTTPS otomatis via Let's Encrypt atau SSL bawaan Vercel/Cloudflare.

---

## 6. 📜 PERSETUJUAN PENGGUNA & LISENSI

### Persetujuan Pengguna (Terms of Use):
1. **Keamanan Data Nilai**: Hak akses pengisian dan pengubahan nilai kuis/asesmen siswa sepenuhnya milik Guru dan Administrator Sekolah. Siswa dilarang keras mencoba memanipulasi atau mengisi nilai secara manual.
2. **Kerahasiaan Akun**: Setiap pengguna bertanggung jawab menjaga kerahasiaan kata sandi/NISN/NIP masing-masing.
3. **Penggunaan Webhook**: Integrasi Google Apps Script hanya boleh digunakan untuk pengiriman nilai otomatis dari Google Form resmi sekolah.

### Lisensi (MIT License):
```
MIT License

Hak Cipta (c) 2026 KELAS KU - Sistem Manajemen Sekolah Digital.

Dengan ini diberikan izin, secara gratis, kepada siapa pun yang memperoleh salinan
perangkat lunak ini dan file dokumentasi terkait ("Perangkat Lunak"), untuk menggunakan,
mengubah, menggabungkan, memublikasikan, mendistribusikan, dan/atau menjual salinan Perangkat Lunak.
```

---

## 7. 📌 PANDUAN MONITORING BUG & INTEGRASI WEBHOOK

> **TROUBLESHOOTING UTAMA WEBHOOK GOOGLE FORM**:
> 
> Jika log Google Apps Script menunjukkan respon HTML `<!doctype html>` dengan pesan `Cookie check` atau `Action required to load your app`:
> * **Penyebab**: URL `ais-dev-...` / Preview AI Studio berada di belakang proteksi Cookie Sandbox browser yang menolak request server-to-server otomatis `UrlFetchApp`.
> * **Solusi Production**:
>   1. Jalankan aplikasi pada domain publik (Hosting / Vercel / Cloud Run / Domain Kustom).
>   2. Atau kirim data langsung dari Apps Script ke Rest API Supabase `student_assignments` menggunakan `SUPABASE_KEY` langsung.
>   3. Gunakan tombol **Fungsi Uji Coba (`testKirimWebhook`)** pada editor Apps Script untuk memverifikasi respon `HTTP 200 SUCCESS`.

---

*File `README.md` ini berfungsi sebagai acuan baku struktur database, alur kerja sistem, dan pedoman monitoring aplikasi KELAS KU.*
