# Dokumentasi API dan Endpoint SmartRoad

Dokumen ini dibuat untuk menjelaskan **di mana letak API**, **apa saja endpoint-nya**, dan **file frontend mana yang memanggil endpoint tersebut**.

## Jawaban Singkat

API backend berada di folder:

```text
app/routes/
```

Prefix URL API didaftarkan di:

```text
app/__init__.py
```

Contoh registrasi prefix:

```python
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(profile_bp, url_prefix='/api/profile')
app.register_blueprint(report_bp, url_prefix='/api/reports')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
```

Artinya:

- Route di `auth_routes.py` akan menjadi `/api/auth/...`
- Route di `profile_routes.py` akan menjadi `/api/profile/...`
- Route di `report_routes.py` akan menjadi `/api/reports/...`
- Route di `admin_routes.py` akan menjadi `/api/admin/...`

## Daftar File Route Backend

| File | Isi |
|---|---|
| `app/routes/auth_routes.py` | Endpoint login dan register |
| `app/routes/profile_routes.py` | Endpoint profil user |
| `app/routes/report_routes.py` | Endpoint laporan, chat CS, notifikasi, review, tugas petugas |
| `app/routes/admin_routes.py` | Endpoint khusus admin |
| `app/routes/view_routes.py` | Route halaman HTML seperti `/`, `/login.html`, `/dashboard.html` |

## Tech Stack yang Digunakan

### Backend

| Teknologi | Fungsi | Lokasi |
|---|---|---|
| Python | Bahasa utama backend | File `.py` |
| Flask | Framework web backend | `app/__init__.py`, `app/routes/` |
| Flask Blueprint | Memisahkan route per modul | `app/routes/*.py` |
| Flask-CORS | Mengizinkan akses API dari frontend/local development | `app/__init__.py` |
| Flask-JWT-Extended | Autentikasi JWT dan role claim | `app/__init__.py`, route yang memakai `@jwt_required()` |
| PyMongo/MongoDB | Database user, laporan, notifikasi, chat | `app/db.py`, `app/controllers/` |
| bcrypt | Hash dan verifikasi password | `app/controllers/auth_controller.py`, `app/controllers/profile_controller.py` |
| Werkzeug `secure_filename` | Mengamankan nama file upload | `app/controllers/profile_controller.py`, `app/controllers/report_controller.py` |

### Frontend

| Teknologi | Fungsi | Lokasi |
|---|---|---|
| HTML | Struktur halaman | `templates/` |
| CSS | Styling aplikasi | `css/style.css` |
| JavaScript | Logic frontend dan request API | `static/js/`, `js/script.js` |
| Fetch API | Request HTTP ke backend/API eksternal | `static/js/*.js`, `templates/index.html` |
| Session Storage | Menyimpan JWT dan data sesi user per tab | `static/js/auth.js`, `static/js/auth-utility.js` |
| SweetAlert2 | Alert login/register/logout dan notifikasi UI | Dipakai dari file JS frontend |
| Lucide Icons | Icon UI | Dipakai di template dan JS frontend |
| Tailwind/CDN utility class | Styling di beberapa template | `templates/*.html` |

### API Eksternal

| API | Fungsi | Lokasi |
|---|---|---|
| Emsifa API Wilayah Indonesia | Data provinsi, kota/kabupaten, kecamatan | `static/js/laporan.js` |
| UI Avatars | Membuat avatar otomatis dari nama/email | Banyak file HTML dan JS |
| RandomUser Portraits | Gambar avatar testimoni statis | `templates/index.html` |

## Cara Membaca Endpoint

Contoh di `app/routes/auth_routes.py`:

```python
@auth_bp.route('/login', methods=['POST'])
```

Karena `auth_bp` didaftarkan dengan prefix `/api/auth`, maka endpoint akhirnya adalah:

```text
POST /api/auth/login
```

## Endpoint Auth

Lokasi:

```text
app/routes/auth_routes.py
```

Prefix:

```text
/api/auth
```

| Method | Endpoint | Fungsi | Dipakai di |
|---|---|---|---|
| `POST` | `/api/auth/register` | Registrasi user baru | `static/js/auth.js` |
| `POST` | `/api/auth/login` | Login dan mengambil JWT token | `static/js/auth.js` |

Payload register:

```json
{
  "nama": "Nama User",
  "email": "user@email.com",
  "password": "password",
  "confirm_password": "password"
}
```

Payload login:

```json
{
  "email": "user@email.com",
  "password": "password"
}
```

## Endpoint Profile

Lokasi:

```text
app/routes/profile_routes.py
```

Prefix:

```text
/api/profile
```

Semua endpoint profile membutuhkan login/JWT.

| Method | Endpoint | Fungsi | Dipakai di |
|---|---|---|---|
| `GET` | `/api/profile/user-profile` | Mengambil data profil user | `dashboard.js`, `laporan.js`, `profile.js`, `petugas.js`, `navbar-manager.js` |
| `POST` | `/api/profile/update-profile` | Mengubah nama, telepon, alamat | `static/js/profile.js` |
| `POST` | `/api/profile/update-password` | Mengubah password | `static/js/profile.js` |
| `POST` | `/api/profile/upload-photo` | Upload foto profil | `static/js/profile.js` |

Payload update profile:

```json
{
  "nama": "Nama Baru",
  "telepon": "08123456789",
  "alamat": "Alamat user"
}
```

Payload update password:

```json
{
  "old_password": "password_lama",
  "new_password": "password_baru"
}
```

Upload foto profil menggunakan:

```text
multipart/form-data
field: photo
```

## Endpoint Reports atau Laporan

Lokasi:

```text
app/routes/report_routes.py
```

Prefix:

```text
/api/reports
```

| Method | Endpoint | Role | Fungsi | Dipakai di |
|---|---|---|---|---|
| `GET` | `/api/reports/public-summary` | Publik | Statistik dan ringkasan laporan untuk halaman utama | `templates/index.html` |
| `POST` | `/api/reports/submit` | User login | Mengirim laporan kerusakan jalan | `static/js/laporan.js` |
| `GET` | `/api/reports/user` | User login | Mengambil laporan milik user login | `static/js/riwayat.js`, `static/js/cs-chat.js` |
| `POST` | `/api/reports/<report_id>/review` | Pemilik laporan | Memberi review laporan selesai | `static/js/riwayat.js` |
| `GET` | `/api/reports/<report_id>/cs-messages` | User/Admin | Mengambil pesan chat CS | `riwayat.js`, `cs-chat.js`, `admin-dashboard.js` |
| `POST` | `/api/reports/<report_id>/cs-messages` | User/Admin | Mengirim pesan chat CS | `riwayat.js`, `cs-chat.js`, `admin-dashboard.js` |
| `GET` | `/api/reports/notifications/user` | User login | Mengambil notifikasi user | `auth-utility.js`, `petugas.js` |
| `PUT` | `/api/reports/notifications/user/read` | User login | Menandai notifikasi sudah dibaca | `auth-utility.js`, `petugas.js` |
| `GET` | `/api/reports/all` | Admin | Mengambil semua laporan | `static/js/admin-dashboard.js` |
| `PUT` | `/api/reports/<report_id>/status` | Admin | Mengubah status laporan | `static/js/admin-dashboard.js` |
| `GET` | `/api/reports/cs/conversations` | Admin | Mengambil daftar percakapan CS | `static/js/admin-dashboard.js` |
| `GET` | `/api/reports/assigned` | Petugas | Mengambil laporan yang ditugaskan | `static/js/petugas.js` |
| `POST` | `/api/reports/<report_id>/complete` | Petugas | Menyelesaikan laporan dan upload bukti | `static/js/petugas.js` |

Payload submit laporan menggunakan:

```text
multipart/form-data
```

Field yang dikirim:

```text
photo
title
address
province
city
district
category
hazard_level
dimensions
description
lat
lng
```

Payload update status laporan:

```json
{
  "status": "Proses",
  "assigned_petugas_email": "petugas@email.com"
}
```

Status yang valid:

```text
Menunggu
Proses
Selesai
```

Payload review laporan:

```json
{
  "rating": 5,
  "review_text": "Perbaikan sangat baik",
  "reviewer_name": "Nama Reviewer"
}
```

Payload kirim chat CS:

```json
{
  "message": "Isi pesan",
  "sender_name": "Nama Pengirim"
}
```

Upload bukti penyelesaian laporan menggunakan:

```text
multipart/form-data
field: photo
field opsional: completion_note
```

## Endpoint Admin

Lokasi:

```text
app/routes/admin_routes.py
```

Prefix:

```text
/api/admin
```

Semua endpoint admin membutuhkan login dengan role `admin`.

| Method | Endpoint | Fungsi | Dipakai di |
|---|---|---|---|
| `GET` | `/api/admin/dashboard-stats` | Mengambil statistik dashboard contoh | Belum ditemukan pemanggilan frontend |
| `GET` | `/api/admin/users` | Mengambil semua user | `static/js/admin-dashboard.js` |
| `GET` | `/api/admin/petugas` | Mengambil daftar petugas | `static/js/admin-dashboard.js` |

### API Admin Lengkap

Bagian ini khusus menjelaskan API Admin secara lebih lengkap, mulai dari base API, endpoint, autentikasi, role, payload, response, sampai lokasi kode.

#### Base API Admin

```text
/api/admin
```

#### File yang Berhubungan dengan Admin

| Jenis | Lokasi | Keterangan |
|---|---|---|
| Registrasi prefix API | `app/__init__.py` | Mendaftarkan `admin_bp` dengan prefix `/api/admin` |
| Route admin | `app/routes/admin_routes.py` | Tempat endpoint admin didefinisikan |
| Middleware role admin | `app/utils/decorators.py` | Berisi decorator `admin_required()` |
| Frontend admin | `static/js/admin-dashboard.js` | File JS yang memanggil API admin dan API laporan untuk dashboard admin |
| Template admin | `templates/dashboard-admin.html` | Halaman dashboard admin |

#### Autentikasi Admin

Endpoint admin dilindungi oleh dua decorator:

```python
@jwt_required()
@admin_required()
```

Artinya:

- User harus sudah login.
- Request harus membawa JWT token.
- JWT token harus memiliki claim `role` bernilai `admin`.

Header yang wajib dikirim:

```http
Authorization: Bearer <jwtToken>
```

Token admin didapat dari endpoint login:

```text
POST /api/auth/login
```

Saat login berhasil, backend mengembalikan:

```json
{
  "status": "success",
  "access_token": "JWT_TOKEN",
  "user_data": {
    "email": "admin@email.com",
    "role": "admin"
  }
}
```

Frontend menyimpan token di:

```text
sessionStorage.jwtToken
```

Dan role admin di:

```text
sessionStorage.userRole
```

#### Guard Halaman Admin

File:

```text
static/js/auth-guard.js
```

Halaman admin dicek dari URL:

```javascript
const isAdminPage = window.location.pathname.includes('dashboard-admin');
```

Jika user membuka halaman admin tetapi role bukan `admin`, user akan diarahkan ke:

```text
login.html
```

#### Helper Request Admin

File:

```text
static/js/auth-guard.js
```

Helper:

```javascript
window.authFetch(url, options)
```

Fungsi helper ini:

- Mengambil token dari `sessionStorage.jwtToken`.
- Menambahkan header `Authorization`.
- Mengirim request menggunakan `fetch`.
- Redirect ke `login.html` jika token invalid, expired, atau tidak punya akses.

Contoh pemakaian:

```javascript
const response = await window.authFetch('/api/admin/users');
```

#### Endpoint Admin: Dashboard Stats

```http
GET /api/admin/dashboard-stats
```

Fungsi:

Mengambil statistik dashboard admin.

Autentikasi:

```text
Wajib JWT
Role: admin
```

Payload:

```text
Tidak ada
```

Contoh response sukses:

```json
{
  "status": "success",
  "data": {
    "total_users": 150,
    "total_reports": 45,
    "active_admins": 3
  }
}
```

Lokasi backend:

```text
app/routes/admin_routes.py
```

Catatan:

Endpoint ini sudah tersedia di backend, tetapi belum ditemukan pemanggilan langsung dari frontend.

#### Endpoint Admin: Users

```http
GET /api/admin/users
```

Fungsi:

Mengambil semua data user tanpa field password.

Autentikasi:

```text
Wajib JWT
Role: admin
```

Payload:

```text
Tidak ada
```

Contoh response sukses:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "id_user",
      "nama": "Nama User",
      "email": "user@email.com",
      "role": "user",
      "telepon": "08123456789",
      "alamat": "Alamat user",
      "created_at": "tanggal dibuat"
    }
  ]
}
```

Lokasi backend:

```text
app/routes/admin_routes.py
```

Dipakai frontend di:

```text
static/js/admin-dashboard.js
```

Potongan pemanggilan:

```javascript
const response = await window.authFetch('/api/admin/users');
```

#### Endpoint Admin: Petugas

```http
GET /api/admin/petugas
```

Fungsi:

Mengambil daftar user dengan role `petugas`.

Autentikasi:

```text
Wajib JWT
Role: admin
```

Payload:

```text
Tidak ada
```

Contoh response sukses:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "id_petugas",
      "nama": "Nama Petugas",
      "email": "petugas@email.com",
      "telepon": "08123456789",
      "alamat": "Alamat petugas"
    }
  ]
}
```

Lokasi backend:

```text
app/routes/admin_routes.py
```

Dipakai frontend di:

```text
static/js/admin-dashboard.js
```

Potongan pemanggilan:

```javascript
const response = await window.authFetch('/api/admin/petugas');
```

#### Endpoint Laporan yang Dipakai Admin

Selain endpoint dengan prefix `/api/admin`, halaman admin juga memakai beberapa endpoint laporan dari prefix `/api/reports`.

| Method | Endpoint | Fungsi | Auth |
|---|---|---|---|
| `GET` | `/api/reports/all` | Mengambil semua laporan | JWT admin |
| `PUT` | `/api/reports/<report_id>/status` | Mengubah status laporan | JWT admin |
| `GET` | `/api/reports/cs/conversations` | Mengambil semua percakapan CS | JWT admin |
| `GET` | `/api/reports/<report_id>/cs-messages` | Mengambil pesan CS pada laporan tertentu | JWT admin atau pemilik laporan |
| `POST` | `/api/reports/<report_id>/cs-messages` | Mengirim pesan CS sebagai admin | JWT admin atau pemilik laporan |

Lokasi route:

```text
app/routes/report_routes.py
```

Lokasi pemanggilan frontend:

```text
static/js/admin-dashboard.js
```

Payload update status laporan:

```json
{
  "status": "Proses",
  "assigned_petugas_email": "petugas@email.com"
}
```

Jika status diubah menjadi `Proses`, maka `assigned_petugas_email` wajib dikirim.

Status yang valid:

```text
Menunggu
Proses
Selesai
```

Payload kirim pesan CS:

```json
{
  "message": "Isi pesan dari admin",
  "sender_name": "Admin CS"
}
```

#### Kemungkinan Error Admin

| Status | Penyebab |
|---|---|
| `401` | Token tidak ada, salah, atau sudah tidak valid |
| `403` | User login tetapi role bukan `admin` |
| `404` | Data yang dicari tidak ditemukan |
| `500` | Database tidak terhubung atau terjadi error server |

## Route Halaman Web

Lokasi:

```text
app/routes/view_routes.py
```

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/` | Menampilkan `templates/index.html` |
| `GET` | `/<page>.html` | Menampilkan template HTML sesuai nama halaman |

Contoh:

| URL | Template |
|---|---|
| `/login.html` | `templates/login.html` |
| `/register.html` | `templates/register.html` |
| `/dashboard.html` | `templates/dashboard.html` |
| `/dashboard-admin.html` | `templates/dashboard-admin.html` |
| `/laporan.html` | `templates/laporan.html` |
| `/riwayat.html` | `templates/riwayat.html` |
| `/profile.html` | `templates/profile.html` |
| `/petugas.html` | `templates/petugas.html` |

## File Frontend yang Memanggil API

| File frontend | Endpoint yang dipanggil |
|---|---|
| `static/js/auth.js` | `/api/auth/login`, `/api/auth/register` |
| `static/js/dashboard.js` | `/api/profile/user-profile` |
| `static/js/laporan.js` | `/api/profile/user-profile`, `/api/reports/submit` |
| `static/js/profile.js` | `/api/profile/user-profile`, `/api/profile/update-profile`, `/api/profile/update-password`, `/api/profile/upload-photo` |
| `static/js/riwayat.js` | `/api/reports/user`, `/api/reports/<report_id>/cs-messages`, `/api/reports/<report_id>/review` |
| `static/js/cs-chat.js` | `/api/reports/user`, `/api/reports/<report_id>/cs-messages` |
| `static/js/petugas.js` | `/api/profile/user-profile`, `/api/reports/notifications/user`, `/api/reports/notifications/user/read`, `/api/reports/assigned`, `/api/reports/<report_id>/complete` |
| `static/js/admin-dashboard.js` | `/api/reports/all`, `/api/admin/users`, `/api/admin/petugas`, `/api/reports/cs/conversations`, `/api/reports/<report_id>/cs-messages`, `/api/reports/<report_id>/status` |
| `static/js/navbar-manager.js` | `/api/profile/user-profile` |
| `templates/index.html` | `/api/reports/public-summary` |

## Helper Request API di Frontend

Ada 3 helper utama untuk request API:

| Helper | Lokasi | Keterangan |
|---|---|---|
| `ApiService.post()` | `static/js/api.js` | Dipakai untuk login dan register |
| `fetchWithAuth()` | `static/js/auth-utility.js` | Dipakai untuk request API yang butuh login |
| `window.authFetch()` | `static/js/auth-guard.js` | Dipakai di halaman admin |

Endpoint yang butuh login mengirim header:

```http
Authorization: Bearer <jwtToken>
```

Token disimpan di:

```text
sessionStorage.jwtToken
```

## API Eksternal

Selain API backend sendiri, frontend juga memakai API eksternal berikut:

| API | Lokasi | Fungsi |
|---|---|---|
| `https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json` | `static/js/laporan.js` | Data provinsi |
| `https://www.emsifa.com/api-wilayah-indonesia/api/regencies/<idProvinsi>.json` | `static/js/laporan.js` | Data kota/kabupaten |
| `https://www.emsifa.com/api-wilayah-indonesia/api/districts/<idKota>.json` | `static/js/laporan.js` | Data kecamatan |
| `https://ui-avatars.com/api/` | Banyak file HTML dan JS | Membuat avatar otomatis |
| `https://randomuser.me/api/portraits/...` | `templates/index.html` | Gambar avatar testimoni |

## Lokasi Upload File

| Jenis upload | Lokasi penyimpanan |
|---|---|
| Foto profil | `static/uploads/` |
| Foto laporan | `static/uploads/reports/` |
| Foto bukti perbaikan | `static/uploads/repairs/` |

Format gambar yang diperbolehkan:

```text
jpg
jpeg
png
webp
```

Ukuran maksimal:

```text
5 MB
```

## Ringkasan Paling Penting

Kalau ingin mencari endpoint backend, buka folder:

```text
app/routes/
```

Kalau ingin melihat prefix endpoint, buka:

```text
app/__init__.py
```

Kalau ingin melihat file frontend yang memanggil API, buka:

```text
static/js/
```
