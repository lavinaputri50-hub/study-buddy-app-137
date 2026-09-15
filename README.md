# Study Flow

Prompt Pembuatan Aplikasi Taskora

Buatkan aplikasi web full-stack bernama Taskora dengan konsep Study Planner & Task Management Dashboard untuk membantu pelajar dan mahasiswa mengatur jadwal belajar, tugas, dan progres penyelesaian tugas yang akan di deploy menggunakan framework laravel.

Gunakan teknologi berikut:

Frontend: HTML, CSS, JavaScript

Backend: Node.js + Express.js

Database: MySQL (XAMPP/Laragon)

Arsitektur: Pisahkan folder frontend, backend, dan database

Komunikasi: REST API

UI: Modern, clean, minimalis, responsif (desktop, tablet, dan mobile), dengan nuansa warna ungu (#6C4DF6), putih, dan abu-abu muda.

Buat struktur project yang rapi seperti:

Taskora/
│
├── frontend/
│ ├── index.html
│ ├── login.html
│ ├── dashboard.html
│ ├── schedule.html
│ ├── task.html
│ ├── progress.html
│ ├── settings.html
│ ├── css/
│ ├── js/
│ └── assets/
│
├── backend/
│ ├── server.js
│ ├── db.js
│ ├── routes/
│ ├── controllers/
│ ├── models/
│ └── package.json
│
└── database/
└── taskora.sql

Fitur Umum

Login pengguna

Logout

CRUD tugas (Create, Read, Update, Delete)

Penyimpanan data ke MySQL

Progress otomatis berdasarkan tugas selesai

Statistik tugas

Jadwal pelajaran mingguan

Sidebar/navbar kiri muncul di semua halaman

Ikon notifikasi kecil (jika deadline tugas mepet 2 hari maka muncul notif
)

Ikon profil kecil

Desain konsisten di seluruh halaman

Animasi halus (hover, card, modal)

Responsive layout

Halaman Login

Buat halaman login yang elegan dan modern.

Komponen:

Logo Taskora

Tagline aplikasi:
“Organize Your Study, Achieve Your Goals.”

Input Email

Input Password

Tombol Login

Link “Forgot Password?”

Link “Create Account”

Background dengan ilustrasi belajar atau bentuk geometris modern.

Setelah login berhasil, pengguna diarahkan ke halaman Dashboard.

Sidebar / Navbar Kiri

Sidebar harus tampil di setiap halaman.

Isi menu:

Dashboard

Schedule

Tasks

Progress

Settings

Logout (di bagian bawah)

Sidebar memiliki ikon dan efek hover.

Halaman Dashboard

Tampilkan ringkasan aktivitas pengguna.

Bagian atas:

Sapaan:
Hello, Student 👋

Ikon profil kecil di kanan atas

Ikon notifikasi kecil di samping profil

Statistik dalam bentuk card:

Total Tasks

Total Completed

Total Progress (%)

Di bawah card tampilkan Checklist Tugas Deadline Terdekat.

Setiap item berisi:

Checkbox

Nama tugas

Deadline

Badge prioritas (High / Medium / Low)

Tambahkan progress bar visual.

Tambahkan container motivasi singkat seperti:

“One task at a time. You’re closer than you think.”

Halaman Schedule

Buat halaman jadwal pelajaran mingguan.

Tampilkan tabel atau card dari Senin–Sabtu.

Setiap hari dapat diisi pengguna.

Format setiap jadwal:

Mata pelajaran

Waktu mulai

Waktu selesai

Contoh:

Senin

Matematika (08:00–09:30)

Biologi (10:00–11:30)

Fitur:

Tambah jadwal

Edit jadwal

Hapus jadwal

Data tersimpan di database.

Halaman Tasks

Bagian atas:

Judul My Tasks

Tombol + Tambah Tugas di pojok kanan atas

Ketika tombol ditekan, tampilkan modal/form.

Form tambah tugas:

Nama Tugas

Deskripsi

Deadline

Prioritas (High / Medium / Low)

Daftar tugas ditampilkan dalam card/list.

Setiap tugas berisi:

Checkbox

Nama tugas

Deadline

Badge status:

Belum Selesai

Selesai

Badge prioritas

Ikon titik tiga (⋮)

Saat ikon titik tiga diklik, muncul dropdown:

Detail Tugas

Edit

Hapus

Halaman detail tugas menampilkan:

Nama tugas

Deskripsi

Deadline

Prioritas

Status

Tanggal dibuat

Halaman Progress

Tampilkan ringkasan produktivitas.

Bagian atas:

Judul Progress

Komponen:

Persentase Penyelesaian Tugas

Progress circle atau progress bar besar.

Statistik Tugas

Grafik batang atau donat (Chart.js).

Card Ringkasan

Tugas Selesai

Tugas Belum Selesai

Total Tugas

Container Motivasi
Di bagian bawah halaman tampilkan kata-kata motivasi yang berubah secara acak.

Contoh:

“Small progress is still progress.”

“Discipline beats motivation.”

“Keep learning, your future self will thank you.”

Halaman Settings

Buat halaman pengaturan umum.

Komponen:

Ubah Nama

Ubah Email

Ubah Password

Foto Profil

Mode Gelap / Mode Terang

Bahasa

Simpan Perubahan

Halaman Logout

Saat menu Logout dipilih, tampilkan dialog konfirmasi.

Pesan:

“Apakah kamu yakin ingin keluar dari akun Taskora?”

Tombol:

Cancel

Logout

Jika Logout dipilih:

Session dihapus

Kembali ke halaman Login

Database MySQL

Buat database taskora.

Minimal tabel:

users

tasks

schedules

notifications

Relasi:

Satu user memiliki banyak task

Satu user memiliki banyak jadwal

Backend API

Buat REST API lengkap.

Contoh endpoint:

Auth

POST /login

POST /logout

POST /register

Tasks

GET /tasks

POST /tasks

PUT /tasks/:id

DELETE /tasks/:id

Schedule

GET /schedule

POST /schedule

PUT /schedule/:id

DELETE /schedule/:id

Progress

GET /progress

Settings

PUT /settings

UI/UX

Gunakan:

Card dengan border radius besar

Shadow lembut

Animasi hover

Transisi halus

Font modern (Poppins atau Inter)

Ikon dari Font Awesome atau Lucide

Layout seperti aplikasi produktivitas modern (Notion, Todoist, Trello)

Output yang diinginkan

Berikan seluruh source code lengkap, dipisahkan per file (frontend, backend, dan database), beserta penjelasan fungsi setiap file dan cara menjalankan aplikasi menggunakan VS Code + Node.js + XAMPP/Laragon hingga aplikasi Taskora dapat berjalan penuh dan terhubung dengan database MySQL.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://study-buddy-app-137.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/29d93147-9ef8-4b3d-820d-84648b0b5344).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
