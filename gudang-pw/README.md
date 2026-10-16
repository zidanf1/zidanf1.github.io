# Warehouse

Aplikasi stok rak gudang. Semua data disimpan di browser (localStorage), bisa dipasang
seperti aplikasi (PWA), dan bisa dipakai tanpa internet.

Tidak memakai library atau framework. Hanya HTML, CSS, dan JavaScript biasa, jadi
tidak ada yang perlu di-install atau di-compile.

---

## 1. Isi folder

```
index.html              Kerangka halaman (isi dua halaman, menu, dan popup)
manifest.webmanifest    Pengaturan aplikasi yang bisa dipasang (nama, ikon, warna)
sw.js                   Service worker = mode offline
build.py                Pembuat file mandiri warehouse.html (opsional)

css/                    TAMPILAN
  fonts.css               Font Roboto
  base.css                Warna, reset, huruf dasar
  layout.css              Bar atas, menu, kartu
  components.css          Input, tombol, pilihan tema, label "kosong"
  table.css               Tabel Stok Rak, daftar lotcode, kolom cari & urutan
  modal.css               Popup Form Data Rak dan pratinjau Screenshot

js/                     PROGRAM (urutan dimuat = urutan di bawah ini)
  config.js               SEMUA PENGATURAN: versi, type, ukuran rak, tema, urutan, daftar file offline
  utils.js                Fungsi bantu kecil: el(), aman(), formatWaktu(), nomorLokasi()
  storage.js              Baca / simpan localStorage (bacaData, simpanData)
  data.js                 Data (DATA) dan keadaan tampilan (UI), simpan + catat waktu update,
                          serta paket data bersama (buatPaket, bersihkanDataLuar, terapkanData)
  pages.js                Pindah halaman, menu dropdown, waktu update
  theme.js                Tema warna
  lot-form.js             Halaman 1: Form Lotcode
  stock-table.js          Halaman 2: Stok Rak (tabel, pencarian, urutan)
  rack-popup.js           Popup Form Data Rak (ubah / tambah / hapus baris)
  share.js                Teks WhatsApp dan gambar Screenshot
  sync.js                 Sinkronisasi data lewat JSONBin (opsional)
  backup.js               Cadangan: ekspor dan impor file .json
  app.js                  Memulai aplikasi (harus paling akhir)

fonts/                  Roboto (berkas .woff2)
icons/                  Ikon aplikasi dan logo
```

---

## 2. Cara menjalankan

**a. Dipasang di GitHub Pages (cara yang dipakai sekarang)**
Unggah semua isi folder ini ke repo (jangan lupa folder `css`, `js`, `fonts`, `icons`).
Tidak perlu build. Buka alamat GitHub Pages saat online, lalu pilih "Instal aplikasi" di Chrome.

**b. Mencoba di komputer**
```
python3 -m http.server 8000
```
lalu buka `http://localhost:8000`.
(Membuka `index.html` dengan klik dua kali juga bisa, tetapi mode offline hanya aktif lewat alamat http/https.)

**c. File mandiri (satu file HTML, bisa dikirim lewat WhatsApp)**
```
python3 build.py
```
Hasilnya `warehouse.html`: semua CSS, JavaScript, font, dan logo sudah ada di dalamnya.

---

## 3. Cara memperbarui aplikasi (urutan kerja)

1. Ubah file yang perlu (lihat tabel di bagian 4).
2. **Naikkan `VERSI` di `js/config.js`** (misalnya `2.1.0` menjadi `2.1.1`).
   Ini yang membuat HP mengambil file baru dan membuang cache lama.
3. Unggah file yang berubah ke GitHub.
4. Buka aplikasi saat online. Jika tampilan lama masih muncul, tutup lalu buka sekali lagi.

Data yang sudah tersimpan di HP tidak hilang saat aplikasi diperbarui.

---

## 4. Ingin mengubah apa? Buka file mana?

| Ingin mengubah | Buka | Bagian |
|---|---|---|
| Menambah / menghapus type (GS, PS, ...) | `js/config.js` | `TIPE` |
| Menambah rak (misal C) atau mengubah jumlah baris/kolom | `js/config.js` | `HURUF_RAK`, `JUMLAH_BARIS`, `JUMLAH_KOLOM` |
| Mengganti nama "Floor" | `js/config.js` | `LABEL_FLOOR` (nama lama taruh di `NAMA_LAMA_FLOOR`) |
| Menambah / mengubah tema warna | `js/config.js` | `TEMA` |
| Mengubah urutan awal tabel / isi pilihan urutan | `js/config.js` | `URUT_BAWAAN`, `PILIHAN_URUT` |
| Menambah aturan urutan baru | `js/stock-table.js` | `bandingkanBaris()` (+ satu baris di `PILIHAN_URUT`) |
| Mengubah kolom tabel Stok Rak | `index.html` (judul kolom), `js/stock-table.js` (`tampilkanTabel`), `css/table.css` (lebar kolom) |
| Mengubah format teks WhatsApp | `js/share.js` | `buatTeksWA()` |
| Mengubah tampilan gambar Screenshot | `js/share.js` | `GAMBAR` dan fungsi `gambar...()` |
| Mengubah isi menu di bar atas | `index.html` (tombol) dan `js/pages.js` |
| Mengubah warna, ukuran huruf, jarak | folder `css/` (pilih file sesuai bagian: lihat bagian 1) |
| Mengubah isi popup Form Data Rak | `index.html` (kerangka) dan `js/rack-popup.js` |
| Mengubah nama aplikasi | `js/config.js` (`NAMA_APP`), `index.html` (`<title>` dan judul), `manifest.webmanifest` |
| Mengubah cara cadangan file (ekspor / impor) | `js/backup.js` |
| Mengubah cara sinkronisasi JSONBin | `js/sync.js` (alamat dan batas ukuran ada di `js/config.js` bagian `JSONBIN`) |
| Menambah file CSS / JS / gambar baru | tambahkan juga ke `FILE_CACHE` di `js/config.js` |

---

## 5. Data yang disimpan (localStorage)

| Kunci | Isi |
|---|---|
| `gudang_lots` | Daftar lotcode: `[{ lot: "J07T184", qty: 5343, tipe: "GS" }]` |
| `gudang_rows` | Daftar baris rak: `[{ loc: "A7-3", lot: "J07T184" }]` (`lot` kosong = rak kosong) |
| `gudang_upd` | Waktu perubahan data terakhir (teks ISO) |
| `gudang_tema` | Nama tema yang dipilih |
| `gudang_page` | Halaman terakhir: `stok` atau `form` |
| `gudang_urut` | Urutan terakhir: `{ kunci: "lot", naik: true }` |
| `gudang_sync` | Pengaturan JSONBin: Bin ID, kunci API, otomatis atau tidak (hanya di HP ini) |

> **Jangan mengubah nama kunci ini.** Kalau diubah, data lama di HP tidak akan terbaca.
> Kalau bentuk data berubah di versi baru, tambahkan perapian di `rapikanData()` (`js/data.js`)
> supaya data lama otomatis disesuaikan. Contoh yang sudah ada: nama lama "BELUM", "Off-Field",
> "STG" otomatis menjadi "Floor".

---

## 6. Aturan penulisan kode (supaya tetap rapi)

- **Satu file = satu tugas.** Fungsi baru ditaruh di file yang sesuai tugasnya.
- **Tiga objek global saja untuk data:** `KONFIG` (pengaturan tetap), `DATA` (data tersimpan),
  `UI` (keadaan tampilan). Satu lagi untuk popup: `POPUP`.
- **Nama fungsi dan variabel memakai bahasa Indonesia** dan menjelaskan tugasnya
  (`simpanLotcode`, `hapusBaris`, `tampilkanTabel`).
- Fungsi pendek, satu tugas. Beri komentar di atas setiap fungsi.
- Hanya `var`, `for`, `if`, dan penyambungan teks biasa, supaya mudah dibaca pemula.
- Jangan menulis angka atau teks pengaturan langsung di dalam fungsi. Taruh di `config.js`.
- Tombol memanggil fungsi lewat `onclick="namaFungsi()"` di HTML. Jika mengganti nama fungsi,
  cari nama lamanya di `index.html` dan di teks HTML yang dibuat oleh fungsi `tampilkan...()`.

---

## 7. Jebakan yang perlu diingat

- **Urutan `<script>` di `index.html` penting.** `config.js` paling awal, `app.js` paling akhir.
- **Lupa menaikkan `VERSI`** = HP bisa tetap menampilkan versi lama dari cache.
- **`FILE_CACHE` salah ketik / file tidak ada** = pemasangan mode offline gagal diam-diam.
  Pastikan setiap nama file di daftar itu benar-benar ada.
- `config.js` dibaca juga oleh `sw.js`, jadi **jangan memakai `document` atau `window` di `config.js`**.
- Lokasi rak hanya sampai kolom sesuai `JUMLAH_KOLOM` (misalnya `A9-9` tidak ada jika kolom hanya 8).

---

## 8. Daftar cek sebelum mengunggah

- [ ] Buka halaman **Stok Rak** dan **Form Lotcode**, tidak ada yang keluar layar (coba lebar 320px).
- [ ] Ketuk satu baris: popup **Form Data Rak** terbuka, Simpan / Batal / Hapus berfungsi.
- [ ] Di popup, cari lotcode yang tidak ada: muncul tombol **Buka Form Lotcode**; setelah menyimpan lotcode, kembali ke popup.
- [ ] Semua pilihan **Urutkan** berfungsi, kolom pencarian berfungsi.
- [ ] Menu: Stok Rak, Form Lotcode, Tema, Screenshot, Kirim WhatsApp.
- [ ] Teks WhatsApp sesuai format, gambar Screenshot tampil.
- [ ] Ganti tema, tutup lalu buka lagi: tema tetap.
- [ ] **`VERSI` di `js/config.js` sudah dinaikkan.**
- [ ] Matikan internet, buka aplikasi: tetap bisa dipakai.

---

## 9. Sinkronisasi data lewat JSONBin (opsional)

Secara bawaan data hanya ada di satu HP. Dengan JSONBin, data bisa dipakai bersama di beberapa HP
tanpa membuat server sendiri. JSONBin adalah layanan pihak ketiga (jsonbin.io); data Anda
disimpan di sana.

### Cara memasang (sekali saja)

1. Daftar di **jsonbin.io**.
2. Buat bin baru, **biarkan Private** (jangan dibuat Public), dengan isi:
   ```
   {"lots": [], "rows": [], "updated": null}
   ```
   Salin **Bin ID**-nya.
3. Buka halaman **API Keys**, buat **Access Key** baru. Beri izin **Bins Read** dan **Bins Update**
   saja. Salin kuncinya.
   > Pakai Access Key, bukan Master Key. Master Key bisa menghapus semua bin di akun Anda.
4. Di aplikasi: menu **Sinkronisasi**, isi **Bin ID** dan **Kunci API**, tekan **Tes koneksi**.
   Kalau tertulis "Terhubung", centang **Sinkron otomatis** lalu tekan **Simpan**.
5. Di HP lain: ulangi langkah 4 dengan Bin ID dan kunci yang sama.

Bin ID dan kunci **hanya disimpan di HP masing-masing** (`gudang_sync`). Jangan menulisnya di file
mana pun di proyek ini, apalagi di GitHub yang bersifat publik.

### Cara kerja

- Data tetap disimpan di HP. JSONBin hanyalah salinan bersama.
- **Manual:** tombol **Ambil dari JSONBin** (data HP diganti) dan **Kirim ke JSONBin** (data JSONBin diganti).
  Keduanya meminta konfirmasi.
- **Otomatis:** beberapa detik setelah data berubah, data dikirim. Saat aplikasi dibuka atau internet
  kembali, **data yang lebih baru yang dipakai** (dibandingkan lewat waktu update).
- Saat sinkron otomatis pertama kali dinyalakan dan data HP berbeda dengan data JSONBin,
  aplikasi bertanya mana yang dipakai.
- Data dari JSONBin diperiksa dulu sebelum dipakai (lokasi, type, dan angka yang tidak valid dibuang),
  karena isi bin bisa diubah oleh siapa pun yang memegang kuncinya.

### Batasan yang perlu diketahui

- **Yang terakhir menang.** Kalau dua HP mengubah data di saat yang hampir sama, perubahan yang
  lebih lama bisa tertimpa. Tidak ada penggabungan. Biasakan satu orang mengubah dalam satu waktu.
- **Paket gratis ada batas.** Ukuran data maksimal 100 KB per bin (aplikasi menolak mengirim jika lebih),
  dan jumlah request dibatasi. Sinkron otomatis memakai beberapa request setiap kali data berubah atau
  aplikasi dibuka. Jika jatah habis, JSONBin menolak dan aplikasi menampilkan pesannya; matikan
  sinkron otomatis dan pakai tombol manual untuk menghemat. Cek angka terbarunya di halaman Pricing JSONBin.
- **Perlu internet.** Tanpa internet aplikasi tetap bisa dipakai; perubahan dikirim setelah internet kembali.
- **Siapa pun yang punya Bin ID dan kunci bisa membaca dan mengubah data.** Bagikan hanya ke orang yang dipercaya.
  Kalau kunci bocor, hapus Access Key itu di jsonbin.io lalu buat yang baru.
- Fitur ini tidak jalan di halaman yang memblokir koneksi ke situs lain (misalnya halaman pratinjau
  di dalam Claude). Pakai di GitHub Pages atau file mandiri.

---

## 10. Cadangan data lewat file (Ekspor dan Impor)

Menu **Cadangan** menyimpan data ke sebuah file `.json`, dan memulihkannya dari file itu.
Tidak butuh internet atau akun apa pun. Gunakan ini sebagai pengaman jika data di browser
terhapus (misalnya data situs dibersihkan, atau pindah HP).

- **Ekspor data:** mengunduh `warehouse-cadangan-TAHUNBULANTANGGAL-JAMMENIT.json`.
  Simpan di tempat aman (Google Drive, atau kirim ke WhatsApp sendiri).
- **Impor dari file:** memilih file cadangan. Aplikasi menampilkan ringkasan file dan data HP,
  lalu meminta konfirmasi. **Data di HP akan diganti** isi file, jadi Ekspor dulu bila ragu.
- Isi file diperiksa dan dibersihkan sebelum dipakai (lokasi, type, dan angka yang tidak valid
  dibuang), dan jumlah data yang dibuang ditampilkan. File lebih dari 2 MB atau yang bukan
  file cadangan ditolak.
- Impor dihitung sebagai perubahan baru: waktu update diperbarui, dan jika sinkron JSONBin
  otomatis aktif, hasil impor ikut dikirim.
- Format file sama dengan isi bin JSONBin: `{ "app", "versi", "updated", "lots": [...], "rows": [...] }`.
