import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['shared'],
  // Hanya untuk `next dev`: izinkan HP di jaringan lokal (Wi-Fi/hotspot laptop) memuat JS & HMR
  // saat uji tampilan mobile. Tidak berpengaruh pada build produksi.
  allowedDevOrigins: ['192.168.*.*'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
