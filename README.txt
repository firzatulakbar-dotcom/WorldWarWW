WORLD WAR 3.9.3 — GLOBAL STRATEGY WEB EDITION

PEMBARUAN UTAMA
- Garis batas negara diperjelas dengan outline nasional yang digambar di atas batas provinsi.
- Panel komando ditempatkan di sisi kanan desktop dan bottom-sheet di HP agar bagian tengah peta tetap terlihat.
- Pertempuran berlangsung tepat 5 detik.
- Efek ledakan kecil, asap, dan serpihan muncul singkat di lokasi pertempuran.
- Notifikasi dan konfirmasi ditampilkan di dalam game; tidak menggunakan dialog confirm/alert browser.
- Menu Wilayah menampilkan semua provinsi yang masih dikuasai dan provinsi hasil invasi.
- Kekuatan militer dikelola pada tingkat negara (cadangan nasional), bukan sebagai persediaan pasukan per provinsi. Kota, industri, dan benteng tetap dibangun per provinsi.
- Peringkat militer mengacu pada Global Firepower 2026 (145 negara). Negara lain menggunakan estimasi populasi dan GDP.
- Peringkat ekonomi memakai GDP nominal 2026 IMF WEO Oktober 2026 untuk negara dengan data tersedia; negara tanpa observasi IMF memakai estimasi GDP Natural Earth/populasi. Peringkat berubah selama kampanye.
- Seluruh mata uang game menggunakan USD. Kekuatan militer adalah cadangan nasional; kota, industri, dan benteng tetap per provinsi.
- Waktu simulasi dimulai pada 2026 dan dapat dipercepat ×1, ×2, atau ×4.

CARA MEMASANG WEBSITE
1. Ekstrak ZIP.
2. Upload seluruh isi folder ke hosting HTTPS (root atau folder website).
3. Pastikan index.html, style.css, script.js, sw.js, manifest.webmanifest, dan ikon berada dalam struktur folder yang sama.
4. Buka halaman website. Browser memuat data peta global secara otomatis pada kunjungan pertama.

CATATAN DATA PERINGKAT
- Military baseline: Global Firepower 2026, total 145 negara dalam indeks sumber.
- GDP: IMF WEO October 2026 nominal GDP estimates for top 25 economies; other economies use Natural Earth GDP_MD_EST / population-derived fallback. These are game starting references, not real-time financial accounts.
- Economic and military scores change with in-game conquest, recruitment and construction.

Catatan: game ini simulasi strategi melawan AI lokal di browser; belum menyediakan multiplayer real-time.


REVISI 3.9.1
- Membersihkan elemen HUD ganda agar kontrol tahun dan tombol panel tidak berulang.
- Memperluas data referensi GDP nominal IMF WEO Oktober 2026 untuk lebih banyak negara.
- Nama jenis wilayah ADM1 kosong/umum ditampilkan sebagai Provinsi; istilah khusus tetap diterjemahkan (Negara Bagian, Kegubernuran, Prefektur, dll.).
- Menghapus properti inventaris militer per provinsi yang tidak digunakan; unit hanya disimpan pada negara.
- Memperbarui cache shell website.


REVISI 3.9.2 — AI PERBATASAN DAN KEKUATAN PROPORSIONAL
- AI hanya memilih target provinsi yang terhubung langsung dengan provinsi miliknya.
- Serangan AI dibatasi pada garis perbatasan; serangan jarak jauh udara/laut tidak dipakai oleh AI.
- Setiap AI hanya dapat menjalankan satu operasi aktif dan memiliki jeda serangan.
- AI memilih target berdasarkan pertahanan, nilai strategis, dan jarak.
- Negara dengan peringkat militer referensi di bawah negara pemain memulai dengan cadangan serta garnisun yang lebih kecil, dan membalas lebih jarang dengan kekuatan serangan lebih rendah.


REVISI 3.9.3 — TANPA SERANGAN BALASAN DAN WARNA NEGARA KONTRAS
- AI tidak menyerang provinsi yang dikuasai pemain, termasuk ketika kedua negara sedang berperang.
- Serangan AI yang masih dalam perjalanan dibatalkan dan unitnya dikembalikan jika pemain lebih dulu menguasai target.
- Negara sekutu tidak otomatis ikut berperang ketika pemain memulai serangan.
- Warna negara ditetapkan memakai pewarnaan graf berbasis hubungan perbatasan; negara yang berbatasan langsung dipilihkan warna dengan jarak warna lebih besar.
- Warna hijau negara pemain tetap dipertahankan dan versi cache website diperbarui.
