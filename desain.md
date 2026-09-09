# 🎨 Panduan Desain UI/UX & Design System - Aplikasi Kandang (kandangV2)

Dokumen ini berisi spesifikasi lengkap mengenai **Design System (UI)** dan **Prinsip Pengalaman Pengguna (UX)** untuk aplikasi manajemen peternakan ayam petelur **Kandang**.

---

## 🎯 1. Visi Produk & Filosofi Desain

* **Target Utama**: Peternak ayam petelur dan anak kandang (operator lapangan).
* **Lingkungan Penggunaan**: Di dalam kandang (pencahayaan bervariasi, tangan berdebu/pakai sarung tangan, koneksi internet sering lemah/offline).
* **Filosofi Utama**: **"Field-Ready Mobile First"** — Tampilan modern, premium, kontras tinggi, dapat dioperasikan dengan 1 tangan dalam 30 detik, serta siap bekerja tanpa sinyal.

---

## 🎨 2. UI System & Identitas Visual

### 🟢 A. Palet Warna (Tailored Color Palette)
Warna dipilih khusus berdasarkan psikologi industri peternakan modern:

| Kategori | Warna Tailwind | Kode Hex | Penggunaan Utama |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `emerald-600` / `emerald-700` | `#059669` / `#047857` | Hero banner, header, status positif, tombol utama |
| **Egg & Harvest** | `amber-500` / `amber-600` | `#f59e0b` / `#d97706` | Telur utuh, berat telur (gram), indikator panen |
| **Mortality Alert** | `rose-600` / `rose-700` | `#e11d48` / `#be123c` | Kematian (*mortality*), ayam afkir (*culling*), peringatan |
| **Feed & FCR** | `blue-600` / `blue-700` | `#2563eb` / `#1d4ed8` | Konsumsi pakan (kg), kalkulasi FCR |
| **Neutral Surface** | `slate-50` hingga `slate-900` | `#f8fafc` / `#0f172a` | Background halaman, kartu, teks, border |

---

### 🔤 B. Tipografi & Hierarki Teks
Menggunakan sistem font Sans-Serif modern (*Inter / Geist*) dengan kejelasan (*readability*) tinggi di layar HP:

* **Display Metric (Hero Stat)**: `text-2xl` hingga `text-3xl`, `font-black` (Contoh: `88.5%`, `1,740 btr`).
* **Section Title**: `text-xs` hingga `text-sm`, `font-black`, `uppercase`, `tracking-wider` (Contoh: `LAPORAN PERFORMA HARI INI`).
* **Card Title / Subtitle**: `text-xs font-bold text-slate-800`.
* **Badge / Tag**: `text-[10px]` hingga `text-[11px]`, `font-extrabold`, `px-2 py-0.5 rounded-full`.

---

### 🪟 C. Shapes, Shadows & Elevasi (Glassmorphism & Card System)
* **Corner Radius**:
  * Large Cards & Banner: `rounded-3xl` (24px).
  * Small Stat Cards & Buttons: `rounded-2xl` (16px).
  * Badges & Pills: `rounded-full` (9999px).
* **Shadows & Borders**:
  * Soft Elevated Shadow: `shadow-xl shadow-emerald-200/60` (memberikan kesan mengambang yang halus).
  * Card Border: `border-2 border-slate-200` untuk mempertegas batas kartu di layar HP saat terkena sinar matahari.

---

### 🖼️ D. Ikonografi
Menggunakan library `lucide-react` dengan makna visual langsung:
* 🥚 `Egg` ➔ Produksi telur utuh & panen.
* 📈 `TrendingUp` ➔ Persentase Hen-Day (HD %).
* 💀 `Skull` ➔ Kematian populasi.
* 🌾 `Wheat` ➔ Pakan & FCR.
* ⚖️ `Scale` ➔ Rata-rata berat telur (gram).
* 💉 `Activity` / `Syringe` ➔ Kesehatan, obat & vaksin.
* 🗂️ `Layers` ➔ Daftar angkatan & kandang.

---

## 📱 3. Prinsip & Arsitektur UX (User Experience)

```mermaid
flowchart TD
    A[Buka Aplikasi HP] --> B{Status Input Hari Ini?}
    B -- Belum Input ⚠️ -- C[Klik FAB Tombol + Melayang]
    B -- Sudah Input ✔ -- D[Pantau Grafik Performa & StatCard]
    C --> E[Bottom Sheet Quick Input Slide Up]
    E --> F[Gunakan Stepper Tombol Besar +/-]
    F --> G[Klik Simpan Catatan Harian]
    G --> H[Kalkulasi HD% & FCR Otomatis]
    H --> I[Badge Berubah ke ✔ Sudah Dicatat]
```

### 1️⃣ Thumb-Zone Accessibility (Zona Jangkauan Jempol)
* Seluruh aksi vital (Tombol **+ FAB**, **Bottom Navigation**, dan **Tombol Simpan**) diletakkan di **1/3 bagian bawah layar HP**.
* Operator dapat mengisi seluruh laporan hanya menggunakan **1 jempol tangan kanan**.

### 2️⃣ Giant Stepper Input (`GiantStepperInput.tsx`)
* Menghindari keharusan munculnya keyboard HP yang menutupi layar.
* Tombol `-` dan `+` dibuat **ekstra besar** sehingga bisa ditap dengan cepat saat memegang tempat telur di kandang.

### 3️⃣ Bottom Sheet Pattern (`QuickInputModal.tsx`)
* Input data dilakukan tanpa berpindah halaman (*zero page-reloads*).
* Modal meluncur mulus dari bawah (*slide-up bottom sheet*), menjaga konteks layar utama.

### 4️⃣ Instant Feedback & Smart Calculations
* Aplikasi secara otomatis menghitung `Hen-Day %`, `FCR`, dan `Rata-Rata Gram Telur` begitu data dimasukkan.
* Memberikan pesan umpan balik visual (*"Hen-Day 88.5% - Di atas target 85%! 🔥"*).

### 5️⃣ Offline-First PWA (Progressive Web App)
* Aplikasi menyimpan data secara lokal di browser (`localStorage`) jika tidak ada jaringan internet di dalam kandang.
* Begitu HP terhubung internet, data otomatis disinkronkan ke **Supabase Database**.

---

## 📐 4. Detail Komponen & Tata Letak Layar

### 🏠 A. Dashboard Utama (`src/app/page.tsx`)
1. **Top Navbar**: Selektor dropdown angkatan kandang aktif + tombol tambah angkatan baru.
2. **Hero Banner Angkatan**: Gradien `emerald-700` ke `teal-700` menampilkan nama kandang, strain ayam, populasi aktif, dan umur angkatan (minggu).
3. **Status Bar Harian**: Indikator mencolok `✔ Sudah Dicatat` vs `⚠️ Belum Input`.
4. **Grid Metrik 2x2**: Kartu statistik utama (Hen-Day, Telur Utuh, Kematian, FCR).
5. **Pill Rata-Rata Berat**: Indikator berat telur (gram) dibanding standar 60-65g.
6. **Grafik Performa Interaktif (`PerformanceChart.tsx`)**: Recharts visualisasi tren Hen-Day & pakan 14 hari terakhir.
7. **Riwayat 7 Hari Terakhir**: Tabel ringkas catatan harian.
8. **Floating Action Button (FAB `+`)**: Tombol melayang emerald hijau di pojok kanan bawah.

---

## 🚀 5. Rencana Iterasi UI/UX Selanjutnya (Roadmap)

* [ ] **Dark Mode Otomatis**: Mode gelap untuk memudahkan penginputan malam hari di kandang.
* [ ] **Voice-to-Text Entry**: Input angka menggunakan perintah suara (*hands-free*).
* [ ] **Export Laporan WhatsApp/PDF**: Fitur 1-klik bagikan laporan harian ke pemilik peternakan via WhatsApp.

---
*Dokumen ini merupakan panduan resmi UI/UX untuk pengembangan versi kandangV2.*
