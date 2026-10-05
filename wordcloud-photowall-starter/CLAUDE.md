# Wordcloud Photowall

Web app realtime untuk photowall event: audiens mengetik satu kata di device input, kata itu langsung muncul paling besar di tengah wordcloud yang diproyeksikan infocus ke kain/tembok, lalu mengecil bertahap ke luar saat kata baru masuk. Target 300 audiens per sesi, satu atau beberapa device input dari EO.

## Sumber kebenaran

Baca ini sebelum mengerjakan apa pun:

1. `docs/rencana-proyek.md`: rencana lengkap (alur, halaman, fitur, arsitektur, model data, event realtime, route, setup Docker lokal, risiko, fase).
2. `docs/keputusan-desain.md`: token warna, font, spesifikasi tiap layar, dan detail mesin wordcloud.
3. `design/artboards/*.dc.html`: desain referensi dari Claude Design. Pakai untuk warna, ukuran, jarak, teks, dan state UI. `Main.dc.html` berisi algoritma layout wordcloud yang sudah diuji (method `layout`, `find`, `free`, `mark`).

Kalau ada yang bertentangan, urutan prioritas: bagian "Keputusan desain terbaru" di file ini, lalu `docs/keputusan-desain.md`, lalu `docs/rencana-proyek.md`.

## Stack wajib

- Next.js App Router + TypeScript (strict) + Tailwind CSS. Tema lewat CSS variables.
- Custom server `server.ts`: satu HTTP server untuk Next.js + Socket.IO (WebSocket only, tanpa long-polling).
- PostgreSQL + Drizzle ORM, Redis + Socket.IO Redis adapter.
- Zod untuk semua payload socket dan REST. Auth: cookie bertanda tangan (jose) + argon2.
- Docker: `docker compose` untuk PostgreSQL + Redis saat development, plus Dockerfile dan service `app` (profile `app`) untuk uji build produksi di laptop. Detail di `docs/rencana-proyek.md` bagian "Setup Docker di laptop lokal".
- Font dibundle lokal lewat `next/font`: Baloo 2 (800) untuk kata wordcloud dan halaman input, Plus Jakarta Sans untuk UI crew/admin, JetBrains Mono untuk kode sesi dan PIN.

## Lingkup: development lokal saja

- Semua fase dikerjakan dan dites di laptop lokal sampai selesai. App jalan di `localhost:3000`; HP dan tablet untuk uji dibuka lewat `http://<IP-laptop>:3000` di Wi-Fi yang sama.
- Setup home server, Cloudflare Tunnel, domain, dan deploy di luar lingkup. Jangan dikerjakan, disiapkan, atau ditambahkan ke rencana kecuali saya minta.
- Docker tetap disiapkan dari fase 1 (compose + Dockerfile) dan dipakai untuk menjalankan database, Redis, dan uji build di laptop.

## Keputusan desain terbaru (menimpa rencana kalau berbeda)

Umum
- Tidak ada nama event yang di-hardcode di mana pun (contoh nama sesi di desain: "Sesi Photowall").
- Tidak ada logo atau tulisan merek "Wordcloud Photowall" di header. Header halaman crew hanya berisi tombol mode gelap/terang di kanan atas.
- Semua halaman crew dan admin punya mode gelap dan terang (toggle di header, simpan pilihan per device).

Landing `/`
- Tanpa hero. Langsung dua kartu besar: Create Session (kartu utama) dan Join Session, plus tautan kecil "Masuk admin" di bawahnya.

Create Session `/create`
- Tema photowall dan tema input masing-masing punya pilihan gambar latar: thumbnail dari pustaka plus tile "Upload foto" (dipakai saat tema Foto). Foto dikirim bersama form pembuatan sesi.

Siap tayang `/s/[kode]/ready`
- Kartu kode sesi + QR join, kartu akses admin (kode, PIN dengan tombol tampil/salin, tombol "Buka admin sesi di device ini", dan QR admin), lalu tombol besar "Mulai tayang".
- Tidak ada checklist "Sebelum mulai".

Join dan Masuk admin
- Responsif: HP satu kolom; desktop dua kolom (teks kiri, kartu form kanan); tablet tegak jadi satu kolom di tengah. Tombol join berlabel "Gabung".

Input `/s/[kode]/input`
- Satu layout untuk semua tema (Reggae, Hitam, Putih, Foto); yang beda hanya latar dan warna. Tidak ada nama event, tidak ada logo EO.
- Kalimat ajakan bisa diatur per sesi (default "Satu kata untuk malam ini?").
- Card blur di belakang teks bisa dinyalakan/dimatikan per sesi. Posisi dan ukuran elemen harus identik saat nyala atau mati; yang berubah hanya background, border, dan backdrop-filter panelnya.
- Reggae: pita merah #D62F2F, kuning #F5C02E, hijau #17924A dengan aksen hitam (teks hitam, tombol hitam teks kuning). Foto: gambar + overlay hitam 55%.

Photowall `/s/[kode]/display`
- Hanya kata, tanpa glow, tanpa UI, kursor disembunyikan.
- Mesin layout: posisi dicari dengan cincin persegi panjang (rasio layar) dari tengah, lalu skala global dimaksimalkan dengan binary search sampai layar penuh sampai ke pojok. Area aman default 2%. Bukan spiral elips seperti di rencana awal. Detail di `docs/keputusan-desain.md`.

Admin
- Admin sesi: tab Live & moderasi, Tema & tampilan, Blocklist, Dashboard, Hasil & unduh (di HP: bottom nav 5 item). Header berisi nama sesi, kode, status LIVE, jumlah device terhubung, toggle mode.
- Tema & tampilan punya saklar "Card blur di belakang teks", field "Kalimat ajakan", dan upload foto latar untuk photowall dan input; tidak ada upload logo EO.
- Blocklist sesi: form tambah kata + daftar chip yang bisa dihapus. Di sampingnya blocklist global tampil hanya-baca ("Diatur admin global", tetap berlaku di sesi ini).
- Admin global tetap punya blocklist global, default sesi baru, dan pustaka gambar latar.

## Cara kerja

- Kerjakan per fase sesuai "Fase pengerjaan" di `docs/rencana-proyek.md`. Mulai tiap fase dengan plan mode, tunggu persetujuan, baru tulis kode.
- Sebelum menyatakan fase selesai, jalankan uji di mode dev dan, kalau fase menyentuh build atau server, juga di `docker compose --profile app up --build`.
- Satu fase selesai kalau kriteria "Selesai bila" di rencana terpenuhi dan sudah dites.
- Jangan menambah fitur, library besar, atau halaman di luar rencana tanpa bertanya dulu.
- Teks UI dalam Bahasa Indonesia, sama persis dengan desain kecuali diminta lain.
- Kalau ada keputusan baru dari saya, catat di bagian "Keputusan desain terbaru" file ini.

## Perintah

Diisi setelah Fase 1. Yang direncanakan:

- `docker compose up -d`: nyalakan PostgreSQL + Redis.
- `npm run dev`: app di `localhost:3000` (juga terbuka di IP laptop).
- `npm run db:migrate`, `npm run db:seed`: migrasi dan data contoh.
- `docker compose --profile app up --build`: uji build produksi di laptop.
