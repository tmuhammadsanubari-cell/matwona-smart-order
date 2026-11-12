import Link from 'next/link';
import Image from 'next/image';
import { LandingMenu } from '@/components/menu/landing-menu';
import { Logo } from '@/components/ui';

export default function LandingPage() {
  return (
    <div
      data-type="place"
      data-site-kind="place"
      data-page-kind="place"
      className="min-h-screen bg-[#FFFFCA] text-[#1F2A24] antialiased selection:bg-[#106F4D] selection:text-[#FFFFCA]"
    >
      {/* Sticky Editorial Header */}
      <header className="sticky top-0 z-40 border-b border-[#106F4D]/15 bg-[#FFFFCA]/95 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Beranda Matwona"
            className="inline-flex min-h-11 items-center transition hover:opacity-85"
          >
            <Logo variant="green" width={145} priority />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            <a
              href="#menu"
              className="text-sm font-bold text-[#1F2A24] transition hover:text-[#106F4D]"
            >
              Daftar Menu
            </a>
            <a
              href="#outlet"
              className="text-sm font-bold text-[#1F2A24] transition hover:text-[#106F4D]"
            >
              Kunjungi Outlet
            </a>
            <a
              href="#cerita"
              className="text-sm font-bold text-[#1F2A24] transition hover:text-[#106F4D]"
            >
              Cerita Ma-Two-Na
            </a>
            <a
              href="#dapur"
              className="text-sm font-bold text-[#1F2A24] transition hover:text-[#106F4D]"
            >
              Dapur Terbuka
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/m/matwona/t/tok-meja-01"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#106F4D] px-4 text-xs font-black text-[#FFFFCA] shadow-sm transition hover:bg-[#0B5A3E] active:scale-95"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM17 20h4v-3" />
              </svg>
              <span>Menu Meja</span>
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
        <nav
          aria-label="Navigasi halaman"
          className="flex gap-5 overflow-x-auto border-t border-primary/10 px-4 text-xs font-bold text-primary lg:hidden [scrollbar-width:none]"
        >
          <a
            href="#menu"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
          >
            Daftar Menu
          </a>
          <a
            href="#outlet"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
          >
            Outlet
          </a>
          <a
            href="#cerita"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
          >
            Cerita Kami
          </a>
          <a
            href="#dapur"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
          >
            Dapur Terbuka
          </a>
        </nav>
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
              Spesialis olahan tuna segar kualitas ekspor dan ayam kampung gurih. Dimasak langsung
              di dapur terbuka setiap hari — protein terpenuhi, rasa autentik, harga bersahabat.
            </p>

            <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3.5">
              <Link
                href="/m/matwona/t/tok-meja-01"
                className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#106F4D] px-6 text-sm font-black text-[#FFFFCA] shadow-md transition hover:bg-[#0B5A3E] active:scale-95 sm:w-auto"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  aria-hidden="true"
                >
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
                <span>Mulai Rp 13.000 / porsi</span>
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
                  src="/menu/tuna-matah-reguler.png"
                  alt="Matwona Sambal Matah Reguler"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  priority
                  className="object-contain object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFFFCA]">
                      Menu Pilihan Utama
                    </span>
                    <p className="text-base font-bold text-white">Matwona Sambal Matah Reguler</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap font-mono text-base font-black text-[#FFFFCA]">
                    Rp 19.000
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-3 pb-1 text-xs font-bold text-[#5B6B62]">
                <span className="text-[#106F4D]">Laut + Darat di Satu Meja</span>
                <span className="rounded bg-[#E1F2EA] px-2 py-0.5 text-[11px] text-[#106F4D]">
                  100% Tuna Kualitas Ekspor
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingMenu />

      {/* Screen 3: Kunjungi Outlet & Jam Buka (Mengalir Mulus Tanpa Border Potong) */}
      <section
        id="outlet"
        data-place="visit"
        className="scroll-mt-36 mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28"
      >
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Kiri: Detail Kunjungan */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-[#106F4D]">
                Kunjungi Outlet
              </span>
              <h2 className="mt-1 text-3xl font-extrabold text-[#1F2A24] sm:text-4xl">
                Mampir ke Matwona Bandung
              </h2>
            </div>

            <p className="text-base font-medium leading-relaxed text-[#5B6B62]">
              Suasana santap hangat dan akrab. Dapur terbuka kami menyajikan olahan tuna panas
              langsung ke mejamu, lengkap dengan aroma sambal ulek serai dan telur barendo krispi
              keemasan.
            </p>

            <div className="rounded-2xl border-2 border-[#106F4D]/20 bg-white p-6 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#106F4D] text-[#FFFFCA]">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1F2A24]">Jl. Matwona No. 12, Bandung</p>
                  <p className="mt-0.5 text-xs text-[#5B6B62]">
                    Jawa Barat 40115 · Akses mudah di pusat kota
                  </p>
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
                className="inline-flex h-12 min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#106F4D] px-5 text-xs font-black text-white shadow-sm transition hover:bg-[#0B5A3E] active:scale-95"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                <span>Buka di Google Maps</span>
              </a>
              <a
                href="https://wa.me/6281234567890?text=Halo%20Matwona%2C%20saya%20ingin%20tanya%20menu%20dan%20ketersediaan%20meja"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#106F4D] bg-[#FFFFCA] px-5 text-xs font-bold text-[#106F4D] transition hover:bg-white active:scale-95"
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
                  <h3 className="mt-2 text-2xl font-black text-white">
                    Dimasak Segar di Depan Mejamu
                  </h3>
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
      <section id="cerita" className="scroll-mt-36 mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-xs font-black tracking-widest uppercase text-[#106F4D]">
            Cerita Nama Kami
          </span>
          <h2 className="text-3xl font-extrabold text-[#1F2A24] sm:text-4xl">Kenapa Ma-Two-Na?</h2>
          <p className="max-w-xl text-sm font-semibold leading-relaxed text-[#5B6B62]">
            Tiga suku kata, satu komitmen menyajikan hidangan bermutu tinggi dengan kehangatan rumah
            sendiri.
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
                Tempat makan yang hangat, ramah, dan akrab. Seperti warung langganan dekat rumah
                yang selalu dirindukan.
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
                Tuna segar dari kedalaman laut dan ayam kampung dari bumi daratan, bertemu harmonis
                dalam satu meja sajian.
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
                Menjadikan olahan tuna pilihan sehari-hari: kualitas ekspor segar, gurih berprotein
                tinggi, dan harga terjangkau.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Pilar Dapur Terbuka */}
        <div id="dapur" className="scroll-mt-36 mt-16">
          <div className="flex flex-col gap-2 text-center">
            <span className="text-xs font-black tracking-widest uppercase text-[#106F4D]">
              Standar Dapur Kami
            </span>
            <h3 className="text-2xl font-black text-[#1F2A24] sm:text-3xl">
              Empat Pilar Dapur Terbuka
            </h3>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E2E7D8] bg-white p-5 shadow-xs">
              <span className="rounded bg-[#106F4D] px-2 py-0.5 text-[10px] font-black uppercase text-[#FFFFCA]">
                Pilar 01
              </span>
              <h4 className="mt-2 text-base font-bold text-[#1F2A24]">Tuna Segar di Atas Es</h4>
              <p className="mt-1 text-xs text-[#5B6B62]">
                Dipotong segar setiap pagi dari pemasok ekspor, nutrisi omega-3 tetap terjaga utuh.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E7D8] bg-white p-5 shadow-xs">
              <span className="rounded bg-[#106F4D] px-2 py-0.5 text-[10px] font-black uppercase text-[#FFFFCA]">
                Pilar 02
              </span>
              <h4 className="mt-2 text-base font-bold text-[#1F2A24]">
                Panggangan Arang Tradisional
              </h4>
              <p className="mt-1 text-xs text-[#5B6B62]">
                Aroma asap arang alami memberikan sentuhan smoky gurih yang meresap ke serat daging.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E7D8] bg-white p-5 shadow-xs">
              <span className="rounded bg-[#106F4D] px-2 py-0.5 text-[10px] font-black uppercase text-[#FFFFCA]">
                Pilar 03
              </span>
              <h4 className="mt-2 text-base font-bold text-[#1F2A24]">Sambal Ulek Dadakan</h4>
              <p className="mt-1 text-xs text-[#5B6B62]">
                Sambal matah beraroma serai dan sambal dabu-dabu potongan tomat diracik dadakan
                setiap sesi.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E7D8] bg-white p-5 shadow-xs">
              <span className="rounded bg-[#106F4D] px-2 py-0.5 text-[10px] font-black uppercase text-[#FFFFCA]">
                Pilar 04
              </span>
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
                Scan QR di meja kamu, pilih menu favorit, dan bayar di kasir atau langsung via QRIS
                tanpa perlu antre berdiri.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href="/m/matwona/t/tok-meja-01"
                className="inline-flex h-13 items-center gap-2 rounded-2xl bg-[#FFFFCA] px-7 text-sm font-black text-[#106F4D] shadow-lg transition hover:bg-white active:scale-95"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
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
                Rumah makan spesialis olahan tuna segar dan ayam kampung berlokasi di Bandung, Jawa
                Barat.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-xs md:col-span-3">
              <span className="font-black uppercase tracking-wider text-[#FFFFCA]">
                Alamat & Kontak
              </span>
              <p className="text-[#FFFFCA]/80">Jl. Matwona No. 12, Bandung</p>
              <p className="text-[#FFFFCA]/80">Senin – Minggu (10.00 – 21.00 WIB)</p>
              <p className="mt-1">
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center font-bold text-white hover:underline"
                >
                  WhatsApp: +62 812-3456-7890
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-2 text-xs md:col-span-4">
              <span className="font-black uppercase tracking-wider text-[#FFFFCA]">
                Tautan Cepat
              </span>
              <div className="flex flex-col gap-1.5 font-semibold text-[#FFFFCA]/80">
                <Link
                  href="/m/matwona/t/tok-meja-01"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  Digital Customer Menu (Meja 01)
                </Link>
                <Link
                  href="/admin/menu"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  Admin Kelola Menu & Olsera Sync
                </Link>
                <Link
                  href="/admin/analytics"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  Admin Analitik Penjualan
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  Login Kasir & Staf Dapur
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#FFFFCA]/20 pt-8 text-xs text-[#FFFFCA]/70 sm:flex-row">
            <span>© 2026 Matwona Kitchen Bandung. Semua hak cipta dilindungi.</span>
            <span>
              Foto menu: materi Matwona. Foto suasana: Wikimedia Commons (CC BY-SA 4.0 / Public
              Domain).
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
