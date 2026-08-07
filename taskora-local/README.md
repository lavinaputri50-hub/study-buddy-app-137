# Taskora — Paket Lokal (Express.js + MySQL)

Versi mandiri Taskora untuk dijalankan di komputer sendiri dengan XAMPP/Laragon.
Folder ini **terpisah** dari aplikasi React yang berjalan di preview Lovable.

```
taskora-local/
├── backend/            # Node.js + Express + MySQL (REST API)
│   ├── server.js
│   ├── db.js
│   ├── middleware/auth.js
│   ├── routes/{auth,tasks,schedules,profile}.js
│   └── .env.example
├── database/
│   └── taskora.sql     # skema + data contoh
└── frontend/           # HTML + CSS + JS murni
    ├── index.html  (login/register)
    ├── dashboard.html, schedule.html, tasks.html, progress.html, settings.html
    ├── css/style.css
    └── js/{api,auth,dashboard,schedule,tasks,progress,settings}.js
```

## Cara menjalankan

1. Nyalakan MySQL di XAMPP/Laragon, lalu impor `database/taskora.sql` (phpMyAdmin atau
   `mysql -u root -p < database/taskora.sql`).
2. `cd backend && cp .env.example .env` lalu sesuaikan kredensial MySQL.
3. `npm install && npm run dev` → API jalan di `http://localhost:4000`.
4. Buka folder `frontend` dengan Live Server (atau `npx serve frontend`) di
   `http://localhost:5500`. Base URL API diatur di `frontend/js/api.js`.

Akun contoh: `demo@taskora.id` / `password123`

## Endpoint REST

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/api/auth/register` | Daftar akun |
| POST | `/api/auth/login` | Login, mengembalikan JWT |
| GET | `/api/profile` | Profil user aktif |
| PUT | `/api/profile` | Update nama/foto/bahasa/tema |
| GET/POST | `/api/tasks` | List / tambah tugas |
| GET/PUT/DELETE | `/api/tasks/:id` | Detail / edit / hapus tugas |
| GET | `/api/tasks/stats/summary` | Statistik & persentase progres |
| GET/POST | `/api/schedules` | List / tambah jadwal |
| PUT/DELETE | `/api/schedules/:id` | Edit / hapus jadwal |

Semua endpoint kecuali `/api/auth/*` membutuhkan header
`Authorization: Bearer <token>`.

## Catatan Laravel

Bila nanti ingin deploy dengan Laravel, gunakan `database/taskora.sql` sebagai
acuan migration, dan pindahkan tiap file di `backend/routes/` menjadi Controller
Laravel dengan route `routes/api.php` yang sama persis. Kontrak JSON API tidak
perlu berubah sehingga folder `frontend/` bisa dipakai kembali apa adanya.
