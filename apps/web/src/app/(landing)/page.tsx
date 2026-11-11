'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Logo } from '@/components/ui';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: string;
  priceNum: number;
  desc: string;
  badge?: string;
  portion?: string;
  spicy?: boolean;
  image?: string;
}

const MENU_TUNA: MenuItem[] = [
  {
    id: 'tuna-matah-reg',
    name: 'Tuna Sambal Matah (Reguler)',
    category: 'Olahan Tuna',
    price: 'Rp 19.000',
    priceNum: 19000,
    desc: 'Nasi hangat pulen, olahan tuna gurih, telur dadar, jukut goreng, kremesan, dan siraman sambal matah serai segar.',
    badge: 'Favorit',
    portion: 'Porsi Reguler (1 Orang)',
    spicy: true,
    image: '/assets/img/photo-f197010978.webp',
  },
  {
    id: 'tuna-matah-jumbo',
    name: 'Tuna Sambal Matah (Jumbo)',
    category: 'Olahan Tuna',
    price: 'Rp 29.000',
    priceNum: 29000,
    desc: 'Porsi ekstra kenyang! Nasi hangat, dobel olahan tuna, telur dadar, jukut goreng, kremesan, dan ekstra sambal matah.',
    badge: 'Paling Laris',
    portion: 'Porsi Jumbo Ekstra Kenyang',
    spicy: true,
    image: '/assets/img/photo-f197010978.webp',
  },
  {
    id: 'tuna-dabu-reg',
    name: 'Tuna Sambal Dabu-Dabu (Reguler)',
    category: 'Olahan Tuna',
    price: 'Rp 19.000',
    priceNum: 19000,
    desc: 'Paket nasi, olahan tuna gurih, telur dadar, jukut goreng, dan kesegaran sambal dabu-dabu potongan tomat asam pedas.',
    portion: 'Porsi Reguler (1 Orang)',
    spicy: true,
    image: '/assets/img/photo-f197010978.webp',
  },
  {
    id: 'tuna-dabu-jumbo',
    name: 'Tuna Sambal Dabu-Dabu (Jumbo)',
    category: 'Olahan Tuna',
    price: 'Rp 29.000',
    priceNum: 29000,
    desc: 'Porsi jumbo ekstra lauk dengan limpahan sambal dabu-dabu segar jeruk nipis dan tomat segar.',
    badge: 'Rekomendasi',
    portion: 'Porsi Jumbo Ekstra Kenyang',
    spicy: true,
    image: '/assets/img/photo-f197010978.webp',
  },
  {
    id: 'tuna-mayo-reg',
    name: 'Tuna Mayo — Non-Spicy (Reguler)',
    category: 'Olahan Tuna',
    price: 'Rp 17.000',
    priceNum: 17000,
    desc: 'Paket nasi, olahan tuna gurih berpadu saus mayones creamy legit khas Matwona. Ramah anak dan tidak pedas.',
    badge: 'Ramah Anak',
    portion: 'Porsi Reguler (1 Orang)',
    image: '/assets/img/photo-f197010978.webp',
  },
  {
    id: 'tuna-mayo-jumbo',
    name: 'Tuna Mayo — Non-Spicy (Jumbo)',
    category: 'Olahan Tuna',
    price: 'Rp 26.000',
    priceNum: 26000,
    desc: 'Porsi jumbo mantap olahan tuna saus mayones creamy dengan telur dadar dan jukut goreng.',
    portion: 'Porsi Jumbo Ekstra Kenyang',
    image: '/assets/img/photo-f197010978.webp',
  },
];

const MENU_BAKMIE: MenuItem[] = [
  {
    id: 'bakmie-tuna-matah',
    name: 'Bakmie Tuna Sambal Matah',
    category: 'Bakmie Series',
    price: 'Rp 22.000',
    priceNum: 22000,
    desc: 'Bakmie kenyal gurih minyak bawang khas Matwona dengan suwiran olahan tuna dan sambal matah harum.',
    badge: 'Spesial',
    portion: '1 Porsi Bakmie',
    spicy: true,
    image: '/assets/img/photo-f2427663.webp',
  },
  {
    id: 'bakmie-tuna-rica',
    name: 'Bakmie Tuna Rica-Rica',
    category: 'Bakmie Series',
    price: 'Rp 22.000',
    priceNum: 22000,
    desc: 'Bakmie kenyal dengan bumbu rica-rica pedas beraroma daun kemangi segar dan tuna gurih.',
    portion: '1 Porsi Bakmie',
    spicy: true,
    image: '/assets/img/photo-f2427663.webp',
  },
  {
    id: 'bakmie-ayam-jamur',
    name: 'Bakmie Ayam Jamur Klasik',
    category: 'Bakmie Series',
    price: 'Rp 20.000',
    priceNum: 20000,
    desc: 'Bakmie kenyal lembut berpadu potongan ayam kecap manis gurih dan jamur merang segar pilihan.',
    portion: '1 Porsi Bakmie',
    image: '/assets/img/photo-f2427663.webp',
  },
  {
    id: 'bakmie-polos',
    name: 'Bakmie Polos Minyak Bawang',
    category: 'Bakmie Series',
    price: 'Rp 13.000',
    priceNum: 13000,
    desc: 'Mie kenyal harum racikan minyak bawang dan rempah gurih, pas disandingkan dengan lauk pilihan.',
    portion: '1 Porsi',
    image: '/assets/img/photo-f2427663.webp',
  },
];

const MENU_NASI_TELUR: MenuItem[] = [
  {
    id: 'paket-barendo-komplit',
    name: 'Paket Nasi Telur Barendo Komplit',
    category: 'Paket Nasi Telur',
    price: 'Rp 14.000',
    priceNum: 14000,
    desc: 'Nasi hangat pulen, telur dadar barendo krispi bersarang, jukut goreng renyah, sambal, dan kremesan sari kaldu.',
    badge: 'Best Value',
    portion: '1 Porsi Komplit',
    image: '/assets/img/photo-f15601118.webp',
  },
  {
    id: 'paket-barendo-ekstra-nasi',
    name: 'Paket Dobel Telur Barendo',
    category: 'Paket Nasi Telur',
    price: 'Rp 20.000',
    priceNum: 20000,
    desc: 'Pilihan hemat puas: nasi hangat dengan 2 porsi telur dadar barendo krispi gurih.',
    portion: '1 Porsi Kenyang',
    image: '/assets/img/photo-f15601118.webp',
  },
];

const MENU_TAMBAHAN: MenuItem[] = [
  {
    id: 'telur-barendo-alacarte',
    name: 'Telur Barendo (Alacarte)',
    category: 'Camilan & Ekstra',
    price: 'Rp 7.000',
    priceNum: 7000,
    desc: 'Telur dadar barendo krispi renda sarang digoreng dadakan saat kamu memesan.',
    portion: '1 Porsi',
    image: '/assets/img/photo-f15601118.webp',
  },
  {
    id: 'jukut-goreng',
    name: 'Jukut Goreng Renyah (Ekstra)',
    category: 'Camilan & Ekstra',
    price: 'Rp 5.000',
    priceNum: 5000,
    desc: 'Sayur jukut goreng garing renyah dengan taburan garam gurih penyempurna selera makan.',
    portion: '1 Porsi',
  },
  {
    id: 'sambal-matah-ekstra',
    name: 'Sambal Matah Bali (Ekstra)',
    category: 'Camilan & Ekstra',
    price: 'Rp 4.000',
    priceNum: 4000,
    desc: 'Irisan bawang merah, cabai rawit merah, serai segar, dan perasan jeruk limau harum.',
    portion: '1 Cup',
    spicy: true,
  },
  {
    id: 'sambal-dabu-ekstra',
    name: 'Sambal Dabu-Dabu (Ekstra)',
    category: 'Camilan & Ekstra',
    price: 'Rp 4.000',
    priceNum: 4000,
    desc: 'Potongan tomat segar, cabai rawit pedas, dan perasan jeruk nipis segar asam pedas.',
    portion: '1 Cup',
    spicy: true,
  },
  {
    id: 'kremesan-gurih',
    name: 'Kremesan Matwona (Toples Kecil)',
    category: 'Camilan & Ekstra',
    price: 'Rp 3.000',
    priceNum: 3000,
    desc: 'Kremesan sari kaldu gurih super renyah kriuk pelengkap nasi dan bakmie.',
    portion: '1 Porsi',
  },
  {
    id: 'nasi-putih',
    name: 'Nasi Putih Pulen Hangat',
    category: 'Camilan & Ekstra',
    price: 'Rp 4.000',
    priceNum: 4000,
    desc: 'Nasi putih beras pandan wangi pulen hangat mengepul.',
    portion: '1 Porsi',
  },
];

const MENU_MINUMAN: MenuItem[] = [
  {
    id: 'es-teh-manis',
    name: 'Es Teh Manis Matwona',
    category: 'Minuman Segar',
    price: 'Rp 5.000',
    priceNum: 5000,
    desc: 'Es teh melati racikan daun teh asli wangi sejuk pelepas dahaga makan siang.',
    portion: 'Gelas Besar Dingin',
  },
  {
    id: 'lemon-tea',
    name: 'Lemon Tea Dingin Segar',
    category: 'Minuman Segar',
    price: 'Rp 8.000',
    priceNum: 8000,
    desc: 'Seduhan teh segar dengan perasan lemon asli segar asam manis alami.',
    portion: 'Gelas Besar Dingin',
  },
  {
    id: 'kopi-susu',
    name: 'Kopi Susu Gula Aren Matwona',
    category: 'Minuman Segar',
    price: 'Rp 12.000',
    priceNum: 12000,
    desc: 'Espresso blend berpadu susu segar gurih dan legit gula aren asli Jawa Barat.',
    badge: 'Favorit',
    portion: 'Cup Dingin 16oz',
  },
  {
    id: 'jus-alpukat',
    name: 'Jus Alpukat Kocok Cokelat',
    category: 'Minuman Segar',
    price: 'Rp 15.000',
    priceNum: 15000,
    desc: 'Daging buah alpukat mentega segar kental dipadu susu cokelat manis gurih.',
    portion: 'Cup Dingin 16oz',
  },
  {
    id: 'air-mineral',
    name: 'Air Mineral Prima (Dingin / Biasa)',
    category: 'Minuman Segar',
    price: 'Rp 4.000',
    priceNum: 4000,
    desc: 'Air mineral kemasan 600ml sejuk dan higienis.',
    portion: 'Botol 600ml',
  },
];

export default function LandingPage() {
  const [activeItemModal, setActiveItemModal] = useState<MenuItem | null>(null);

  // Helper untuk merender baris menu editorial (ruled rows standar Taste-Skill Place)
  const renderMenuRow = (item: MenuItem) => (
    <div
      key={item.id}
      onClick={() => setActiveItemModal(item)}
      className="group flex cursor-pointer flex-col justify-between gap-1 border-b border-[#E2E7D8]/80 py-3.5 transition-colors hover:bg-[#FFFFCA]/60 sm:flex-row sm:items-baseline sm:gap-4"
    >
      <div className="flex flex-1 flex-col pr-2">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[#1F2A24] transition-colors group-hover:text-[#106F4D]">
            {item.name}
          </span>
          {item.badge && (
            <span className="rounded-md bg-[#106F4D]/10 px-2 py-0.5 text-[10px] font-bold text-[#106F4D]">
              {item.badge}
            </span>
          )}
          {item.spicy && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
              Pedas
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-normal leading-relaxed text-[#5B6B62] line-clamp-1">
          {item.desc}
        </p>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 pt-0.5 sm:pt-0">
        <span className="font-mono text-[15px] font-bold tracking-tight text-[#106F4D]">
          {item.price}
        </span>
        <span className="text-xs font-semibold text-[#5B6B62] transition-colors group-hover:text-[#106F4D]">
          Pesan ➔
        </span>
      </div>
    </div>
  );

  return (
    <div
      data-type="place"
      data-site-kind="place"
      data-page-kind="place"
      className="min-h-screen bg-[#FFFFCA] text-[#1F2A24] antialiased selection:bg-[#106F4D] selection:text-[#FFFFCA]"
    >
      {/* Sticky Editorial Header */}
      <header className="sticky top-0 z-40 border-b border-[#106F4D]/15 bg-[#FFFFCA]/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="Beranda Matwona" className="transition hover:opacity-85">
            <Logo variant="green" width={145} priority />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#menu" className="text-sm font-bold text-[#1F2A24] transition hover:text-[#106F4D]">
              Daftar Menu
            </a>
            <a href="#outlet" className="text-sm font-bold text-[#1F2A24] transition hover:text-[#106F4D]">
              Kunjungi Outlet
            </a>
            <a href="#cerita" className="text-sm font-bold text-[#1F2A24] transition hover:text-[#106F4D]">
              Cerita Ma-Two-Na
            </a>
            <a href="#dapur" className="text-sm font-bold text-[#1F2A24] transition hover:text-[#106F4D]">
              Dapur Terbuka
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/m/matwona/t/tok-meja-01"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#106F4D] px-4 text-xs font-black text-[#FFFFCA] shadow-sm transition hover:bg-[#0B5A3E] active:scale-95"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM17 20h4v-3" />
              </svg>
              <span>Scan Meja Demo</span>
            </Link>

            <a
              href="https://wa.me/6281234567890?text=Halo%20Matwona%2C%20saya%20mau%20tanya%20info%20menu%20dan%20lokasi"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-11 items-center gap-2 rounded-xl border-2 border-[#106F4D] bg-[#FFFFCA] px-4 text-xs font-black text-[#106F4D] transition hover:bg-[#E1F2EA] active:scale-95 sm:inline-flex"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Screen 1: Hero Editorial Restoran (Split 6/6 dengan Foto Asli) */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-12 sm:px-6 sm:pt-20 sm:pb-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Kolom Kiri: Narasi Editorial */}
          <div className="flex flex-col items-start gap-5 sm:gap-6 lg:col-span-7">
            <span className="text-[11px] font-extrabold tracking-widest uppercase text-[#106F4D] sm:text-xs">
              Dapur Olahan Tuna & Ayam Kampung · Bandung
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2A24] sm:text-5xl lg:text-6xl lg:leading-[1.12]">
              Two worlds. One table.{' '}
              <span className="block font-serif italic text-[#106F4D]">Simply, makan.</span>
            </h1>

            <p className="max-w-xl text-sm font-medium leading-relaxed text-[#5B6B62] sm:text-lg">
              Spesialis olahan tuna segar kualitas ekspor dan ayam kampung gurih.
              Dimasak langsung di dapur terbuka setiap hari — protein terpenuhi, rasa autentik, harga bersahabat.
            </p>

            <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3.5">
              <Link
                href="/m/matwona/t/tok-meja-01"
                className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#106F4D] px-6 text-sm font-black text-[#FFFFCA] shadow-md transition hover:bg-[#0B5A3E] active:scale-95 sm:w-auto"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM17 20h4v-3" />
                </svg>
                <span>Pesan dari Meja (Scan QR)</span>
              </Link>

              <a
                href="#menu"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#106F4D] bg-[#FFFFCA] px-6 text-sm font-bold text-[#106F4D] transition hover:bg-white active:scale-95 sm:w-auto"
              >
                <span>Lihat Buku Menu</span>
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-bold text-[#5B6B62] sm:gap-6 sm:pt-3">
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-[#106F4D]"></span>
                <span>Mulai Rp 14.000 / porsi komplit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-[#106F4D]"></span>
                <span>Buka 10.00 – 21.00 WIB</span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Frame Foto Asli Restoran Makanan (Taste Skill Frame) */}
          <div className="lg:col-span-5">
            <div className="group relative overflow-hidden rounded-3xl border-4 border-white bg-white p-3 shadow-xl">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-[#EFEFD8]">
                <Image
                  src="/assets/img/photo-f197010978.webp"
                  alt="Nasi Olahan Tuna Bakar Sambal Matah Matwona"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  priority
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFFFCA]">
                      Menu Pilihan Utama
                    </span>
                    <p className="text-base font-bold text-white">Tuna Sambal Matah Komplit</p>
                  </div>
                  <span className="font-mono text-base font-black text-[#FFFFCA]">Rp 19.000</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-3 pb-1 text-xs font-bold text-[#5B6B62]">
                <span className="text-[#106F4D]">Laut + Darat di Satu Meja</span>
                <span className="rounded bg-[#E1F2EA] px-2 py-0.5 text-[11px] text-[#106F4D]">
                  100% Tuna Kualitas Ekspor
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Screen 2: Buku Menu Editorial Restoran (Satu Kesatuan Canvas, Tanpa Garis Pembatas Kaku) */}
      <section id="menu" className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6 sm:pb-28">
        {/* Lembar Buku Menu Besar Utuh (Editorial Menu Sheet) */}
        <div className="rounded-[32px] border-2 border-[#106F4D]/15 bg-white p-6 sm:p-10 lg:p-12 shadow-xl shadow-[#106F4D]/5">
          {/* Header Lembar Menu */}
          <div className="flex flex-col justify-between gap-6 border-b border-[#E2E7D8] pb-8 md:flex-row md:items-end">
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-[#106F4D]">
                Buku Menu & Harga Resmi
              </span>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-[#1F2A24] sm:text-4xl">
                Sajian Dapur Matwona
              </h2>
              <p className="mt-1.5 text-sm font-medium text-[#5B6B62]">
                Semua menu dimasak segar langsung di dapur terbuka saat dipesan. Harga jujur & transparan.
              </p>
            </div>

            <Link
              href="/m/matwona/t/tok-meja-01"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#106F4D] px-5 text-xs font-black text-[#FFFFCA] shadow-sm transition hover:bg-[#0B5A3E] active:scale-95"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM17 20h4v-3" />
              </svg>
              <span>Pesan Sekarang di Meja Digital</span>
            </Link>
          </div>

          {/* Isi Menu 2-Kolom Seimbang di Dalam Satu Lembar */}
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Kolom 1: Olahan Tuna & Bakmie Series */}
            <div className="flex flex-col gap-10">
              {/* Bagian Olahan Tuna */}
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#106F4D] pb-2.5">
                  <h3 className="text-lg font-black text-[#106F4D]">Olahan Tuna Spesialis</h3>
                  <span className="text-xs font-bold text-[#5B6B62]">6 Pilihan</span>
                </div>
                <div className="flex flex-col">
                  {MENU_TUNA.map(renderMenuRow)}
                </div>
              </div>

              {/* Bagian Bakmie Series */}
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#106F4D] pb-2.5">
                  <h3 className="text-lg font-black text-[#106F4D]">Bakmie Series</h3>
                  <span className="text-xs font-bold text-[#5B6B62]">4 Pilihan</span>
                </div>
                <div className="flex flex-col">
                  {MENU_BAKMIE.map(renderMenuRow)}
                </div>
              </div>
            </div>

            {/* Kolom 2: Paket Nasi Telur, Camilan, & Minuman */}
            <div className="flex flex-col gap-10">
              {/* Bagian Paket Nasi Telur Barendo */}
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#106F4D] pb-2.5">
                  <h3 className="text-lg font-black text-[#106F4D]">Paket Nasi Telur Barendo</h3>
                  <span className="text-xs font-bold text-[#5B6B62]">2 Pilihan</span>
                </div>
                <div className="flex flex-col">
                  {MENU_NASI_TELUR.map(renderMenuRow)}
                </div>
              </div>

              {/* Bagian Camilan & Tambahan */}
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#106F4D] pb-2.5">
                  <h3 className="text-lg font-black text-[#106F4D]">Camilan & Ekstra</h3>
                  <span className="text-xs font-bold text-[#5B6B62]">6 Pilihan</span>
                </div>
                <div className="flex flex-col">
                  {MENU_TAMBAHAN.map(renderMenuRow)}
                </div>
              </div>

              {/* Bagian Minuman Segar */}
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#106F4D] pb-2.5">
                  <h3 className="text-lg font-black text-[#106F4D]">Minuman Segar</h3>
                  <span className="text-xs font-bold text-[#5B6B62]">5 Pilihan</span>
                </div>
                <div className="flex flex-col">
                  {MENU_MINUMAN.map(renderMenuRow)}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Lembar Menu */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#E2E7D8] pt-6 text-xs font-semibold text-[#5B6B62]">
            <span>100% Halal · Tuna Segar Kualitas Ekspor · Dimasak di Dapur Terbuka Bandung</span>
            <Link href="/m/matwona/t/tok-meja-01" className="font-bold text-[#106F4D] underline hover:text-[#0B5A3E]">
              Buka Versi Digital Meja ➔
            </Link>
          </div>
        </div>
      </section>

      {/* Screen 3: Kunjungi Outlet & Jam Buka (Mengalir Mulus Tanpa Border Potong) */}
      <section id="outlet" data-place="visit" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Kiri: Detail Kunjungan */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-[#106F4D]">Kunjungi Outlet</span>
              <h2 className="mt-1 text-3xl font-extrabold text-[#1F2A24] sm:text-4xl">
                Mampir ke Matwona Bandung
              </h2>
            </div>

            <p className="text-base font-medium leading-relaxed text-[#5B6B62]">
              Suasana santap hangat dan akrab. Dapur terbuka kami menyajikan olahan tuna panas langsung ke mejamu,
              lengkap dengan aroma sambal ulek serai dan telur barendo krispi keemasan.
            </p>

            <div className="rounded-2xl border-2 border-[#106F4D]/20 bg-white p-6 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#106F4D] text-[#FFFFCA]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1F2A24]">Jl. Matwona No. 12, Bandung</p>
                  <p className="mt-0.5 text-xs text-[#5B6B62]">Jawa Barat 40115 · Akses mudah di pusat kota</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#E2E7D8] rounded-2xl border border-[#E2E7D8] bg-white px-5 text-sm shadow-xs">
              <div className="flex items-center justify-between py-3.5">
                <span className="font-semibold text-[#5B6B62]">Senin – Jumat</span>
                <span className="font-mono font-bold text-[#1F2A24]">10.00 – 21.00 WIB</span>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <span className="font-semibold text-[#5B6B62]">Sabtu – Minggu</span>
                <span className="font-mono font-bold text-[#1F2A24]">10.00 – 22.00 WIB</span>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <span className="font-semibold text-[#5B6B62]">Pemesanan di Meja</span>
                <span className="font-bold text-[#106F4D]">Scan QR & Kasir POS</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <a
                href="https://maps.google.com/?q=Bandung"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#106F4D] px-5 text-xs font-black text-white shadow-sm transition hover:bg-[#0B5A3E] active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                <span>Buka di Google Maps</span>
              </a>
              <a
                href="https://wa.me/6281234567890?text=Halo%20Matwona%2C%20saya%20ingin%20tanya%20menu%20dan%20ketersediaan%20meja"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#106F4D] bg-[#FFFFCA] px-5 text-xs font-bold text-[#106F4D] transition hover:bg-white active:scale-95"
              >
                <span>Hubungi via WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Kanan: Foto Atmosfer Dapur Terbuka */}
          <div className="lg:col-span-6">
            <div className="group relative overflow-hidden rounded-3xl border-4 border-white bg-white p-3 shadow-xl">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-[#EFEFD8]">
                <Image
                  src="/assets/img/photo-f106139598.webp"
                  alt="Suasana Dapur Terbuka Matwona"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="rounded-full bg-[#106F4D] px-3 py-1 text-xs font-black tracking-wider uppercase text-[#FFFFCA] shadow-sm">
                    Dapur Terbuka
                  </span>
                  <h3 className="mt-2 text-2xl font-black text-white">Dimasak Segar di Depan Mejamu</h3>
                  <p className="mt-1 text-xs text-white/90">
                    Tuna dipotong di atas es setiap pagi dan disajikan hangat langsung ke mejamu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Screen 4: Cerita Ma-Two-Na & 4 Pilar Dapur */}
      <section id="cerita" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-xs font-black tracking-widest uppercase text-[#106F4D]">Cerita Nama Kami</span>
          <h2 className="text-3xl font-extrabold text-[#1F2A24] sm:text-4xl">
            Kenapa Ma-Two-Na?
          </h2>
          <p className="max-w-xl text-sm font-semibold leading-relaxed text-[#5B6B62]">
            Tiga suku kata, satu komitmen menyajikan hidangan bermutu tinggi dengan kehangatan rumah sendiri.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-3xl border-2 border-[#106F4D] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#106F4D] font-mono text-2xl font-black text-[#FFFFCA] shadow-xs">
              01
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#106F4D]">
                Ma <span className="text-[#1F2A24]">= Makan</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5B6B62]">
                Tempat makan yang hangat, ramah, dan akrab. Seperti warung langganan dekat rumah yang selalu dirindukan.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border-2 border-[#106F4D] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#106F4D] font-mono text-2xl font-black text-[#FFFFCA] shadow-xs">
              02
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#106F4D]">
                Two <span className="text-[#1F2A24]">= Dua Dunia</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5B6B62]">
                Tuna segar dari kedalaman laut dan ayam kampung dari bumi daratan, bertemu harmonis dalam satu meja sajian.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border-2 border-[#106F4D] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#106F4D] font-mono text-2xl font-black text-[#FFFFCA] shadow-xs">
              03
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#106F4D]">
                Twona <span className="text-[#1F2A24]">= Olahan Tuna</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5B6B62]">
                Menjadikan olahan tuna pilihan sehari-hari: kualitas ekspor segar, gurih berprotein tinggi, dan harga terjangkau.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Pilar Dapur Terbuka */}
        <div id="dapur" className="mt-16">
          <div className="flex flex-col gap-2 text-center">
            <span className="text-xs font-black tracking-widest uppercase text-[#106F4D]">Standar Dapur Kami</span>
            <h3 className="text-2xl font-black text-[#1F2A24] sm:text-3xl">Empat Pilar Dapur Terbuka</h3>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E2E7D8] bg-white p-5 shadow-xs">
              <span className="rounded bg-[#106F4D] px-2 py-0.5 text-[10px] font-black uppercase text-[#FFFFCA]">Pilar 01</span>
              <h4 className="mt-2 text-base font-bold text-[#1F2A24]">Tuna Segar di Atas Es</h4>
              <p className="mt-1 text-xs text-[#5B6B62]">
                Dipotong segar setiap pagi dari pemasok ekspor, nutrisi omega-3 tetap terjaga utuh.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E7D8] bg-white p-5 shadow-xs">
              <span className="rounded bg-[#106F4D] px-2 py-0.5 text-[10px] font-black uppercase text-[#FFFFCA]">Pilar 02</span>
              <h4 className="mt-2 text-base font-bold text-[#1F2A24]">Panggangan Arang Tradisional</h4>
              <p className="mt-1 text-xs text-[#5B6B62]">
                Aroma asap arang alami memberikan sentuhan smoky gurih yang meresap ke serat daging.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E7D8] bg-white p-5 shadow-xs">
              <span className="rounded bg-[#106F4D] px-2 py-0.5 text-[10px] font-black uppercase text-[#FFFFCA]">Pilar 03</span>
              <h4 className="mt-2 text-base font-bold text-[#1F2A24]">Sambal Ulek Dadakan</h4>
              <p className="mt-1 text-xs text-[#5B6B62]">
                Sambal matah beraroma serai dan sambal dabu-dabu potongan tomat diracik dadakan setiap sesi.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E7D8] bg-white p-5 shadow-xs">
              <span className="rounded bg-[#106F4D] px-2 py-0.5 text-[10px] font-black uppercase text-[#FFFFCA]">Pilar 04</span>
              <h4 className="mt-2 text-base font-bold text-[#1F2A24]">Telur Barendo Dadak Panas</h4>
              <p className="mt-1 text-xs text-[#5B6B62]">
                Digoreng dadakan saat pesanan masuk, menghasilkan renda garing renyah keemasan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screen 5: Callout Pemesanan Digital (Warna Brand Hijau #106F4D) */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl border-2 border-[#106F4D] bg-[#106F4D] p-8 sm:p-12 shadow-xl text-[#FFFFCA]">
          <div className="flex flex-col items-center justify-between gap-8 text-center lg:flex-row lg:text-left">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black tracking-widest uppercase text-[#FFFFCA]/80">
                Sistem Pemesanan Digital
              </span>
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                Duduk di Meja, Langsung Pesan
              </h2>
              <p className="max-w-xl text-sm font-semibold text-[#FFFFCA]/90">
                Scan QR di meja kamu, pilih menu favorit, dan bayar di kasir atau langsung via QRIS tanpa perlu antre berdiri.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href="/m/matwona/t/tok-meja-01"
                className="inline-flex h-13 items-center gap-2 rounded-2xl bg-[#FFFFCA] px-7 text-sm font-black text-[#106F4D] shadow-lg transition hover:bg-white active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM17 20h4v-3" />
                </svg>
                <span>Buka Menu Meja (Demo)</span>
              </Link>

              <Link
                href="/login"
                className="inline-flex h-13 items-center gap-2 rounded-2xl border-2 border-[#FFFFCA] bg-transparent px-5 text-sm font-black text-[#FFFFCA] transition hover:bg-white/10 active:scale-95"
              >
                <span>Portal Kasir & Staf</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Screen 6: Brand Footer (footer-visit) */}
      <footer className="border-t border-[#106F4D]/20 bg-[#106F4D] py-16 text-[#FFFFCA]">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="flex flex-col gap-4 md:col-span-5">
              <Logo variant="light" width={160} />
              <p className="text-base font-bold text-[#FFFFCA]">
                Two worlds. One table. Simply, makan.
              </p>
              <p className="text-xs text-[#FFFFCA]/80">
                Rumah makan spesialis olahan tuna segar dan ayam kampung berlokasi di Bandung, Jawa Barat.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-xs md:col-span-3">
              <span className="font-black uppercase tracking-wider text-[#FFFFCA]">Alamat & Kontak</span>
              <p className="text-[#FFFFCA]/80">Jl. Matwona No. 12, Bandung</p>
              <p className="text-[#FFFFCA]/80">Senin – Minggu (10.00 – 21.00 WIB)</p>
              <p className="mt-1">
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white hover:underline"
                >
                  WhatsApp: +62 812-3456-7890
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-2 text-xs md:col-span-4">
              <span className="font-black uppercase tracking-wider text-[#FFFFCA]">Tautan Cepat</span>
              <div className="flex flex-col gap-1.5 font-semibold text-[#FFFFCA]/80">
                <Link href="/m/matwona/t/tok-meja-01" className="hover:text-white transition-colors">
                  Digital Customer Menu (Meja 01)
                </Link>
                <Link href="/admin/menu" className="hover:text-white transition-colors">
                  Admin Kelola Menu & Olsera Sync
                </Link>
                <Link href="/admin/analytics" className="hover:text-white transition-colors">
                  Admin Analitik Penjualan
                </Link>
                <Link href="/login" className="hover:text-white transition-colors">
                  Login Kasir & Staf Dapur
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#FFFFCA]/20 pt-8 text-xs text-[#FFFFCA]/70 sm:flex-row">
            <span>© 2026 Matwona Kitchen Bandung. Semua hak cipta dilindungi.</span>
            <span>
              Foto via Wikimedia Commons (CC BY-SA 4.0 / Public Domain) & Matwona Kitchen Studio.
            </span>
          </div>
        </div>
      </footer>

      {/* Interactive Detail Modal */}
      {activeItemModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setActiveItemModal(null)}
        >
          <div
            className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E2E7D8] bg-white text-[#1F2A24] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {activeItemModal.image && (
              <div className="relative aspect-16/10 w-full overflow-hidden bg-[#EFEFD8]">
                <Image
                  src={activeItemModal.image}
                  alt={activeItemModal.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <button
                  type="button"
                  onClick={() => setActiveItemModal(null)}
                  className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-black/50 text-sm font-bold text-white hover:bg-black/80"
                >
                  ✕
                </button>
                {activeItemModal.badge && (
                  <span className="absolute top-4 left-4 rounded-full bg-[#106F4D] px-3 py-1 text-xs font-black uppercase text-[#FFFFCA]">
                    {activeItemModal.badge}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#106F4D] uppercase">
                    {activeItemModal.category}
                  </span>
                  <h3 className="text-xl font-black text-[#1F2A24]">{activeItemModal.name}</h3>
                </div>
                <span className="font-mono text-2xl font-black text-[#106F4D]">
                  {activeItemModal.price}
                </span>
              </div>

              <p className="text-sm font-medium leading-relaxed text-[#5B6B62]">
                {activeItemModal.desc}
              </p>

              {activeItemModal.portion && (
                <div className="rounded-xl border border-[#106F4D]/20 bg-[#FFFFCA] p-3 text-xs font-bold text-[#106F4D]">
                  Porsi: {activeItemModal.portion}
                </div>
              )}

              <div className="mt-2 flex flex-col gap-2">
                <Link
                  href="/m/matwona/t/tok-meja-01"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#106F4D] text-xs font-black text-white shadow-md transition hover:bg-[#0B5A3E] active:scale-95"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3h-3zM17 20h4v-3" />
                  </svg>
                  <span>Pesan Menu Ini di Meja Digital</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveItemModal(null)}
                  className="h-9 text-xs font-bold text-[#5B6B62] hover:text-[#1F2A24]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
