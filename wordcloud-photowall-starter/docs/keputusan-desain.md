# Keputusan desain

Sumber: canvas Claude Design "Wordcloud Photowall — UI Design" (https://claude.ai/artifact/WwBPrkW8oA3tT3g4CApWUQ, privat). Salinan artboard ada di `design/artboards/`.

## Peta layar

| Layar | Route | Artboard referensi |
| --- | --- | --- |
| Landing | `/` | `Landing.dc.html` |
| Create Session | `/create` | `Create.dc.html` |
| Siap tayang | `/s/[kode]/ready` | `Siap-Tayang.dc.html` |
| Join Session | `/join` | `Join-HP.dc.html`, `Join-Desktop.dc.html` (tablet: `Join-Tablet.dc.html`) |
| Masuk admin sesi | `/masuk-admin` | `Masuk-Admin-HP.dc.html`, `Masuk-Admin-Desktop.dc.html` |
| Photowall | `/s/[kode]/display` | `Main.dc.html` (Hitam), `Photowall-Putih`, `Photowall-Foto`, `Photowall-Awal`, `Photowall-Penuh` |
| Input | `/s/[kode]/input` | `Input-Reggae` (interaktif), `Input-Hitam`, `Input-Putih`, `Input-Foto`, `Input-HP-*` |
| Admin sesi | `/s/[kode]/admin` (+ `/tema`, `/blocklist`, `/dashboard`) | `Admin-Sesi-Live`, `Admin-Sesi-Tema`, `Admin-Sesi-Blocklist`, `Admin-Sesi-Dashboard`, `Admin-Sesi-HP` |
| Login admin global | `/admin/login` | `Admin-Global-Login.dc.html` |
| Admin global | `/admin`, `/admin/blocklist`, `/admin/settings` | `Admin-Global.dc.html`, `Admin-Global-Blocklist.dc.html` |

File `*-Light.dc.html` hanya pembungkus mode terang dari artboard yang sama.

## Token warna UI crew & admin

| Token | Gelap | Terang | Dipakai untuk |
| --- | --- | --- | --- |
| bg | #0D0D0F | #F4F3EE | Latar halaman |
| surface | #16161A | #FFFFFF | Kartu, panel |
| surface2 | #1F1F25 | #EFEEE8 | Blok sekunder, chip kode |
| line | #2C2C34 | #DCDAD1 | Border |
| lineStrong | #5A5A66 | #9A988F | Border putus-putus tile "Upload foto" |
| fg | #F4F3EF | #141416 | Teks utama |
| muted | #A3A3AD | #55555D | Teks sekunder |
| primary | #FFE14D | #141416 | Tombol utama |
| onPrimary | #111111 | #FFFFFF | Teks di tombol utama |
| hl / onHl | #FFE14D / #111111 | #FFD400 / #141416 | Kotak kode sesi, badge "Di tengah" |
| field | #0F0F12 | #FFFFFF | Isi input form |
| ring | #FFE14D | #141416 | Border input yang aktif |
| live | #3DDC84 | #157A3A | Status LIVE, tombol Setujui |
| warn | #FFB25C | #A84B00 | Menunggu approve, input dijeda |
| danger | #FF6B6B | #C21F1F | Clear, Akhiri sesi |
| info | #7FD8F7 | #0B5C8C | Tampilan dibekukan |

Latar status pakai warna yang sama dengan alpha 10-16%. Radius: kartu 18-24 px, tombol dan input 12-16 px, pill 999 px. Target sentuh minimal 44 px.

## Tipografi

- Baloo 2 ExtraBold (800): kata di photowall, kalimat ajakan dan field di halaman input.
- Plus Jakarta Sans 400-800: semua UI crew dan admin.
- JetBrains Mono 700: kode sesi dan PIN.

## Photowall

- Hitam (default, paling cocok untuk infocus): latar #000000, palet #FFE14D, #3DE0FF, #FF4FAE, #59F59A, #FF9F45, #B79CFF, #FFFFFF.
- Putih: latar #FFFFFF, palet #0B2E8A, #B0125B, #0A6B4C, #B93D08, #5A22B0, #141416.
- Foto: gambar upload + overlay hitam (default 45%, bisa diatur), palet #FFFFFF, #FFE14D, #8BE9FF, #FF8CCB, #9DFFBF.
- Tanpa glow dan tanpa text-shadow. Warna tiap kata dipilih dari palet dengan seed dari id kata supaya tidak berkedip saat layout dihitung ulang.

### Mesin layout (referensi: `design/artboards/Main.dc.html`)

1. Urutkan kata dari terbaru (r = 0) ke terlama.
2. Ukuran relatif: `g(r) = minRatio + (1 - minRatio) * exp(-r / k)`, default k = 8, minRatio = 0.2. Ukuran font = S x g(r), dengan batas bawah 2% tinggi layar.
3. Ukur kotak tinta tiap kata dengan canvas `measureText` (actualBoundingBox*), tambah padding `fs * 0.03 + 0.5 px` (skala 1280).
4. Kata terbaru tepat di tengah. Kata lain dicari posisinya di cincin persegi panjang konsentris dari tengah (rasio cincin = rasio area aman), titik awal tiap kata diacak dengan seed, jarak antar cincin dan langkah mengikuti tinggi kata.
5. Tabrakan dicek di grid okupansi (lebar 560 sel) dengan cek baris tengah dan tepi dulu supaya cepat.
6. Skala global S dicari dengan binary search: mulai dari batas atas `min(maxPct% tinggi layar, lebar kata terbaru muat 96% area)`, turunkan sampai semua kata muat, lalu 5 iterasi bisection. Kalau sudah di batas keterbacaan dan masih tidak muat, kata tertua tidak ditampilkan (tetap tersimpan).
7. Area aman default 2% dari tepi; maxPct default 34% tinggi layar.

Kinerja di tes: sekitar 0.2 dtk untuk 160 kata dan 0.5 dtk untuk 300 kata di 1280x720, terisi sekitar 60% area. Pindahkan ke Web Worker kalau terasa berat. Animasi transisi (FLIP, sekitar 700 ms) belum ada di referensi.

## Halaman input

| Tema | Latar | Teks | Field | Tombol Kirim | Card blur (kalau nyala) |
| --- | --- | --- | --- | --- | --- |
| Reggae | Pita horizontal #D62F2F / #F5C02E / #17924A | #0C0C0C | Putih, border 4 px #0C0C0C | #0C0C0C, teks #F5C02E | rgba(255,255,255,0.32), border rgba(255,255,255,0.45) |
| Hitam | #000000 | Putih | #141416, border 4 px #FFE14D | #FFE14D, teks hitam | rgba(255,255,255,0.07), border rgba(255,255,255,0.14) |
| Putih | #FFFFFF | #141416 | #F6F5F1, border 4 px #141416 | #141416, teks putih | rgba(20,20,22,0.04), border rgba(20,20,22,0.10) |
| Foto | Gambar + overlay hitam 55% | Putih | Putih | #FFE14D, teks hitam | rgba(10,10,12,0.45), border rgba(255,255,255,0.14) |

- Card blur: `backdrop-filter: blur(18px)` saat nyala. Padding dan radius panel selalu ada (transparan saat mati) supaya layout tidak bergeser.
- Isi: status koneksi kanan atas, kalimat ajakan (Baloo 2, 68 px di tablet, 40 px di HP), field 1 kata, bantuan "Cukup satu kata, tanpa spasi." + penghitung `n/20`, tombol Kirim.
- State: Terkirim (pill "Terkirim — lihat layar!" sebentar, field dikosongkan), lebih dari satu kata ("Cukup satu kata ya", tombol nonaktif), diblokir ("Coba kata lain ya"), offline (banner "Koneksi terputus. Menyambung ulang…", tombol "Menunggu koneksi").
- Validasi: buang karakter selain huruf, angka, dan tanda hubung; tolak spasi di tengah; potong di maks karakter.

## Gambar latar (Create Session dan admin sesi)

- Ada di dua tempat: Create Session (bagian Tema photowall dan Halaman input) dan admin sesi tab Tema & tampilan ("Gambar latar photowall (tema Foto)" dan "Gambar latar input (tema Foto)").
- Pilihan berupa thumbnail 120x68 px dari pustaka (yang terpilih diberi border tebal dan `aria-pressed`), lalu tile "Upload foto" dengan border putus-putus `lineStrong`.
- Latar photowall dan latar input dipilih terpisah. Di admin sesi, preview input tema Foto langsung memakai gambar yang dipilih.
- Pustaka diisi admin global; foto yang di-upload dari sesi hanya milik sesi itu.

## Blocklist sesi (admin sesi)

- Tab "Blocklist" di nav admin sesi, setelah "Tema & tampilan". Di HP masuk bottom nav (5 item, ikon larangan).
- Kiri: judul "Blocklist sesi ini", form satu field + tombol "Tambah", jumlah kata, chip kata dengan tombol hapus (target 34 px, label "Hapus <kata> dari blocklist"). Kata disimpan huruf kecil; duplikat diabaikan.
- Kanan: kartu "Blocklist global" hanya-baca dengan ikon gembok dan "Diatur admin global", lalu kartu "Cara kerja".
- Pengecekan di server: kata yang dinormalisasi dicocokkan ke blocklist global + blocklist sesi; audiens hanya melihat "Coba kata lain ya". Kata yang sudah tampil tidak hilang otomatis; operator menyembunyikannya dari Live feed.

## Aset

`design/assets/foto-panggung.jpg` dan `foto-reggae.jpg` adalah gambar contoh buatan untuk tema Foto, bukan foto event asli. QR di desain hanya contoh tampilan; di aplikasi pakai library `qrcode`.
