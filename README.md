# SmartRoad
## Sistem Pelaporan Jalan Rusak Berbasis Web Service

SmartRoad adalah platform berbasis web yang dirancang untuk membantu masyarakat melaporkan kerusakan jalan secara digital kepada pihak terkait seperti pemerintah daerah atau dinas perhubungan.

Sistem ini memanfaatkan konsep RESTful Web Service sebagai penghubung antara frontend, backend, dan database sehingga proses pelaporan menjadi lebih cepat, transparan, dan terorganisir.

---

# Latar Belakang

Kerusakan jalan merupakan salah satu permasalahan infrastruktur yang sering terjadi dan dapat berdampak langsung terhadap aktivitas masyarakat. Jalan berlubang, banjir, lampu jalan mati, dan marka jalan yang rusak dapat menyebabkan kecelakaan, kemacetan, hingga kerusakan kendaraan.

Proses pelaporan kerusakan jalan yang masih dilakukan secara manual sering kali membutuhkan waktu lama dan sulit dipantau perkembangannya. Selain itu, data laporan biasanya tidak terdokumentasi dengan baik sehingga menyulitkan proses monitoring dan tindak lanjut.

Berdasarkan permasalahan tersebut, SmartRoad dikembangkan sebagai solusi digital untuk mempermudah masyarakat dalam membuat laporan kerusakan jalan secara online dan membantu pemerintah dalam melakukan monitoring serta pengelolaan data laporan secara terintegrasi.

---

# Tujuan Sistem

Tujuan dari pengembangan SmartRoad adalah:

- Mempermudah masyarakat dalam melaporkan kerusakan jalan.
- Membantu pemerintah memonitor kondisi infrastruktur jalan.
- Meningkatkan transparansi proses penanganan laporan.
- Menyediakan sistem pelaporan yang cepat dan terdokumentasi.
- Mendukung implementasi konsep smart city.

---

# Pengguna Sistem

## User / Masyarakat

Pengguna umum dapat menggunakan sistem untuk:

- Membuat laporan kerusakan jalan.
- Mengunggah foto kondisi jalan.
- Melihat status laporan.
- Memantau progres penanganan laporan.

## Admin / Petugas

Admin bertugas untuk:

- Mengelola seluruh laporan.
- Memverifikasi laporan yang masuk.
- Memperbarui status laporan.
- Melakukan monitoring data dan statistik.

---

# Fitur Utama

## 1. Registrasi dan Login

Sistem menyediakan fitur autentikasi untuk pengguna dan admin.

Fungsi:
- menjaga keamanan sistem,
- membedakan hak akses pengguna,
- melindungi data laporan.

Fitur:
- register,
- login,
- logout,
- session authentication.

---

# 2. Pelaporan Jalan Rusak

Pengguna dapat membuat laporan kerusakan jalan secara detail.

Data laporan meliputi:
- judul laporan,
- kategori kerusakan,
- deskripsi,
- lokasi,
- foto,
- tingkat kerusakan.

Kategori laporan:
- jalan berlubang,
- jalan retak,
- banjir,
- lampu jalan mati,
- marka jalan rusak,
- pohon tumbang.

---

# 3. Upload Foto

Pengguna dapat mengunggah gambar kondisi jalan sebagai bukti visual.

Fungsi:
- membantu proses verifikasi,
- meningkatkan akurasi laporan,
- mempermudah analisis kerusakan.

---

# 4. Integrasi Maps

Sistem menggunakan layanan maps untuk menentukan lokasi kerusakan jalan.

Teknologi yang digunakan:
- Google Maps API,
- Leaflet OpenStreetMap.

Fungsi:
- menampilkan titik lokasi kerusakan,
- mempermudah petugas menemukan lokasi,
- membantu visualisasi data laporan.

---

# 5. Dashboard User

Dashboard pengguna digunakan untuk melihat seluruh aktivitas laporan.

Fitur:
- riwayat laporan,
- status laporan,
- notifikasi update,
- monitoring progres penanganan.

---

# 6. Dashboard Admin

Dashboard admin digunakan untuk mengelola seluruh laporan yang masuk.

Fitur:
- melihat seluruh laporan,
- filter laporan,
- update status laporan,
- monitoring statistik,
- visualisasi maps.

---

# 7. Status Laporan

Admin dapat memperbarui status laporan menjadi:
- Menunggu Verifikasi,
- Diproses,
- Dalam Perbaikan,
- Selesai.

Fitur ini membantu masyarakat memantau perkembangan penanganan laporan secara realtime.

---

# 8. Statistik dan Monitoring

Sistem menyediakan visualisasi data dalam bentuk grafik dan statistik.

Fungsi:
- monitoring jumlah laporan,
- analisis wilayah dengan kerusakan terbanyak,
- membantu pengambilan keputusan.

Visualisasi:
- bar chart,
- pie chart,
- line chart.

---

# Konsep Web Service

SmartRoad menggunakan konsep RESTful API sebagai penghubung antara frontend dan backend.

REST API digunakan untuk:
- menerima request,
- mengirim response,
- mengelola data,
- menghubungkan sistem dengan database.

Format data menggunakan JSON.

Contoh response API:

```json
{
  "judul": "Jalan Berlubang",
  "status": "Diproses"
}
```

---

# Arsitektur Sistem

```text
User/Admin
     ↓
Frontend Website
     ↓
REST API / Web Service
     ↓
Backend Server
     ↓
Database MySQL
```

---

# Teknologi yang Digunakan

## Frontend
- HTML5
- CSS3
- Bootstrap 5
- JavaScript

## Backend
- PHP Native / Laravel
- Node.js Express

## Database
- MySQL

## API
- RESTful API
- JSON

## Maps
- Google Maps API
- Leaflet.js

---

# Struktur Project

```bash
smartroad/
│
├── index.html
├── login.html
├── register.html
├── dashboard-user.html
├── dashboard-admin.html
├── laporan.html
├── detail-laporan.html
│
├── css/
│   └── style.css
│
├── js/
│   └── script.js
│
├── assets/
│   ├── img/
│   └── icons/
│
└── components/
    ├── navbar.html
    └── footer.html
```

---

# Contoh Endpoint API

## Login
```http
POST /api/login
```

## Register
```http
POST /api/register
```

## Tambah Laporan
```http
POST /api/laporan
```

## Ambil Semua Laporan
```http
GET /api/laporan
```

## Detail Laporan
```http
GET /api/laporan/{id}
```

## Update Status
```http
PUT /api/laporan/{id}
```

## Hapus Laporan
```http
DELETE /api/laporan/{id}
```

---

# Struktur Database

## Tabel User

```sql
id
nama
email
password
role
created_at
```

## Tabel Laporan

```sql
id
user_id
judul
kategori
deskripsi
foto
latitude
longitude
status
created_at
```

---

# Alur Sistem

```text
1. User melakukan login
2. User membuat laporan jalan rusak
3. Data dikirim ke REST API
4. Backend memproses data
5. Data disimpan ke database
6. Admin melihat laporan
7. Admin memperbarui status
8. User menerima notifikasi
```

---

# Keunggulan Sistem

- Menggunakan REST API.
- Responsive design.
- Mendukung konsep smart city.
- Memiliki fitur CRUD lengkap.
- Mendukung upload gambar.
- Integrasi maps.
- Monitoring realtime.
- Mudah dikembangkan menjadi aplikasi mobile.

---

# Pengembangan Sistem

Pengembangan yang dapat ditambahkan pada sistem:

## AI Detection
Mendeteksi kerusakan jalan otomatis dari gambar menggunakan AI.

## Heatmap Kerusakan
Menampilkan wilayah dengan tingkat kerusakan tertinggi.

## Mobile Application
Pengembangan aplikasi Android dan iOS.

## Realtime Notification
Menggunakan WebSocket atau Firebase.

## Smart City Integration
Terintegrasi dengan sistem pemerintah daerah.

---

# Kesimpulan

SmartRoad merupakan sistem pelaporan jalan rusak berbasis web yang memanfaatkan teknologi RESTful Web Service untuk membantu proses pelaporan, monitoring, dan pengelolaan kerusakan infrastruktur jalan secara digital.

Sistem ini diharapkan dapat meningkatkan efektivitas komunikasi antara masyarakat dan pemerintah serta mendukung terciptanya layanan publik yang lebih modern, cepat, transparan, dan terintegrasi.