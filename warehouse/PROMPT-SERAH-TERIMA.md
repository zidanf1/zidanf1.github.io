# PROMPT SERAH-TERIMA — Proyek "Warehouse – Maps"

**Cara pakai (30 detik)**
1. Buka obrolan baru di akun lain. Lampirkan `warehouse-final.zip` (versi terbaru).
2. Salin **seluruh isi file ini mulai dari garis `=== MULAI PROMPT ===` sampai `=== SELESAI PROMPT ===`** dan tempel sebagai pesan pertama.
3. Tambahkan satu baris tugas di bagian paling bawah ("TUGAS SEKARANG").
4. Perbarui file ini bila ada keputusan baru (bagian 9 dan 10).

Prompt singkat (bila lampiran tidak bisa dipakai) ada di bagian paling akhir.

=== MULAI PROMPT ===

Kamu melanjutkan proyek yang sudah berjalan: **"Warehouse – Maps"**, aplikasi web gudang (PWA offline-first, HTML/CSS/JavaScript murni, tanpa framework dan tanpa library) yang memetakan **rak ↔ lotcode** dan menyinkronkan data ke **Supabase**. Zip proyek terlampir. **Baca `README.md` di dalamnya dulu**, lalu bagian di bawah ini. Pekerjaan sebelumnya dilakukan di akun lain, jadi jangan berasumsi kamu ingat percakapannya; semua yang perlu kamu ketahui ada di sini dan di README.

## 1. Cara kerja & gaya komunikasi (WAJIB)

- Bahasa **Indonesia**, ringkas, hangat, tanpa basa-basi. Awali dengan jawaban/hasilnya, bukan proses.
- Pengguna bukan programmer. Jelaskan dalam bahasa sehari-hari, tanpa istilah teknis yang tidak perlu.
- **Baca nada permintaan:**
  - "jelaskan dulu / jangan langsung buat" → **hanya menjelaskan**, jangan mengubah file.
  - "coba tampilkan contoh / gambaran dulu" → buat **gambar contoh** (screenshot mock-up) dulu, tunggu persetujuan.
  - Selain itu, **kerjakan langsung** dan laporkan hasilnya.
- Bila permintaan ambigu: **ambil tafsiran yang paling masuk akal, kerjakan, lalu sebutkan tafsiranmu dalam satu kalimat dan tawarkan untuk membaliknya**. Jangan menahan pekerjaan dengan banyak pertanyaan. Maksimal 2–3 pertanyaan, dan hanya yang benar-benar menentukan hasil.
- **Jujur tentang batas pengujian.** Sandbox-mu tidak bisa menjangkau Supabase maupun WhatsApp. Katakan dengan terang apa yang **sudah diuji** (dengan server tiruan/Playwright) dan apa yang **harus dicoba pengguna** di perangkatnya. Jangan mengklaim sesuatu sudah berfungsi kalau belum kamu jalankan. Bila tesmu sendiri yang salah, bilang saja.
- Angka batas/harga layanan (Supabase, WhatsApp, dll.) **bisa berubah** → cari dulu di web sebelum menyebutnya.
- Setiap perubahan UI: **lihat sendiri screenshot-nya** sebelum menyerahkan, dan sertakan screenshot untuk pengguna.

## 2. Alur kerja baku untuk setiap perubahan (urut)

1. Ubah `index.html` / `app.js` (CSS semua ada di `index.html`).
2. Tambahkan/ubah pemeriksaan di `tools/smoke_test.py` untuk fitur itu.
3. `python tools/bump_version.py N` (naikkan versi di `index.html`, `app.js`, `sw.js` sekaligus — ketiganya WAJIB sama).
4. `node --check app.js` lalu `python tools/smoke_test.py` → semua harus PASS.
5. Ambil screenshot dengan Playwright (data contoh dibuat lewat UI), **lihat hasilnya**.
6. Perbarui `README.md` (fitur, aturan bisnis bila berubah, tabel riwayat versi, jumlah/uraian tes).
7. `python tools/build_preview.py` → `warehouse-preview.html` (satu file, mode lokal, data contoh). Periksa sintaks skripnya (`node --check`) dan jalankan sekali di Playwright. Terbitkan sebagai halaman web bila alat penerbitan tersedia (halaman pratinjau tidak bisa memanggil Supabase dan tidak bisa memakai Service Worker).
8. Buat ulang zip folder proyek (`zip -r warehouse-final.zip warehouse-final`), lalu serahkan zip + screenshot.
9. Tutup dengan: apa yang berubah (poin singkat), apa yang belum teruji, dan **"pastikan menu ☰ menampilkan Versi N"**.

Kerjakan perubahan kecil per langkah; jangan menulis ulang file besar tanpa perlu (hemat token).

## 3. Arsitektur singkat

- **Offline-first**: UI membaca/menulis **IndexedDB** (`warehouse`; store `maps` key `id`, `items` key `lotcode`, `meta` key `k`). Rekaman punya `dirty:1` (belum terkirim), `deleted:true` (hapus lunak), `updated_at`, dan untuk maps `created` (urutan tampil).
- **Sinkron `sync()`**: (1) kirim semua `dirty` — maps di-upsert by `id`, items by `lotcode`; (2) tarik baris server `updated_at > since` (paging 1000, order by `updated_at`); baris lokal yang masih `dirty` **tidak ditimpa**; gabung `{...lokal, ...server}` agar field khusus lokal (mis. `created`) tidak hilang; (3) simpan `since`. Konflik = **yang terakhir sampai ke server menang**. Jadwal: 1,5 dtk setelah simpan, saat event `online`, tiap 60 dtk, tombol ⟳.
- **Klien Supabase tanpa library** (`mkSb` di `app.js`): `fetch` ke REST dengan header `apikey` = *publishable key* (`sb_publishable_…`). Upsert: `POST /rest/v1/<tabel>?on_conflict=<kolom>` + `Prefer: resolution=merge-duplicates,return=minimal`. **Tidak ada login**; RLS membuka akses `anon`.
- **Service Worker** `sw.js`: *network-first* (online = selalu terbaru, offline = cache). Request ke `*.supabase.co` tidak di-cache.
- **Penjaga versi**: `<meta name="app-version">`, `window.WH_VER` di `app.js`, dan pemeriksa inline di `index.html` saling membandingkan; bila beda → hapus cache + muat ulang sekali → bila masih beda tampil pita merah. Alasannya: pengguna pernah kena error `Cannot set properties of null (setting 'onclick')` karena file campuran/cache lama.
- Proyek Supabase: `https://csgmhwkvrfhabltzdghr.supabase.co` (URL bukan rahasia). Publishable key ada di baris `const CFG=` di `app.js`. **Secret key tidak boleh dipakai/ditulis di mana pun.** (Pernah tertempel di obrolan → pengguna harus sudah me-*rotate*-nya; ingatkan sekali bila relevan.)

## 4. Model data (SQL lengkap ada di README bagian 4)

- `items(id, lotcode UNIQUE NOT NULL, model, style, spk, qty, updated_at, deleted)`.
- `maps(id, idrak NOT NULL, lotcode NULL = rak kosong, updated_at, deleted)` — **`lotcode` boleh berulang** di maps (satu lot di banyak rak).
- Trigger `set_updated_at`, RLS aktif, policy `for all to anon, authenticated using (true) with check (true)`.
- Qty/model/style/SPK **melekat pada lot**, bukan pada rak.

## 5. Aturan bisnis yang sudah disepakati (jangan diubah tanpa diminta)

1. Format rak `Zona+IdRak-Kolom`, mis. `A1-3` = zona A, rak 1, kolom 3. Zona A & B, rak 1–10, kolom 1–8, plus `STG` (staging); `+ Rak baru…` tersedia. Konstanta `RAKS`.
2. Semua isian teks **otomatis huruf besar** (lotcode, rak baru, model, style, SPK, pencarian) — pasang di tingkat dokumen (capture) untuk `input/change/blur/keyup/paste/compositionend`, jaga posisi kursor, dan paksa lagi saat simpan.
3. **Tabel**: IDRak selalu paling kiri; kolom **Lotcode selalu tampil** (boleh digeser, tidak boleh disembunyikan); maks. 2 kolom item lain (SPK, Qty, Model, Style) dengan urutan yang bisa diatur ▲▼ (melompati kolom tersembunyi). Semua kolom **rata kiri**. Bawaan: IDRak, Lotcode, Qty, Model.
4. **Lebar kolom**: kolom data selebar isinya (`width:1%; white-space:nowrap`); kolom **Lotcode menyerap seluruh sisa lebar** (terpanjang) dan dipotong `…` hanya bila ruang habis; kolom Model/Style/SPK dipotong lebih dulu (`--colmax`).
5. **Garis tabel**: `border-collapse:collapse`; garis **tipis solid** di tiap baris (`--row`), **garis tebal** (3px, warna dasar) hanya saat **rak berganti** (`rk(id)=id.split('-')[0]`, kolom diabaikan); **zebra per baris** (`tr:nth-child(even)`), bukan per rak.
6. **Pencarian** (menggantikan filter dropdown): semua kolom, beberapa kata = AND, `KOSONG` = rak kosong, token yang sama persis dengan suatu nilai (mis. `A1-1`) hanya cocok persis (tidak ikut `A1-10`), ✕/Esc menghapus, ada hitungan "n dari m baris".
7. **Lot picker** di dialog Tambah/Ubah Baris: daftar lot dari `items`. Usulan "+ Lot baru" dan isian data lot **hanya muncul bila tidak ada lotcode yang sama/mirip**; lot yang sama persis → dipilih; mirip tapi belum ada → usulan disembunyikan, **Enter** memaksa lot baru, menyimpan tanpa konfirmasi diblokir dengan pesan. Lotcode **unik** di items (IndexedDB key + upsert + `UNIQUE`).
8. **Hapus lotcode**: soft delete lot; semua rak yang memakainya jadi kosong. **Hapus baris** hanya menghapus satu baris maps.
9. **Menu ☰**: Bagikan (WhatsApp), Tema (Otomatis/Terang/Gelap), Warna dasar (8 pilihan), Tampilan (kolom tabel + urutan, ukuran teks, kepadatan). Tombol **⟳ sinkron ada di header** (bukan di menu): berputar saat jalan, titik oranye bila ada perubahan belum terkirim, pesan merah bila gagal. Pengaturan disimpan di `localStorage` (`wh_set`, `wh_share`).
10. **Bagikan via WhatsApp**: dialog (cakupan "yang tampil sekarang"/"semua"), pratinjau yang boleh diedit, Salin, Kirim (`https://wa.me/?text=`). Format bawaan: judul, grup per **model**, baris `idrak > lotcode qty` diurut per lotcode, `RAK KOSONG` di akhir; ringkasan di atas. Bisa diatur lewat mode **Formulir** (sederhana) atau **Templat teks** (kata kunci `{idrak} {lotcode} {qty} …`) — keduanya satu mesin (`deriveTpl` → `tpl` → `shareBuild`), Formulir bawaan harus identik dengan `SH_DEF` (ada tesnya). Pesan panjang dibagi bagian (`WA_MAX`=1200), baris judul diulang "(bagian i/N)".
11. Ikon: kotak kardus "WH" di atas biru (PNG transparan) di `icons/`.

## 6. Pelajaran teknis (jangan ulangi kesalahan ini)

**CSS / tampilan**
- Atribut `hidden` **kalah** oleh CSS `display:flex/grid/block`. Setiap elemen yang disembunyikan lewat `hidden` dan punya `display` sendiri butuh aturan `[hidden]{display:none}` (pernah muncul pada `.pp`).
- Garis `border-collapse` berwarna **semi-transparan** terlihat tidak rata di sambungan kolom → pakai warna **solid** per tema (variabel `--row`, ada versi gelap).
- Kolom "selebar isi" di tabel: `width:1%; white-space:nowrap`. Kolom fleksibel yang boleh dipotong: `width:100%; max-width:0; overflow:hidden; text-overflow:ellipsis` (+ `min-width`).
- Tema: token warna di `:root`; gelap lewat `@media (prefers-color-scheme:dark)` dengan `:root:not([data-theme="light"])` **dan** `:root[data-theme="dark"]`; warna dasar lewat `html[data-color=…]` dengan variabel `--bl --dk --lt --ltd`; ukuran teks lewat CSS `zoom`.
- Teks gelap/terang: jangan hardcode `#fff` untuk latar kartu/input/menu → pakai `var(--card)`.

**JavaScript**
- Tombol di dalam menu yang digambar ulang (`innerHTML`) membuat `e.target` terlepas dari DOM; deteksi "klik di luar menu" harus memakai `e.composedPath()`, bukan `e.target.closest`.
- `<form method="dialog">` menutup dialog **sinkron** setelah handler submit selesai, sedangkan pekerjaan `async` di handler masih jalan → beri jeda ±200 ms di tes sebelum aksi berikutnya.
- Urutan sort natural: `a.localeCompare(b,undefined,{numeric:true})` (A1-2 sebelum A1-10).
- Tombol ▲▼ pada kolom yang tampil harus **melompati kolom tersembunyi** (dan kolom yang dilewati karena jadi judul kelompok), agar setiap ketukan terlihat hasilnya.
- Waktu menggabungkan data server ke IndexedDB, gunakan `{...lokal, ...server}`; kalau tidak, field lokal seperti `created` hilang dan urutan baris berubah.
- `Cache-first`/stale Service Worker pernah membuat pengguna melihat versi campuran. Tetap *network-first* + penjaga versi.
- Satu `index.html` + satu `app.js`: saat menyalin ke pratinjau satu-file, baris `serviceWorker` harus dibuang (kecuali `getRegistrations` milik penjaga versi) dan logo harus **PNG transparan** (JPEG membuat sudut hitam).

**Pengujian (Playwright)**
- `locator.inner_text()` **menerapkan `text-transform`** (teks jadi huruf besar) → bandingkan huruf kecil/`.lower()` atau pakai `text_content`.
- `fill()` tidak meninggalkan fokus di elemen → `click()` dulu sebelum `keyboard.type`.
- Tes harus memakai rak yang **ada** di dropdown (`A1-1…A10-8`, `B…`, `STG`); `A1-10` tidak ada.
- Gunakan `page.route('**/*.supabase.co/**', …)` untuk memalsukan Supabase; `window.open` bisa diganti lewat `page.evaluate` untuk menangkap URL `wa.me`.
- Di tool bash: **jangan** `pkill -f "http.server"` di awal perintah yang memuat teks itu sendiri (membunuh shell). Pakai pola khusus (mis. `pkill -f "m 8790"`) di akhir, dan jangan pakai `${PIPESTATUS[0]}` di `sh`.
- Perhatikan screenshot sungguhan; beberapa cacat hanya terlihat di gambar (mis. kolom Model terpotong di tepi kartu).

**Layanan**
- Supabase free tier: proyek di-*pause* setelah 7 hari tanpa aktivitas; ada batas koneksi/pesan realtime — cari angka terbaru sebelum menyebutnya.
- WhatsApp: pesan **tebal** `*teks*`, miring `_teks_`, blok kode ``` ```; baris yang diawali `>` menjadi kutipan (jangan awali baris data dengan `>`); panjang link `wa.me` ada batasnya → pesan dibagi. Batas persisnya **belum teruji**.
- Halaman pratinjau yang diterbitkan: CSP memblokir jaringan keluar & Service Worker; `localStorage/IndexedDB` boleh. Perbarui halaman yang sama dengan mengirim `url` yang sama.

**Alur kerja dengan pengguna**
- Pengguna sering memakai kata yang bisa ditafsir ganda (mis. "tampilan", "urutan kolom", "border per rak"). Pelajaran: tunjukkan **screenshot** agar mereka menilai, dan sebut tafsiranmu.
- Pengguna menghargai: pratinjau gambar sebelum membangun fitur besar, ringkasan "yang berubah", dan peringatan keamanan yang singkat.

## 7. Cara menjalankan lingkungan di sandbox baru

```bash
pip install playwright pillow --break-system-packages && playwright install chromium   # jika belum ada
unzip warehouse-final.zip && cd warehouse-final
python tools/smoke_test.py          # harus PASS semua (±54 pemeriksaan di Versi 26)
python -m http.server 8080          # untuk screenshot manual
```
Node dipakai hanya untuk `node --check app.js`.

## 8. Backlog yang sudah dirancang bersama pengguna

1. **Notifikasi "ada data baru" pada ikon ⟳**: aplikasi menanyakan jumlah baris server yang berubah sejak sinkron terakhir (query hitung ringan tiap 30–60 dtk dan saat online lagi). Lencana **angka** (bukan hanya titik; bedakan dari titik oranye "belum terkirim"). Opsi di menu: data baru diambil **Otomatis** atau **Tanya dulu** (ketuk ⟳). Kirim perubahan sendiri tetap otomatis. Perubahan yang dikirim sendiri tidak boleh dihitung sebagai "data baru".
2. **Realtime dua arah** (Supabase Realtime/WebSocket): `alter publication supabase_realtime add table maps, items;`; terapkan perubahan masuk dengan aturan gabung yang sama; tarik 60 dtk tetap sebagai cadangan; penanda "Live/Terputus". Pilihan: `supabase-js` resmi dari CDN (di-pin, di-cache SW; gagal muat → tetap polling) — **disarankan** — atau klien WebSocket sendiri.
3. Kekerasan lotcode **tidak membedakan huruf besar/kecil** + migrasi data lama ke huruf besar (sudah ditawarkan, belum dikerjakan).
4. Beberapa format WhatsApp **bernama** yang tersimpan (sekarang hanya satu).
5. Impor Excel/CSV, scan barcode lotcode, kata sandi bersama atau Supabase Auth bila akses perlu dibatasi.

## 9. Keputusan terbuka / default yang saya pilih sendiri

- Cakupan awal dialog Bagikan: "Yang tampil sekarang". Lot yang belum punya rak tidak ikut terkirim (baris pesan berbasis rak).
- Format rak "A1-10 dan B1-10" ditafsirkan sebagai rentang kolom 1–8 per rak 1–10 (A dan B). Tanyakan bila pengguna ternyata maksud lain.
- (Tambahkan keputusan baru di sini sebelum berpindah akun.)

## 10. Status terakhir

- Versi **26**. Semua pemeriksaan `tools/smoke_test.py` lolos saat serah-terima.
- Belum teruji pada layanan sungguhan: sinkron ke Supabase milik pengguna, pembukaan `wa.me`, dan batas panjang pesan WhatsApp.
- (Isi di sini ringkasan pekerjaan terakhir sebelum berpindah akun.)

## TUGAS SEKARANG

<tuliskan di sini apa yang ingin dikerjakan, mis. "Buat notifikasi data baru pada ikon sinkron (README/prompt bagian 8.1), pilihan Otomatis/Tanya dulu, lencana angka.">

Mulai dengan: (1) membaca README, (2) menjalankan `tools/smoke_test.py` untuk memastikan lingkungan dan proyek sehat, (3) baru mengerjakan tugas di atas sesuai alur kerja bagian 2.

=== SELESAI PROMPT ===

---

## Prompt singkat (cadangan, bila tidak bisa melampirkan zip)

```
Saya melanjutkan proyek "Warehouse – Maps": PWA offline-first (HTML/CSS/JS murni, tanpa library) untuk memetakan rak ↔ lotcode,
sinkron ke Supabase (tanpa login, publishable key, RLS anon). Tabel: items(lotcode UNIQUE, model, style, spk, qty, updated_at, deleted)
dan maps(id, idrak, lotcode NULL=kosong, updated_at, deleted). IndexedDB lebih dulu; sinkron = kirim baris dirty lalu tarik updated_at > since
(yang terakhir menang). Aturan: semua teks huruf besar; Lotcode selalu tampil (bisa digeser), kolom Lotcode terlebar & dipotong "…" hanya bila
perlu; garis tebal hanya saat RAK berganti (A1-3 = rak A1 kolom 3), garis tipis solid tiap baris, zebra per baris; pencarian satu kolom;
usulan lot baru hanya bila tidak ada lotcode yang sama/mirip; fitur Bagikan via WhatsApp dengan mode Formulir/Templat (grup per model,
baris "idrak > lotcode qty"). Bahasa Indonesia, ringkas; jelaskan dulu bila diminta "jelaskan dulu"; tampilkan contoh gambar bila diminta;
sebutkan tafsiranmu bila ambigu; jujur soal yang belum teruji (Supabase/WhatsApp tak bisa dijangkau dari sandbox); setiap perubahan:
uji dengan Playwright, naikkan versi di index.html+app.js+sw.js, perbarui README, bangun pratinjau & zip, dan lihat screenshot sendiri.
Tolong minta saya melampirkan zip proyek, lalu kita lanjutkan. Tugas: <isi di sini>
```
