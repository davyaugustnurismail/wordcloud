# Wordcloud Photowall — Rencana Proyek

Disalin dari doc "Wordcloud Photowall — Rencana Proyek" (5 Okt 2026) dan disesuaikan dengan keputusan desain terbaru. Kalau ada yang bertentangan, `CLAUDE.md` bagian "Keputusan desain terbaru" yang berlaku.

## Lingkup rencana ini

Rencana ini hanya untuk **mengembangkan web app di laptop lokal sampai selesai**. Semua fase dikerjakan dan dites di laptop, dengan PostgreSQL dan Redis berjalan lewat Docker.

Di luar lingkup (dibahas terpisah setelah semua fase selesai): setup home server, Cloudflare Tunnel, domain, deploy, backup terjadwal di server, dan gladi di venue. Jangan dikerjakan atau disiapkan di fase mana pun.

## Ringkasan

Satu web app Next.js yang mengubah kata dari audiens menjadi background photowall realtime: kata terbaru selalu muncul di tengah dan paling besar tepat saat pengirimnya difoto. Konteks: event, target 300 audiens, satu device input apa saja dari EO, wordcloud ditembakkan infocus ke kain atau tembok.

Prinsip desain yang dipegang di seluruh rencana:

- **Momen foto adalah inti.** Kata yang baru dikirim langsung muncul di tengah; urutan orang yang berfoto diatur crew di venue.
- **Photowall bersih total.** Tidak ada tombol, kursor, atau teks lain selain kata; semua kontrol ada di admin.
- **Kata yang sama boleh dikirim berkali-kali** dan tampil sebagai entri terpisah.
- **Tahan gangguan.** Koneksi putus tidak boleh membuat layar kosong atau kata hilang.
- **Mudah dioperasikan crew** di lapangan tanpa perlu paham teknis.

## Alur pengguna

Satu sesi melibatkan tiga perangkat: laptop photowall masuk lewat Create Session, device input lewat Join Session, dan operator lewat tautan Masuk admin dengan kode sesi plus PIN.

Di mode Langsung (default), kata dari device input naik ke tengah photowall seketika dan kolom input langsung kosong lagi. Di mode Approve, kata menunggu di admin sesi sampai disetujui; admin global di `/admin` bisa membuka sesi mana pun tanpa PIN.

## Halaman & fitur

Ada tujuh halaman; hanya photowall yang benar-benar tanpa UI, sisanya dipakai crew atau admin dan semuanya responsif untuk HP, tablet, maupun laptop.

| Halaman | Route | Dipakai oleh | Akses |
| --- | --- | --- | --- |
| Landing | `/` | Crew | Publik: tombol Create Session dan Join Session, plus tautan kecil Masuk admin |
| Setup sesi | `/create` | Siapa pun yang tahu password | Password pembuat sesi |
| Siap tayang | `/s/[kode]/ready` | Pembuat sesi | Pembuat sesi |
| Photowall | `/s/[kode]/display` | Laptop ke infocus | Kode sesi, hanya-baca |
| Input | `/s/[kode]/input` | Device apa saja dari EO | Kode sesi |
| Admin sesi | `/s/[kode]/admin` | Operator | Kode sesi + PIN |
| Admin global | `/admin` | Kamu | Login admin |

### Create Session

- Nama sesi dan password pembuat sesi; PIN admin 6 digit dibuat otomatis.
- Mode moderasi: Langsung (default) atau Approve.
- Tema photowall dan tema input, masing-masing dengan **gambar latar**: pilih dari pustaka atau **Upload foto** sendiri (dipakai saat tema Foto).
- Kalimat ajakan dan maksimal karakter untuk halaman input.

### Photowall

- Hanya kata. Kursor disembunyikan; fullscreen dipicu dari tombol Mulai di halaman Siap tayang karena browser butuh klik untuk masuk fullscreen.
- Screen Wake Lock aktif supaya laptop tidak sleep di tengah acara.
- Auto-reconnect diam-diam; selama putus, kata terakhir tetap tampil.
- Tema, pause, dan clear dikendalikan dari admin, bukan dari layar ini.

### Input (mode kiosk)

- Satu kolom besar dan tombol Kirim; keyboard langsung terbuka, tata letak menyesuaikan HP, tablet, atau laptop.
- Hanya 1 kata: spasi ditolak, emoji dibuang, maksimal karakter bisa diatur (default 20).
- Setelah kirim, kolom langsung kosong lagi untuk orang berikutnya; tanda kecil "Terkirim" muncul sebentar tanpa menghalangi.
- Kata yang kena blocklist dapat pesan netral "coba kata lain" tanpa menyebut alasannya.

### Admin per sesi

- Live feed kata, terbaru di atas: sembunyikan, tampilkan lagi, perbaiki typo.
- Mode moderasi per sesi: **Langsung** (default, kata tampil seketika) atau **Approve** (kata masuk daftar tunggu sampai disetujui). Bisa diganti kapan saja di tengah acara.
- Pause input, freeze tampilan, dan clear dengan konfirmasi.
- Pengaturan tema input dan photowall, parameter wordcloud, dan preview mini tampilan photowall.
- **Upload foto latar** untuk photowall dan input langsung dari tab Tema & tampilan, bisa diganti di tengah acara.
- **Tab Blocklist**: tambah dan hapus kata khusus sesi ini (misalnya istilah lokal yang muncul saat acara). Blocklist global ikut tampil hanya-baca dan tetap berlaku.
- Dashboard sesi: total kiriman, kata unik, kiriman per 5 menit, top kata, jumlah menunggu approve, device terhubung.
- Hasil dan unduh data: PNG wordcloud akhir resolusi tinggi, CSV dan JSON semua kata beserta statusnya.

### Admin global

- Daftar semua sesi aktif dan selesai; buka admin sesi mana pun tanpa PIN, reset PIN.
- Blocklist kata global (berlaku di semua sesi), plus bisa melihat dan mengubah blocklist tiap sesi; tidak ada filter bawaan.
- Default tema, mode moderasi, dan parameter untuk sesi baru, serta pustaka gambar latar yang muncul sebagai pilihan di Create Session dan admin sesi.
- Dashboard global: sesi aktif, total kata lintas sesi, aktivitas per jam, top kata.
- Unduh data per sesi atau semua sesi sekaligus (CSV, JSON), plus PNG akhir tiap sesi.
- Mengganti password pembuat sesi.

## Akses admin per sesi

Admin sesi dibuka dengan kode sesi dan PIN 6 digit yang dibuat saat Create Session, cukup diketik sehingga device operator tidak perlu kamera. Admin global selalu bisa masuk ke sesi mana pun tanpa PIN.

Tiga cara masuk, semuanya berakhir di form PIN yang sama:

- Dari landing, ketuk tautan kecil **Masuk admin**, lalu isi kode sesi dan PIN.
- Ketik langsung alamat `/s/[kode]/admin`, lalu isi PIN.
- Scan QR di halaman Siap tayang, hanya sebagai jalan pintas untuk device yang punya kamera.

Aturan akses:

- Cookie admin sesi berlaku 24 jam; koneksi WebSocket admin memakai cookie yang sama saat handshake.
- Rate limit 10 percobaan PIN per menit per IP.
- **Create Session terbuka untuk siapa pun yang tahu password pembuat**; tanpa password, sesi tidak bisa dibuat walau server terbuka ke internet.
- Join cukup dengan kode sesi 6 karakter. Opsional: kunci input hanya untuk device terdaftar, supaya kode yang bocor tidak bisa dipakai spam.
- Jalur upgrade: kalau nanti banyak EO memakai sistem ini, tambahkan akun operator tanpa mengubah struktur sesi.

## Mesin wordcloud

Ukuran kata ditentukan urutan kebaruan, bukan frekuensi: kata terbaru paling besar di tengah, lalu mengecil bertahap ke luar, dan seluruh susunan diskalakan supaya selalu memenuhi layar. Library wordcloud umum (seperti d3-cloud) mengacak ulang posisi setiap update, jadi bagian ini dibuat custom.

### Ukuran progresif

```latex
ukuran(r) = s_{min} + (s_{max} - s_{min}) \cdot e^{-r/k}
```

r adalah peringkat kebaruan (0 = terbaru), k mengatur seberapa cepat kata mengecil. Dengan k = 8, kata ke-8 berukuran sekitar 37% dari selisih ukuran terbesar dan terkecil, jadi penurunannya halus, bukan langsung kecil. Setelah layout selesai, seluruh kata diskalakan bersama supaya mengisi area aman layar: saat kata masih sedikit semuanya besar, saat sudah 300 skala turun tapi urutan ukurannya tetap.

### Penempatan

1. Urutkan kata dari terbaru ke terlama.
2. Kata terbaru diletakkan tepat di tengah.
3. Kata lain dicoba dulu di posisi lamanya, sedikit ditarik ke tengah, supaya tidak loncat-loncat.
4. Kalau bertabrakan, cari posisi kosong lewat spiral berbentuk elips dari tengah, mengikuti rasio layar 16:9.
5. Tabrakan dicek dengan kotak teks yang diukur lewat canvas `measureText` plus padding.
6. Kalau ada kata yang tidak muat, skala global diturunkan lalu diulang; kalau sudah di batas keterbacaan, kata tertua di-fade out dari layar tapi tetap tersimpan di database.

### Animasi dan render

- Kata baru membesar dari titik tengah dalam sekitar 700 ms, bersamaan kata lain bergeser dan mengecil.
- Animasi hanya memakai transform dan opacity (teknik FLIP) supaya tetap mulus di laptop spek rendah.
- Warna tiap kata dipilih dari palet tema satu kali, dengan seed dari id kata, jadi tidak berkedip saat layout dihitung ulang.
- Render sebagai elemen DOM absolut; 300 elemen masih ringan. Perhitungan layout dipindah ke Web Worker kalau mulai terasa berat.

### Kapan kata naik ke tengah

Tidak ada antrean: kata naik ke tengah begitu diterima server di mode Langsung, atau begitu disetujui di mode Approve. Kalau dua kata masuk berdekatan, kata terakhir yang berada di tengah; urutan orang yang berfoto diatur crew di venue.

### Siluet (opsional, fase akhir)

Wordcloud bisa mengisi bentuk tertentu dari gambar mask hitam-putih. Untuk ini cek tabrakan berganti dari kotak ke bitmap, jadi dikerjakan setelah versi kotak stabil.

## Tema & pengaturan tampilan

Tema dipisah per halaman: input punya Reggae, Hitam, Putih, dan Foto; photowall punya Hitam, Putih, dan Foto. Perubahan tema dari admin langsung terkirim realtime ke semua layar yang terbuka.

| Tema | Berlaku di | Latar | Warna kata dan elemen |
| --- | --- | --- | --- |
| Reggae | Input | Merah, kuning, hijau dengan aksen hitam | Tombol dan teks kontras tinggi |
| Hitam | Input, photowall | Hitam pekat | Warna neon cerah seperti contoh di slide |
| Putih | Input, photowall | Putih | Warna gelap dan jenuh supaya terbaca |
| Foto | Input, photowall | Gambar upload | Overlay gelap atau terang yang bisa diatur, plus bayangan teks |

Catatan proyeksi: latar hitam paling cocok untuk infocus. Area hitam tidak memancarkan cahaya, jadi kata terlihat melayang di kain dan di tubuh orang; latar putih atau foto akan menyinari seluruh badan dan membuat kata kurang menonjol di foto.

Pengaturan yang bisa diubah per sesi:

- **Photowall:** tema, palet warna, font, ukuran terbesar dan terkecil, kecepatan mengecil (k), maksimal kata tampil, area aman (margin % dari tepi), gaya huruf (kecil, asli, kapital), siluet.
- **Input:** tema, kalimat ajakan (misalnya "Satu kata untuk malam ini?"), maksimal karakter (default 20), card blur di belakang teks (nyala/mati).
- **Moderasi:** mode Langsung (default) atau Approve, bisa diganti di tengah acara.
- **Gambar upload:** dari Create Session, admin sesi, atau pustaka admin global; dikompres dengan sharp ke lebar maksimal 1920 px dan disimpan di folder `UPLOAD_DIR` (lokal: `./data/uploads`).
- **Font:** dibundle lokal lewat next/font, jadi tidak bergantung internet di venue.

## Arsitektur & tech stack

Satu custom server Node menjalankan Next.js dan Socket.IO (WebSocket) di port yang sama, ditemani PostgreSQL untuk data dan Redis supaya realtime bisa diskalakan ke lebih dari satu instance.

Kata dikirim lewat event socket dengan ack, disimpan ke PostgreSQL, lalu disiarkan ke room sesi itu; lewat Redis adapter, siaran sampai ke semua instance. Layout wordcloud tetap dihitung di browser photowall.

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Framework | Next.js App Router + TypeScript | Wajib; satu codebase untuk halaman dan API |
| Styling | Tailwind CSS | Wajib; tema lewat CSS variables |
| Database | PostgreSQL + Drizzle ORM | Skema dan migrasi ber-tipe, ringan |
| Realtime | Socket.IO (WebSocket) di custom server Node | Room per sesi, ack per kiriman, reconnect otomatis |
| Skala | Redis + Socket.IO Redis adapter | Siaran sampai ke semua instance kalau app lebih dari satu |
| Validasi | Zod | Setiap event socket dan payload REST |
| Auth | Cookie bertanda tangan (jose) + hash argon2 | Dicek di halaman, REST, dan saat handshake socket |
| Animasi | Motion atau FLIP manual | Transisi posisi dan ukuran kata |
| Dashboard | Recharts | Grafik kiriman per waktu dan top kata |
| Gambar dan QR | sharp, qrcode | Kompres upload; QR join dan admin |

Route handler Next.js tidak bisa menerima koneksi WebSocket, jadi app dijalankan lewat `server.ts` yang membuat HTTP server, menyerahkan request halaman ke Next.js, dan memasang Socket.IO di server yang sama. Yang membuatnya aman dan bisa diskalakan:

- **Handshake terautentikasi:** koneksi memeriksa cookie admin atau kode sesi lalu menetapkan peran (photowall, input, admin); event admin hanya diterima dari peran admin.
- **Room terpisah:** tiap sesi punya room sendiri plus room admin untuk kata yang menunggu approve, jadi photowall tidak pernah menerima kata yang belum disetujui.
- **Validasi dan batasan:** origin dibatasi ke `PUBLIC_URL` (saat dev: localhost dan IP laptop di jaringan lokal), setiap event divalidasi Zod dan diberi rate limit.
- **Skala:** transport WebSocket saja (tanpa long-polling) supaya tidak butuh sticky session; tambah instance cukup dengan Redis adapter.

## Model data & event realtime

Enam tabel cukup untuk semua fitur; satu kiriman kata selalu satu baris, jadi kata yang sama tetap tersimpan dan tampil terpisah.

| Tabel | Kolom utama | Catatan |
| --- | --- | --- |
| sessions | id, code, name, pin_hash, status, settings (jsonb, termasuk mode moderasi), created_at, ended_at | Kode 6 karakter tanpa huruf ambigu seperti O/0 dan I/1 |
| entries | id, session_id, text, normalized, status (pending, visible, hidden), created_at, shown_at, device_id | shown_at terisi saat kata tampil (di mode Approve: saat disetujui); urutan ukuran mengikuti kolom ini |
| blocked_terms | id, term, session_id (kosong = global), created_at | Dicocokkan ke kolom normalized |
| assets | id, session_id (kosong = pustaka global), kind (latar input, latar photowall, mask), path, created_at | File fisik di `UPLOAD_DIR`. Foto dari Create Session dikirim bersama form pembuatan sesi (multipart), jadi langsung punya session_id |
| moderation_logs | id, entry_id, action, actor, created_at | Jejak approve, hide, edit, restore |
| app_settings | key, value (jsonb) | Default tema, parameter, hash password pembuat |

Komunikasi realtime memakai event Socket.IO. Setiap layar bergabung ke room sesinya saat connect, dan setelah reconnect server mengirim snapshot terbaru supaya tidak ada kata yang terlewat. Heartbeat bawaan Socket.IO menjaga koneksi tetap hidup.

| Event | Arah | Isi | Penerima |
| --- | --- | --- | --- |
| entry:submit | Input ke server | Kata; dibalas ack: tampil, menunggu approve, atau ditolak | Server |
| snapshot | Server ke client | Kata visible + settings; admin juga dapat daftar tunggu | Photowall, admin, saat connect |
| entry:pending | Server ke room admin | Kata baru di mode Approve | Admin |
| entry:shown | Server ke room sesi | Kata yang naik ke tengah | Photowall, admin |
| entry:approve, entry:hide, entry:restore, entry:edit | Admin ke server | Id kata, plus teks baru untuk edit | Server |
| entry:hidden, entry:updated | Server ke room sesi | Id dan teks kata | Photowall, admin |
| settings:update | Admin ke server, lalu disiarkan | Settings baru | Photowall, input |
| session:paused, session:cleared | Server ke room sesi | Status sesi | Semua |
| presence | Server ke room admin | Jumlah photowall, input, admin terhubung | Admin |

## Struktur route & API

Halaman tetap di App Router dan semua komunikasi realtime lewat Socket.IO di `server.ts`; REST hanya untuk yang bukan realtime: membuat sesi, cek PIN, upload, unduh data, dan health check.

```
server.ts                               custom server: HTTP + Next.js + Socket.IO
app/
  page.tsx                              landing: Create / Join / Masuk admin
  create/page.tsx                       form sesi baru (password pembuat)
  join/page.tsx                         masukkan kode
  masuk-admin/page.tsx                  masukkan kode sesi + PIN
  s/[code]/
    ready/page.tsx                      kode + QR join + info admin + Mulai
    display/page.tsx                    photowall bersih
    input/page.tsx                      kiosk input
    admin/                              admin sesi (PIN)
      page.tsx                          Live & moderasi
      tema/page.tsx                     Tema & tampilan + upload latar
      blocklist/page.tsx                blocklist sesi
      dashboard/page.tsx                dashboard + hasil & unduh
  admin/
    login/page.tsx
    page.tsx                            dashboard global + unduh semua data
    sessions/[id]/page.tsx
    blocklist/page.tsx
    settings/page.tsx
  api/
    sessions/route.ts                   POST buat sesi (multipart, termasuk foto latar)
    sessions/[code]/pin/route.ts        POST cek PIN, set cookie 24 jam
    sessions/[code]/blocklist/route.ts  GET / POST / DELETE kata blocklist sesi
    sessions/[code]/export/route.ts     GET CSV / JSON satu sesi
    admin/export/route.ts               GET CSV / JSON semua sesi
    uploads/route.ts                    POST gambar (admin sesi atau admin global)
    health/route.ts                     GET health check
lib/
  realtime/                             handler event socket, room, rate limit
  wordcloud/                            layout, ukuran, animasi, render PNG
  db/                                   skema Drizzle + query
```

PNG wordcloud akhir dibuat di browser admin dengan mesin layout yang sama, dirender ke canvas resolusi 4K, jadi hasilnya identik dengan yang tampil di photowall.

## Setup Docker di laptop lokal

Docker dipakai sejak fase 1 supaya database, Redis, dan build app sama persis di mana pun nanti dijalankan. Ada dua cara jalan, dua-duanya di laptop:

- **Mode dev (sehari-hari):** `docker compose up -d` menyalakan PostgreSQL dan Redis saja, lalu app jalan di laptop dengan `npm run dev` (`server.ts` lewat tsx watch) supaya hot reload tetap cepat.
- **Mode uji build:** `docker compose --profile app up --build` menjalankan app di container dari Dockerfile yang sama dengan build produksi. Dipakai untuk mengecek build sebelum fase dinyatakan selesai, terutama di fase 6.

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: wordcloud
      POSTGRES_USER: wordcloud
      POSTGRES_PASSWORD: ${DB_PASSWORD:-wordcloud}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wordcloud"]
      interval: 5s
      retries: 10
  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379"
  app:
    profiles: ["app"]
    build: .
    env_file: .env
    environment:
      DATABASE_URL: postgres://wordcloud:${DB_PASSWORD:-wordcloud}@db:5432/wordcloud
      REDIS_URL: redis://redis:6379
      UPLOAD_DIR: /data/uploads
    ports:
      - "3000:3000"
    volumes:
      - ./data/uploads:/data/uploads
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
volumes:
  pgdata:
```

- **Dockerfile multi-stage:** install dependency, `next build`, bundle `server.ts` (misalnya dengan tsup), lalu runtime Node slim dengan user non-root. Output standalone tidak dipakai karena tidak kompatibel dengan custom server.
- **Migrasi:** `npm run db:migrate` di mode dev; di container, entrypoint menjalankan migrasi Drizzle sebelum server start.
- **Seed:** skrip seed untuk satu sesi contoh, password admin dan pembuat sesi untuk dev, dan beberapa gambar di pustaka.
- **Env (`.env.example` ikut di repo):** DATABASE_URL, REDIS_URL, AUTH_SECRET, ADMIN_PASSWORD_HASH, CREATOR_PASSWORD_HASH, PUBLIC_URL (dev: `http://localhost:3000`), UPLOAD_DIR (dev: `./data/uploads`). Folder `data/` masuk `.gitignore`.
- **Uji dari HP dan tablet:** server dev dan container mendengarkan di `0.0.0.0:3000`, jadi device di Wi-Fi yang sama bisa membuka `http://<IP-laptop>:3000`. Izinkan port 3000 di firewall laptop kalau diminta. Origin socket mengizinkan localhost dan IP laptop selama dev.
- **Fitur yang butuh HTTPS:** Wake Lock dan salin ke clipboard hanya jalan di `localhost` atau HTTPS. Saat dibuka lewat IP laptop (http) fitur itu harus gagal dengan aman tanpa error. Cookie admin memakai flag `secure` hanya kalau `PUBLIC_URL` diawali https, supaya login tetap jalan saat dites lewat IP laptop.
- **Health check** di `/api/health`: cek cepat apakah server, database, dan Redis siap.
- **Skala:** satu instance cukup untuk 300 audiens; Redis adapter sudah terpasang dari awal sehingga tambah instance nanti tidak butuh ubah kode.

## Risiko hari-H & mitigasi

Bagian ini mencatat risiko saat acara yang harus ditangani oleh aplikasi itu sendiri. Risiko terbesar adalah koneksi internet di venue, jadi layar harus tetap tampil saat putus dan cepat pulih saat koneksi kembali. Semua mitigasi di bawah dibangun dan diuji di lokal (misalnya dengan mematikan Wi-Fi device atau me-restart container).

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Internet venue putus atau lambat | Kata tidak masuk, layar beku | Photowall menyimpan state terakhir; Socket.IO reconnect lalu minta snapshot; input menampilkan status offline dan menahan tombol Kirim |
| Kata kasar atau tidak pantas | Terproyeksi di tubuh orang dan masuk foto | Blocklist custom termasuk istilah lokal, hide instan, pindah ke mode Approve kapan saja |
| Kata menumpuk di mode Approve | Orang menunggu kata tidak kunjung muncul | Jumlah menunggu approve tampil mencolok di admin sesi |
| Laptop sleep atau muncul notifikasi | Layar hilang saat foto | Wake Lock, mode jangan ganggu, browser mode kiosk |
| Proyeksi terpotong di tepi kain | Kata terpotong | Pengaturan area aman, kalibrasi saat gladi |
| Kata terlalu kecil di kamera | Background terlihat seperti noise | Batas ukuran minimum dan maksimal kata tampil, uji dari posisi kamera |
| Kode join bocor | Spam kata | Rate limit per IP, kunci device input, pause input dari admin |

## Fase pengerjaan

Enam fase berurutan, semuanya dikerjakan dan dites di laptop lokal. Tiap fase punya patokan selesai yang bisa dites. Fase 3 adalah titik minimal yang fiturnya sudah cukup untuk acara.

1. **Fondasi lokal.** Repo Next.js + Tailwind + TypeScript, `server.ts` dengan Socket.IO + Redis adapter, skema dan migrasi Drizzle, docker compose (PostgreSQL, Redis, dan service app di profile `app`), Dockerfile, `.env.example`, skrip seed, `/api/health`.
   - Selesai bila `docker compose up -d` lalu `npm run dev` membuka halaman kosong di `localhost:3000`, koneksi socket bisa dibuka dari HP lewat `http://<IP-laptop>:3000` di Wi-Fi yang sama, dan `docker compose --profile app up --build` juga jalan.
2. **Inti realtime.** Landing, Create dan Join, Siap tayang, halaman input, photowall dengan mesin wordcloud, reconnect plus snapshot.
   - Selesai bila kata dari HP muncul di photowall (di laptop) dalam waktu kurang dari 1 detik dan kata terbaru selalu di tengah.
3. **Admin sesi & moderasi.** Masuk dengan kode + PIN, live feed, hide, restore, edit, mode Langsung dan Approve, tab Blocklist sesi (cek blocklist global + sesi di server).
   - Selesai bila 30 kiriman beruntun di kedua mode berjalan tanpa ada kata belum disetujui yang bocor ke photowall, dan kata yang baru ditambahkan ke blocklist sesi langsung ditolak.
4. **Tema & pengaturan.** Empat tema input, tiga tema photowall, upload foto latar di Create Session dan di admin sesi (photowall dan input), kalimat ajakan, card blur, parameter wordcloud, area aman, preview.
   - Selesai bila perubahan tema dan foto latar dari admin sesi langsung terlihat di photowall dan input yang sedang terbuka.
5. **Admin global, dashboard, dan unduh data.** Daftar sesi, blocklist global, default sesi baru, pustaka gambar latar, grafik, PNG, CSV, dan JSON.
   - Selesai bila data satu sesi dan semua sesi bisa diunduh dan isinya cocok dengan database.
6. **Hardening & uji lokal.** Uji 300 kata dan 1.000 kata sebagai cadangan, uji koneksi putus (matikan Wi-Fi device, restart container db dan redis), uji beban socket dengan skrip lokal (300 klien), uji tampilan ke layar atau proyektor lewat HDMI dari laptop, uji semua alur di mode uji build (`--profile app`).
   - Selesai bila semua uji di atas lulus di build Docker lokal.

Siluet dikerjakan setelah fase 6 kalau waktunya cukup. Setup home server, tunnel, dan deploy direncanakan terpisah setelah semua fase ini selesai.

## Keputusan

Semua pertanyaan terbuka sudah dijawab; tabel ini mencatat keputusannya supaya tidak dibahas ulang.

| Topik | Keputusan |
| --- | --- |
| Antrean tampil | Tidak ada; urutan orang diatur crew di venue |
| Input | 1 kata, maksimal karakter bisa diatur (default 20) |
| Moderasi | Langsung (default) atau Approve, dipilih per sesi |
| Create Session | Siapa pun yang tahu password pembuat |
| Akses admin sesi | Kode sesi + PIN tanpa wajib QR, cookie 24 jam, rate limit 10 per menit per IP |
| Realtime | WebSocket lewat Socket.IO + Redis adapter |
| Blocklist | Global (admin global) + per sesi (tab Blocklist di admin sesi) |
| Gambar latar | Upload di Create Session dan admin sesi; admin global mengelola pustaka dan default |
| Lingkungan kerja | Laptop lokal sampai semua fase selesai, PostgreSQL dan Redis lewat Docker |
| Home server, tunnel, deploy | Di luar rencana ini; dibahas terpisah setelah fase 6 |
| Mode offline di venue (tanpa server) | Tidak disiapkan |
| Hasil acara | Diunduh dari admin sesi dan admin global: PNG, CSV, JSON |
| Device input | Apa saja: HP, tablet, atau laptop |
