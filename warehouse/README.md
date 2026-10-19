# Warehouse – Maps (PWA 100% online + Supabase)

Aplikasi web gudang untuk memetakan **lokasi rak ↔ lotcode**. Bisa **diinstal di Chrome desktop** (PWA), dan **100% online**: satu-satunya sumber data adalah **Supabase** (tanpa IndexedDB, tanpa mode offline). Tanpa login, tanpa framework, tanpa library eksternal (HTML + CSS + JavaScript murni).

> **Versi saat ini: 30** (lihat menu ☰ → paling bawah). Dokumen ini dibuat supaya proyek bisa dilanjutkan dari akun/obrolan lain tanpa konteks sebelumnya. Bagian 13 berisi prompt serah-terima siap tempel.

---

## 1. Fitur yang sudah ada

- **Tabel Maps**: kolom `IDRak`, lalu kolom item: `Lotcode` (selalu tampil, bawaan paling depan, **bisa digeser**) dan kolom pilihan. Urutan bawaan **SPK, Qty, Model, Style**, dan **urutannya bisa diubah pengguna** dari menu ☰ → Tampilan → Kolom tabel (tombol ▲▼; **Lotcode juga bisa digeser**, tetapi tidak bisa disembunyikan). Semua kolom, termasuk Qty, **rata kiri**.
- **Kolom Lotcode = kolom terpanjang**: Lotcode menyerap seluruh sisa lebar baris, sedangkan kolom lain (IDRak, SPK, Qty, Model, Style) hanya selebar isinya. Lotcode dipotong dengan `…` **hanya bila ruang habis** (layar sempit); kolom Model/Style/SPK dipotong lebih dulu (`--colmax` = `min(14ch,16vw)`). Teks lengkap muncul sebagai tooltip. Bila kolom tetap melebihi lebar layar, tabel bisa digeser horizontal.
- **Bagikan via WhatsApp** (menu ☰ → Bagikan): dialog dengan pilihan data (*yang tampil sekarang* = ikut pencarian, atau *semua data*), pratinjau teks yang **boleh diedit**, tombol *Salin* dan *Kirim ke WhatsApp* (membuka `https://wa.me/?text=…`; pengguna memilih kontak/grup dan menekan kirim sendiri). Bagian **Atur format** menyediakan **dua cara** yang bisa dipilih:
  - **Formulir** (sederhana, bawaan): judul, tebal/tidak, tanggal, ringkasan, keterangan pencarian, teks sebelum nama kelompok, jumlah baris per kelompok, kolom baris (centang + ▲▼ urutan + label), dua jenis pemisah, serta teks rak kosong.
  - **Templat teks** (lanjutan): lima kolom templat bebas (awal pesan, judul kelompok, isi baris, judul & baris rak kosong) dengan kata kunci `{idrak} {lotcode} {qty} {model} {style} {spk} {no} {grup} {jumlah} {tanggal} {jam} {cari} {ringkasan} {kelompok_n} {lot_n} {rak_terisi} {rak_kosong}`; tombol kata kunci menyisipkan di posisi kursor, kata kunci tak dikenal diberi peringatan, tombol *Salin dari pengaturan Formulir* sebagai titik awal.
  - Dipakai bersama kedua mode: *Kelompokkan per* (Model/Style/SPK/Rak/Lotcode/tanpa), *Urutkan baris* (Lotcode/IDRak/Qty naik/turun), *tampilkan rak kosong*. Pengaturan disimpan di perangkat (`localStorage` kunci `wh_share`); *Kembalikan bawaan* mengembalikan semuanya.
  - Format bawaan (fungsi `shareBuild`):
  ```
  *📦 WAREHOUSE – MAPS*
  18/10/2026 07:10
  2 model · 4 lot · 6 rak terisi · 3 rak kosong

  *MEN*                      ← grup per MODEL (abjad)
  A1-2 > J08T123 123         ← idrak > lotcode qty, diurut per lotcode
  ...
  *RAK KOSONG*
  A1-3 > kosong
  ```
  Pesan panjang dibagi beberapa **bagian** (konstanta `WA_MAX`, bawaan 1200 karakter per pesan; baris pertama judul diulang dengan "(bagian i/N)", grup yang terpotong diberi "(lanjutan)"). Lot yang belum punya rak tidak ikut karena barisnya berbasis rak.
- **Rak kosong** tampil sebagai label hijau `● kosong`.
- **Tambah / ubah / hapus baris** lewat dialog (tombol `+ Baris`, atau ketuk baris).
- **Pencarian** satu kolom di atas tabel (menggantikan filter dropdown lama): mencari di semua kolom, beberapa kata = AND, `KOSONG` = rak kosong, ID rak lengkap (mis. `A1-1`) hanya cocok persis (tidak ikut `A1-10`), tombol ✕ / Esc untuk menghapus.
- **Border tabel per rak**: `A1-3` dibaca rak `A1` + kolom `3`. Setiap baris punya **garis tipis halus** (`--row`), dan **garis tebal** hanya saat **rak** berganti (kolom berbeda dalam rak yang sama hanya bergaris tipis). Tabel memakai `border-collapse: collapse`, sehingga garis tebal otomatis menggantikan garis tipis di batas yang sama. Warna latar **belang-belang (zebra) per baris**, bukan per rak; garis tebal tetap hanya antar rak.
- **Lotcode picker** di dialog: daftar lot dengan pencarian. Usulan "+ Lot baru" **hanya muncul bila tidak ada lotcode yang sama/mirip**. Detail aturan di bagian 8.
- **Hapus lotcode**: menghapus lot dari daftar; semua rak yang memakainya otomatis menjadi kosong.
- **Huruf besar otomatis** untuk semua isian teks (lotcode, rak baru, model, style, SPK, pencarian).
- **Daftar rak** (dropdown IDRak): `A1-1…A1-8` s/d `A10-1…A10-8`, `B1-1…B10-8`, serta `STG` (staging), plus `+ Rak baru…`.
- **Realtime (V28)**: perubahan dari perangkat lain langsung masuk lewat WebSocket Supabase Realtime (tanpa library, fungsi `rtConnect`/`applyRemote`). Muncul **notifikasi** "Baris N dengan IDRak X sudah diperbarui" (juga "ditambahkan"/"dihapus"), baris disorot kuning ±3 dtk. Perubahan data lot (qty/model/dll.) memberi notifikasi untuk tiap baris pemakai lot (maks. 3 + ringkasan). Gema perubahan sendiri & baris lokal yang belum terkirim **tidak** memicu notifikasi. Indikator `● Live / ○ Terputus` di kartu Maps; saat terputus, tarik data tiap 15 dtk (cadangan 60 dtk tetap jalan). **Wajib** jalankan sekali di Supabase SQL Editor: `alter publication supabase_realtime add table rows, items;`
- **Urutan (V28)**: pilihan `Per IDRak` (bawaan) / `Per Lotcode` di samping kolom pencarian + tombol ↑/↓; tersimpan di `localStorage` (`wh_sort`). Mode Lotcode: rak kosong di akhir, garis tebal muncul saat **lotcode** berganti. Tombol "Urutkan Rak" diganti pilihan ini.
- **Sinkronisasi dua arah**: tombol ⟳ di header (animasi putar saat jalan, titik oranye bila ada perubahan belum terkirim, pesan merah bila gagal).
- **Menu ☰**: Tema (Otomatis/Terang/Gelap), Warna dasar (Biru, Navy, Marun, Hijau, Ungu, Oranye, Teal, Abu-abu), Kolom tabel (pilih maks. 2 selain Lotcode, atur urutannya dengan ▲▼), Ukuran teks, Kepadatan baris. Semua tersimpan di `localStorage` (`wh_set`).
- **Penjaga versi**: bila `index.html` dan `app.js` beda versi, aplikasi menghapus cache lalu memuat ulang sekali; bila masih beda tampil pita merah.

## 2. Struktur folder

```
warehouse-final/
├── index.html        # markup + CSS (semua gaya ada di sini)
├── app.js            # seluruh logika (cache memori, Supabase, realtime, UI)
├── sw.js             # Service Worker (network-first; hanya cangkang aplikasi, bukan data)
├── manifest.json     # manifest PWA
├── icons/            # icon-192.png, icon-512.png, logo-64.png (kotak kardus “WH” di atas biru; PNG transparan)
├── tools/
│   ├── bump_version.py     # naikkan versi di 3 file sekaligus
│   ├── build_preview.py    # bikin pratinjau 1 file (warehouse-preview.html)
│   └── smoke_test.py       # uji otomatis (Playwright, Supabase dipalsukan)
└── README.md
```

Semua file harus **satu versi**. Jangan mengganti sebagian file saja.

## 3. Arsitektur singkat

- **100% online (V29)**: tidak ada penyimpanan data di perangkat. `MEM` = cache **di memori halaman** (hilang saat tab ditutup) dengan bentuk lama (`maps` key `id`, `items` key `lotcode`, `meta`). Perubahan tampil seketika lalu **langsung dikirim** ke Supabase; bila gagal, perubahan **dibatalkan** dan data dimuat ulang dari server. Tanpa koneksi, simpan/hapus ditolak dengan pesan. Saat aplikasi dibuka, IndexedDB lama (`warehouse`) dihapus sekali (`purgeOldDB`); perubahan lama yang belum terkirim diunggah dulu, dan bila gagal DB dibiarkan sampai berhasil.
- Rekaman di memori punya `dirty:1` hanya sesaat sampai terkirim, `deleted:true` untuk hapus lunak, `updated_at`, dan (khusus maps) `created` (tidak ada di server, jadi urutan dasar kini memakai `updated_at`).
- **Sinkron (`sync()` di app.js)**: (1) kirim semua `dirty` — `rows` di-upsert berdasarkan `id`, `items` berdasarkan `lotcode`; (2) tarik semua baris server dengan `updated_at > since` per tabel; baris yang `dirty` di lokal **tidak ditimpa**; (3) simpan `since` terbaru. Konflik = **yang terakhir sampai ke server menang**.
- Jadwal: seketika setelah menyimpan, saat event `online`, tiap 60 dtk, dan manual (tombol ⟳).
- **Klien Supabase ringan** (fungsi `mkSb`) memanggil REST PostgREST langsung dengan `fetch` memakai *publishable key* (tanpa library, tanpa login). Hanya `upsert` dan `select … gt(updated_at)` dengan paging 1000 baris.
- **Service Worker**: *network-first* (online = selalu versi terbaru; offline = pakai cache). Permintaan ke `*.supabase.co` tidak di-cache.

## 4. Model data (Supabase / Postgres)

Dua tabel (`rows` dan `items`; `rows` dulu bernama `maps`, lihat migrasi V30 di bawah). `items.lotcode` **unik**; `rows.lotcode` **boleh sama** pada banyak baris, dan **boleh kosong** (rak kosong).

```sql
create table items (
  id uuid primary key default gen_random_uuid(),
  lotcode text not null unique,
  model text, style text, spk text,
  qty integer not null default 0,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table rows (
  id uuid primary key default gen_random_uuid(),
  idrak text not null,
  lotcode text,                       -- boleh NULL = rak kosong
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index on rows (lotcode);
create index on rows (idrak);
create index on items (updated_at);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger rows_updated  before update on rows  for each row execute function set_updated_at();
create trigger items_updated before update on items for each row execute function set_updated_at();

alter table rows  enable row level security;
alter table items enable row level security;

-- Aplikasi TANPA login: akses publik (anon). Lihat peringatan keamanan di bagian 6.
create policy "akses publik rows"  on rows  for all to anon, authenticated using (true) with check (true);
create policy "akses publik items" on items for all to anon, authenticated using (true) with check (true);
```

### Migrasi V30: ganti nama tabel `maps` → `rows` (jalankan sekali di Supabase SQL Editor)

```sql
alter table maps rename to rows;
alter trigger maps_updated on rows rename to rows_updated;
-- (opsional) rapikan nama indeks:
alter index if exists maps_lotcode_idx rename to rows_lotcode_idx;
alter index if exists maps_idrak_idx   rename to rows_idrak_idx;
-- pg_cron: perintahnya masih menyebut maps, jadwalkan ulang
select cron.unschedule('hapus-baris-terhapus-7hari');
select cron.schedule('hapus-baris-terhapus-7hari','0 20 * * *',$$
  delete from rows  where deleted = true and updated_at < now() - interval '7 days';
  delete from items where deleted = true and updated_at < now() - interval '7 days';
$$);
```
Keanggotaan publikasi realtime, kebijakan RLS, dan trigger ikut pindah otomatis ke nama baru. Ganti nama dan deploy aplikasi V30 **sebaiknya bersamaan**: aplikasi lama (V29 ke bawah) masih memanggil `maps` dan akan gagal sampai diperbarui.


Jika tabel `maps` sudah dibuat dengan `lotcode not null`: `alter table maps alter column lotcode drop not null;`

## 5. Konfigurasi

Edit **baris pertama berisi `const CFG=`** di `app.js`:

```js
const CFG={SUPABASE_URL:'https://csgmhwkvrfhabltzdghr.supabase.co',SUPABASE_KEY:'<publishable key>'};
```

- Pakai **publishable key** (`sb_publishable_…`) saja. Kosongkan keduanya untuk mode lokal (tanpa sinkron).
- **Jangan pernah** menaruh `secret key` / `service_role` di aplikasi atau di README.
- Proyek Supabase memakai URL di atas. Bila pindah akun/proyek, buat tabel (bagian 4), isi `CFG`, dan jalankan tes koneksi.

## 6. Keamanan (penting)

- Karena **tanpa login**, siapa pun yang punya URL aplikasi dan membaca `app.js` bisa membaca/mengubah/menghapus semua data. Cukup untuk data internal, **jangan sebarkan alamat aplikasinya**. Bila perlu, tambahkan kata sandi bersama atau Supabase Auth, lalu ubah policy dari `anon` ke `authenticated`.
- Pada sesi pengembangan sebelumnya **secret key Supabase pernah tertempel di obrolan**. Pastikan key itu sudah di-*rotate* di Supabase (Project Settings → API Keys) dan yang lama dihapus.

## 7. Menjalankan, menginstal, deploy

```bash
cd warehouse-final
python -m http.server 8080      # lalu buka http://localhost:8080 di Chrome
```
PWA butuh `https://` atau `localhost`. Klik ikon **Instal** di address bar Chrome. Untuk dipakai dari banyak komputer, unggah folder ke hosting statis (GitHub Pages / Cloudflare Pages / Netlify). Membuka `index.html` langsung (`file://`) tetap jalan tetapi tanpa Service Worker/instal.

## 8. Aturan bisnis & keputusan desain (jangan diubah tanpa alasan)

1. **Lotcode unik di `items`**, boleh berulang di `maps` (satu lot di banyak rak). Qty/model/style/SPK **melekat pada lot**, bukan pada rak.
2. **Rak kosong** = baris `maps` dengan `lotcode` kosong.
3. **Format rak** `NamaZona + IdRak - Kolom` (mis. `A1-3`: zona A, rak 1, kolom 3). Zona A & B, rak 1–10, kolom 1–8, plus `STG`. Daftar dibuat di konstanta `RAKS` (app.js); rak lain bisa ditambah lewat `+ Rak baru…`.
4. **Border tabel**: garis tipis tiap baris; garis tebal mengikuti *rak* (bagian sebelum `-`), bukan kolom. Fungsi `rk(id)` di `render()`, kelas `ge` = baris terakhir sebuah rak.
5. **Kolom tabel**: IDRak selalu paling kiri; lalu Lotcode (**selalu tampil, tidak bisa dimatikan**, tetapi posisinya boleh digeser) dan maks. 2 kolom pilihan. Urutan bawaan `spk, qty, model, style`, dapat diubah pengguna lewat ▲▼ di menu (disimpan di `SET.order`, `localStorage` kunci `wh_set`); `order` memuat 5 item termasuk `lotcode` (pengaturan lama 4 item otomatis dimigrasi). Tombol ▲▼ pada kolom yang tampil melompati kolom yang tersembunyi agar tiap ketukan terlihat hasilnya. Semua rata kiri. Memilih kolom ke-3 menggantikan yang terlama.
6. **Lotcode picker**:
   - "+ Lot baru “X”" dan isian data lot (Model/Style/SPK/Qty) **hanya muncul bila tidak ada lotcode yang sama/mirip** (tidak ada lot yang mengandung teks yang diketik).
   - Jika sudah ada lot yang **sama persis**, lot itu dipilih (tidak ada form lot baru).
   - Jika ada lot yang **mirip tapi tidak persis** (mis. mengetik `J01` padahal ada `J01T88`), usulan lot baru **disembunyikan**; menekan **Enter** memaksa membuat lot baru. Menyimpan tanpa konfirmasi diblokir dengan pesan.
7. **Hapus lotcode**: lot di-*soft delete*, semua rak yang memakainya menjadi kosong. Lot dengan kode sama bisa dibuat lagi nanti.
8. **Urutan default** baris = urutan input (`created`); tombol *Urutkan Rak* mengurutkan natural by IDRak.
9. **Huruf besar** dipaksa di event `input/change/blur/keyup/paste/compositionend` (tingkat dokumen) dan lagi saat simpan.
10. **Tanpa login**; policy RLS untuk `anon` (lihat bagian 6).
12. **Format pesan WhatsApp**: bawaan mengikuti spesifikasi pengguna (`idrak > lotcode qty`, grup per model, urut per lotcode, `RAK KOSONG` di akhir). Pengguna dapat mengubahnya lewat mode **Formulir** (`deriveTpl()` menerjemahkan isian menjadi templat) atau mode **Templat teks**; keduanya memakai mesin yang sama (`tpl()` + `shareBuild()`), dan Formulir bawaan harus selalu menghasilkan templat yang identik dengan `SH_DEF` (diuji). Baris templat yang berisi kata kunci tetapi hasilnya kosong dibuang. Batas panjang pesan WhatsApp/`wa.me` **belum diuji langsung** — sesuaikan `WA_MAX` bila pesan terpotong.
11. **Lebar kolom**: kolom data (`th/td`) memakai `width:1%; white-space:nowrap` agar sempit mengikuti isi; kolom Lotcode (`.lc`) `width:100%` + `max-width:0` + `text-overflow:ellipsis` sehingga **menjadi kolom terpanjang** dan baru terpotong bila ruang habis (`min-width:9ch`). Isi lotcode berada di `.lt`; `.cx` (Model/Style/SPK) dipotong lebih dulu bila sempit.

## 9. Cara merilis perubahan

1. Edit file (utamanya `index.html` dan `app.js`).
2. Naikkan versi: `python tools/bump_version.py 15` — mengubah `meta app-version` & pemeriksa di `index.html`, label "Versi N", `window.WH_VER` di `app.js`, dan nama cache di `sw.js`. (Ketiganya harus selalu sama.)
3. Jalankan `python tools/smoke_test.py`, lalu buat zip folder `warehouse-final`.
4. Setelah mengganti file di server/komputer, tekan **Ctrl+Shift+R**; cek menu ☰ menampilkan versi baru.

## 10. Pengujian & pratinjau

- `tools/smoke_test.py`: menjalankan server lokal + Chromium (Playwright) dengan Supabase dipalsukan; memeriksa urutan kolom, huruf besar, border per rak, pencarian, aturan lot baru, urutan/perataan kolom (termasuk pengubah urutan di menu), teks, pembagian pesan, templat & Formulir WhatsApp, lebar kolom & prioritas lotcode, dan tidak ada error JS. Butuh `pip install playwright && playwright install chromium`.
- `tools/build_preview.py`: membuat `warehouse-preview.html` (satu file, mode lokal, data contoh, tanpa Service Worker) untuk diterbitkan sebagai halaman web pratinjau.
- Tes koneksi Supabase (tabel/kolom/RLS/unik) pernah dibuat sebagai `test-koneksi.html` terpisah (tidak ada di folder ini); bila perlu dibuat ulang: baca `maps`/`items`, tulis lalu hapus baris `__TEST__`, dan cek `lotcode` unik menolak duplikat (kode 23505).

## 11. Batasan & hal yang perlu diketahui

- **Realtime butuh publikasi tabel** (`alter publication supabase_realtime add table rows, items;`). Bila belum, indikator menampilkan "Realtime belum aktif" dan aplikasi memakai tarik data berkala. Realtime **belum teruji** pada Supabase sungguhan (hanya dengan WebSocket tiruan).
- Konflik = **terakhir menang**; tidak ada penggabungan per-kolom.
- Data lama yang tersimpan huruf kecil tidak diubah otomatis (hanya ditampilkan huruf besar); kecocokan lot bersifat *case-sensitive*.
- Free tier Supabase: proyek **di-pause** bila 1 minggu tanpa aktivitas (aktifkan lagi dari dashboard) dan ada batas koneksi/kuota — cek halaman pricing Supabase.
- Pengelompokan border memakai baris yang **bersebelahan**; pakai *Urutkan Rak* agar kolom satu rak berkumpul.
- Pengaturan tampilan memakai CSS `zoom` (didukung Chrome/Edge).

## 12. Rencana lanjutan (belum dikerjakan)

1. **Sinkron realtime dua arah** dengan Supabase Realtime (WebSocket): jalankan `alter publication supabase_realtime add table rows, items;`, tambahkan koneksi WebSocket ringan di `app.js` (tanpa library) yang menggabungkan perubahan masuk memakai aturan yang sama dengan `sync()`; tarik 60 detik tetap sebagai cadangan.
2. Impor data dari Excel/CSV.
3. Scan barcode lotcode.
4. Kata sandi bersama / Supabase Auth bila akses perlu dibatasi.
5. Migrasi data lama ke huruf besar.

## 13. Prompt serah-terima (tempel di obrolan baru, lampirkan zip proyek)

```
Saya melanjutkan proyek "Warehouse – Maps" (PWA offline-first + Supabase, HTML/CSS/JS murni).
Lampiran: warehouse-final.zip. Baca README.md di dalamnya dulu (arsitektur, aturan bisnis, cara rilis).
Aturan kerja:
- Bahasa Indonesia.
- Setiap perubahan: naikkan versi dengan tools/bump_version.py, jalankan tools/smoke_test.py, lalu
  berikan zip baru. Jangan mengubah aturan bisnis di README bagian 8 kecuali saya minta.
- index.html dan app.js harus selalu satu versi.
- Jangan pernah memakai/menyimpan secret key Supabase; hanya publishable key di app.js.
Tugas berikutnya: <tuliskan di sini, mis. "buat sinkron realtime dua arah (README bagian 12.1)">.
```

## 14. Riwayat ringkas

| Versi | Perubahan |
|---|---|
| 30 | Tabel Supabase `maps` diganti nama menjadi `rows` (aplikasi, realtime, tes, SQL). Migrasi: `alter table maps rename to rows;` + jadwalkan ulang pg_cron. Tes: 82 pemeriksaan. |
| 29 | **100% online**: IndexedDB dihapus (dan dibersihkan otomatis dari perangkat lama), semua data langsung dari/ke Supabase; gagal simpan dibatalkan; offline = tulis ditolak. Tes: 82 pemeriksaan. |
| 28 | Realtime WebSocket + notifikasi baris diperbarui/ditambahkan/dihapus; pilihan urutan Per IDRak / Per Lotcode di samping pencarian (menggantikan tombol Urutkan Rak). Tes: 73 pemeriksaan. |
| awal | Prototipe dengan JSONBin.io → diganti Supabase (JSONBin: limit 100 KB/bin, key tak aman di klien) |
| 1–5 | Tampilan Maps sesuai desain, dialog Tambah Baris dengan pencarian lotcode, rak A/B + STG, huruf besar otomatis, perbaikan cache Service Worker |
| 6–9 | Menu ☰ (tema terang/gelap, warna dasar, tampilan), pilihan kolom tabel (Lotcode tetap), hapus lotcode |
| 10 | Penjaga versi `index.html` ↔ `app.js` |
| 11 | Lotcode paling depan, pencarian menggantikan filter |
| 12–13 | Border tabel per rak (bukan per kolom) |
| 14 | Usulan lot baru hanya bila tidak ada lotcode yang sama/mirip; README & alat bantu |
| 15 | Lebar kolom menyesuaikan teks; lotcode panjang dipotong dengan `…` |
| 16 | Urutan kolom SPK/Qty di kiri Model/Style, Qty rata kiri, lebar Lotcode diprioritaskan |
| 17 | Urutan kolom dapat diubah pengguna (▲▼) di menu Tampilan |
| 18 | Lotcode ikut bisa digeser (tetap selalu tampil) |
| 19 | Kolom Lotcode dibuat paling panjang (menyerap sisa lebar baris) |
| 20 | Zebra-striped per baris (garis tebal tetap per rak) |
| 21 | Garis tipis halus tiap baris + garis tebal saat rak berganti |
| 22 | Warna garis tipis dibuat solid (terang/gelap) agar rata di sambungan kolom |
| 23 | Ikon aplikasi diganti (kotak kardus “WH”, latar transparan) |
| 24 | Bagikan via WhatsApp (format grup per model, urut per lotcode, dibagi bila panjang) |
| 25 | Format pesan WhatsApp dapat diatur lewat templat teks bebas |
| 26 | Opsi kedua: mode Formulir (sederhana) di samping Templat teks |
| 27 | Navbar dan baris header tabel dibekukan (sticky) saat scroll; tes bertambah menjadi 56 |
