# 🛍️ Produk.app — CRUD PHP + GitHub Pages

Aplikasi manajemen produk sederhana dengan arsitektur:
- **Frontend** → GitHub Pages (gratis)
- **Backend** → InfinityFree (PHP + MySQL, gratis)

---

## 📁 Struktur Project

```
project/
├── frontend/
│   └── index.html          ← push ke repo GitHub Pages
│
└── backend/
    ├── api/
    │   └── products.php    ← REST API endpoint
    ├── config/
    │   ├── database.php    ← konfigurasi DB
    │   └── helpers.php     ← fungsi CORS & response
    ├── .htaccess
    └── database.sql        ← buat tabel di phpMyAdmin
```

---

## 🚀 Cara Deploy

### Backend (InfinityFree)

1. Daftar di [infinityfree.com](https://infinityfree.com) → buat hosting baru
2. Masuk **cPanel** → **MySQL Databases** → buat database baru
3. Buka **phpMyAdmin** → pilih database → tab **SQL** → paste isi `database.sql` → klik **Go**
4. Edit `backend/config/database.php` → isi `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` sesuai data InfinityFree
5. Upload folder `backend/` ke `htdocs/` menggunakan **File Manager** cPanel

### Frontend (GitHub Pages)

1. Buat repo baru di GitHub, misal: `produk-app`
2. Edit `frontend/index.html` → ganti nilai `API_URL` dengan URL backend kamu:
   ```js
   const API_URL = "https://namakamu.infinityfree.net/api/products.php";
   ```
3. Push `frontend/index.html` ke repo GitHub
4. Aktifkan GitHub Pages: **Settings** → **Pages** → **Branch: main** → **Save**
5. Akses di: `https://username.github.io/produk-app`

---

## 🔗 API Endpoints

| Method | URL                          | Fungsi              |
|--------|------------------------------|---------------------|
| GET    | `/api/products.php`          | Ambil semua produk  |
| GET    | `/api/products.php?id=1`     | Ambil satu produk   |
| POST   | `/api/products.php`          | Tambah produk baru  |
| PUT    | `/api/products.php?id=1`     | Update produk       |
| DELETE | `/api/products.php?id=1`     | Hapus produk        |

### Contoh body POST/PUT (JSON)
```json
{
  "nama": "Laptop Gaming",
  "harga": 12500000,
  "stok": 5,
  "deskripsi": "Laptop gaming dengan RTX 4060"
}
```

---

## ⚠️ Catatan Penting

- Setelah production, ubah `Access-Control-Allow-Origin: *` di `helpers.php` menjadi URL GitHub Pages kamu yang spesifik
- Simpan kredensial database di `config/database.php` dan **jangan di-push ke GitHub**
- Tambahkan `config/database.php` ke `.gitignore` backend
