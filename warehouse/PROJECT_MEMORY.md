# PROJECT_MEMORY – Warehouse Maps

> File serah-terima antar akun/obrolan. **Baca ini lebih dulu, lalu README.md** (arsitektur & aturan bisnis lengkap).
> Perbarui file ini di **akhir setiap sesi** (bagian 2, 4, 5, 6), lalu sertakan di zip.

## 1. Ringkasan proyek
- Aplikasi web gudang: memetakan **rak ↔ lotcode**. PWA offline-first (IndexedDB) + sinkron Supabase. HTML/CSS/JS murni, tanpa framework, tanpa login.
- File: `index.html` (markup+CSS), `app.js` (logika), `sw.js`, `manifest.json`, `icons/`, `tools/` (bump_version, build_preview, smoke_test).
- Konfigurasi Supabase: baris `const CFG=` di `app.js` (hanya **publishable key**; jangan pernah secret/service_role).

## 2. Status terakhir
- **Versi saat ini: 25.** Semua tes `tools/smoke_test.py` lulus.
- Sudah selesai di v25: **Bagikan via WhatsApp berbentuk form** (preset Ringkas/Lengkap/Tabel, kotak centang kolom, pemisah, bentuk judul grup, judul, catatan, batas karakter, pengaturan tersimpan di `localStorage` `wh_sh`). Preset **Ringkas = format lama** dan harus tetap jadi bawaan.
- Belum diuji langsung: pembukaan WhatsApp sungguhan dan tampilan blok monospace (```) preset Tabel di aplikasi WhatsApp.

## 3. Cara kerja dengan pemilik proyek (WAJIB diikuti)
1. **Bahasa Indonesia.**
2. **Jelaskan dulu, buat pratinjau/screenshot dulu, tunggu persetujuan** sebelum mengubah proyek. Jangan mengubah file proyek pada tahap penjelasan/pratinjau.
3. **Kerjakan hanya yang diminta.** Bila pemilik menyebut satu bagian (mis. "WhatsApp saja"), jangan menyentuh bagian lain. Ide tambahan cukup diusulkan, bukan dikerjakan.
4. Jawaban ringkas dan enak dibaca di HP (aplikasi dipakai di ponsel).
5. Jujur soal hal yang belum bisa diuji (mis. perilaku WhatsApp sungguhan).

## 4. Keputusan & aturan yang sudah disepakati (jangan diubah tanpa diminta)
- Aturan bisnis README bagian 8 (lotcode unik di `items`, rak kosong = `lotcode` kosong, format rak `A1-3`, border per rak, lotcode picker, huruf besar otomatis, dst.).
- Aplikasi tetap **offline-first**: UI selalu baca/tulis IndexedDB dulu, lalu sinkron ke Supabase (bukan "100% langsung dari Supabase").
- Format pesan WhatsApp bawaan: `idrak > lotcode qty`, grup per model, urut per lotcode, `RAK KOSONG` di akhir.

## 5. Rencana yang SUDAH dijelaskan & dibuatkan pratinjau, tetapi BELUM disetujui/dikerjakan
Pratinjau pernah ditampilkan; pemilik memutuskan **hanya WhatsApp yang dikerjakan dulu**. Kerjakan butir berikut **hanya bila pemilik memintanya**:
1. **Dua mode aplikasi** (menu ☰): **Lokal** (hanya IndexedDB, tanpa Supabase, ada Ekspor/Impor cadangan JSON) dan **Online/Publik** (sinkron Supabase seperti sekarang). Database IndexedDB tiap mode dipisah; pindah mode dengan cadangan otomatis + konfirmasi "kirim data lokal ke server".
2. **Perlindungan data:** indikator status di header (Lokal / Online ✓ / Menunggu (n) / Gagal), antrean kirim dengan coba ulang bertahap, pesan error jelas (offline, Supabase di-pause, key salah), tombol **Periksa koneksi**, peringatan bila baris diubah perangkat lain, validasi sebelum simpan, smoke test untuk kedua mode.
3. Daftar lanjutan README bagian 12 (realtime, impor Excel/CSV, scan barcode, kata sandi bersama, migrasi huruf besar).

## 6. Catatan penting
- Free tier Supabase di-pause bila 1 minggu tanpa aktivitas; aktifkan lagi dari dashboard.
- Secret key Supabase pernah tertempel di obrolan lama → pastikan sudah di-rotate.
- Tanpa login: jangan sebarkan URL aplikasi.

## 7. Alur rilis (ringkas)
1. Edit `index.html` / `app.js`. 2. `python tools/bump_version.py N`. 3. `python tools/smoke_test.py` (harus lulus; tambah tes untuk fitur baru). 4. Perbarui README (riwayat) **dan file ini**. 5. Zip folder `warehouse-final`, kirim. 6. Pemilik mengganti file lalu Ctrl+Shift+R dan cek versi di menu ☰.

## 8. Prompt serah-terima (tempel di obrolan/akun baru, lampirkan zip)
```
Saya melanjutkan proyek "Warehouse – Maps" (PWA offline-first + Supabase, HTML/CSS/JS murni).
Lampiran: warehouse-final.zip.
Langkah awal: baca PROJECT_MEMORY.md, lalu README.md. Ikuti bagian "Cara kerja dengan pemilik proyek"
(bahasa Indonesia; jelaskan + buat pratinjau/screenshot dulu dan tunggu persetujuan sebelum mengubah file;
kerjakan hanya yang diminta). Jangan mengubah aturan bisnis README bagian 8 kecuali saya minta.
Setiap perubahan: bump_version, smoke_test, perbarui README + PROJECT_MEMORY.md, lalu berikan zip baru.
Jangan pernah memakai/menyimpan secret key Supabase.
Setelah membaca, ringkas dalam 3–5 baris: versi sekarang, status terakhir, dan apa yang belum dikerjakan. Lalu tunggu tugas saya.
Tugas berikutnya: <tuliskan di sini>.
```
