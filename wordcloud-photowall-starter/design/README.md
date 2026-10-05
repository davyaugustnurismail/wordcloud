# Desain referensi

Salinan artboard dari canvas Claude Design "Wordcloud Photowall — UI Design" (https://claude.ai/artifact/WwBPrkW8oA3tT3g4CApWUQ).

- File `.dc.html` tidak bisa dibuka langsung di browser karena butuh runtime canvas Claude Design. Baca sebagai referensi markup: warna, ukuran, jarak, teks, dan state.
- `{{...}}` adalah nilai dari script di bawah tiap file (misalnya `c.bg` = token warna sesuai mode gelap/terang).
- Gambar `/_blob/...` di markup merujuk ke `assets/foto-panggung.jpg` dan `assets/foto-reggae.jpg`.
- `Main.dc.html` berisi mesin layout wordcloud yang sudah diuji. Porting ke `lib/wordcloud/` sebagai TypeScript murni (tanpa DOM kecuali pengukuran teks), supaya bisa dipakai di photowall, preview admin, dan render PNG 4K.
- File `*-Light.dc.html`, `Join-Tablet*`, `Masuk-Admin-Tablet*`, dan `Photowall-*` hanya pembungkus artboard lain dengan prop berbeda.
- `canvas.json` adalah indeks canvas: judul dan posisi tiap artboard, berguna untuk melihat layar mana yang satu kelompok.
