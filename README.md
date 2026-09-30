# KuisKelas

Aplikasi kuis pilihan ganda langsung untuk dosen dan maksimal 20 mahasiswa. Situs statis, tanpa akun mahasiswa dan tanpa database permanen.

## Fitur

- Beranda terpisah untuk alur dosen dan mahasiswa.
- Menu dosen memisahkan halaman **Buat Kuis** dan **Bagikan Kuis**.
- Mahasiswa masuk ke halaman gabung kuis; pilihan membuat kuis hanya tersedia dari beranda utama.
- Editor kuis dengan empat pilihan dan penandaan jawaban benar.
- Impor PPTX: membaca teks dari slide di browser dan membuat draf soal pilihan ganda.
- Kode sesi, timer per soal, nilai otomatis, dan papan skor.
- Unduh hasil Excel dengan sheet hasil mahasiswa dan analisis soal; fallback CSV tersedia bila pustaka Excel gagal dimuat.
- Cetak rekap atau simpan sebagai PDF dari dialog cetak browser.
- Simpan/muat kuis sebagai JSON. Data sesi tetap di memori browser dosen sampai diunduh.

## Jalankan lokal

Buka `index.html` melalui server lokal (disarankan, bukan `file://`):

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Unggah ke GitHub Pages

1. Buat repository GitHub dan unggah isi folder ini.
2. Pada **Settings → Pages**, pilih branch `main` dan folder `/ (root)`.
3. Buka URL Pages yang diberikan. Dosen dan mahasiswa harus membuka URL yang sama.

## Cara menggunakan

1. Dosen membuka **Menu → Ruang Dosen** di bagian atas beranda.
2. Pilih **Buat kuis** untuk menulis soal atau mengimpor PPTX. File JSON dapat diunduh agar bisa dipakai kembali.
3. Kembali ke menu dosen, lalu pilih **Bagikan kuis**. Gunakan kuis yang sedang terbuka atau muat file JSON.
4. Klik **Buat kode kuis**, bagikan kode enam karakter kepada mahasiswa, lalu klik **Mulai kuis** setelah peserta bergabung.
5. Beranda mahasiswa hanya menampilkan **Ikut kuis**. Mahasiswa isi nama dan kode untuk bergabung. Setelah sesi berakhir, dosen mengunduh Excel atau mencetak PDF.

Impor PPTX menghasilkan draf pertanyaan umum dari kalimat pada slide. Teks dalam gambar tidak dibaca. Periksa dan sunting draf, distraktor, dan jawaban benar sebelum memulai sesi.

## Catatan koneksi dan privasi

Data peserta dan nilai hanya berada di memori browser dosen sampai diunduh. Kuis waktu nyata memakai koneksi PeerJS/WebRTC; akses internet diperlukan, dan halaman dosen harus tetap terbuka sepanjang sesi. Jaringan kampus yang membatasi WebRTC atau layanan signaling dapat menghalangi koneksi. Uji dengan beberapa perangkat sebelum digunakan di kelas.

Pustaka front-end (PeerJS, JSZip, SheetJS) dimuat dari CDN, jadi aplikasi memerlukan internet untuk sesi langsung, impor PPTX, dan ekspor XLSX.
