/**
 * Seed data lokal: outlet Matwona, akun admin & kasir, kategori, menu riil Matwona, 10 meja.
 * Jalankan: pnpm db:seed
 */
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { generateTableToken } from '../src/modules/tables/table-token.js';

config({ path: path.resolve(import.meta.dirname, '../../../.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const outlet = await prisma.outlet.upsert({
    where: { slug: 'matwona' },
    update: {
      name: 'Matwona',
      tagline: 'Two worlds. One table. Simply, makan.',
      description:
        'Rumah makan spesialis tuna dan ayam kampung dengan dapur terbuka. Protein terpenuhi, dengan tuna setiap hari.',
      address: 'Jl. Matwona No. 12, Bandung',
      openingHours: {
        mon: ['10:00', '21:00'],
        tue: ['10:00', '21:00'],
        wed: ['10:00', '21:00'],
        thu: ['10:00', '21:00'],
        fri: ['10:00', '21:00'],
        sat: ['10:00', '22:00'],
        sun: ['10:00', '22:00'],
      },
    },
    create: {
      slug: 'matwona',
      name: 'Matwona',
      tagline: 'Two worlds. One table. Simply, makan.',
      description:
        'Rumah makan spesialis tuna dan ayam kampung dengan dapur terbuka. Protein terpenuhi, dengan tuna setiap hari.',
      address: 'Jl. Matwona No. 12, Bandung',
      openingHours: {
        mon: ['10:00', '21:00'],
        tue: ['10:00', '21:00'],
        wed: ['10:00', '21:00'],
        thu: ['10:00', '21:00'],
        fri: ['10:00', '21:00'],
        sat: ['10:00', '22:00'],
        sun: ['10:00', '22:00'],
      },
    },
  });

  const cost = Number(process.env.BCRYPT_COST ?? 12);
  await prisma.user.upsert({
    where: { email: 'admin@matwona.local' },
    update: {},
    create: {
      outletId: outlet.id,
      name: 'Owner Matwona',
      email: 'admin@matwona.local',
      passwordHash: await bcrypt.hash('Admin123!', cost),
      role: 'ADMIN',
    },
  });
  await prisma.user.upsert({
    where: { email: 'kasir@matwona.local' },
    update: {},
    create: {
      outletId: outlet.id,
      name: 'Kasir 1',
      email: 'kasir@matwona.local',
      passwordHash: await bcrypt.hash('Kasir123!', cost),
      role: 'CASHIER',
    },
  });

  // Menu riil Matwona dari foto fisik dan kartu desain
  const categoryImages: Record<string, string> = {
    'Olahan Tuna': '/assets/img/photo-f197010978.webp',
    'Non-Spicy': '/assets/img/photo-f197010978.webp',
    'Olahan Ayam Kampung': '/assets/img/photo-f98888457.webp',
    'Bakmie Series': '/assets/img/photo-f2427663.webp',
    'Paket Nasi Telur Barendo': '/assets/img/photo-f15601118.webp',
    'Camilan & Dessert': '/assets/img/photo-f153080413.webp',
    'Alacarte & Tambahan': '/assets/img/photo-f153080413.webp',
    'Tambahan': '/assets/img/photo-f153080413.webp',
    'Minuman': '/assets/img/photo-f1752757.webp',
  };

  function getItemImage(catName: string, itemName: string): string {
    const lower = itemName.toLowerCase();
    if (lower.includes('bakmie')) return '/assets/img/photo-f2427663.webp';
    if (lower.includes('risol') || lower.includes('cookie')) return '/assets/img/photo-f153080413.webp';
    if (lower.includes('ayam')) return '/assets/img/photo-f98888457.webp';
    if (lower.includes('tuna') || lower.includes('twona')) return '/assets/img/photo-f197010978.webp';
    if (lower.includes('telur')) return '/assets/img/photo-f15601118.webp';
    if (lower.includes('teh') || lower.includes('jeruk') || lower.includes('lemon') || lower.includes('mineral') || catName === 'Minuman') {
      return '/assets/img/photo-f1752757.webp';
    }
    return categoryImages[catName] ?? '/assets/img/photo-f197010978.webp';
  }

  const catalog: Array<{
    name: string;
    items: Array<{ name: string; price: number; sku: string; desc: string; olseraId?: string }>;
  }> = [
    {
      name: 'Olahan Tuna',
      items: [
        {
          name: 'Tuna Sambal Matah (Reguler)',
          price: 19000,
          sku: 'TN-SMT-R',
          desc: 'Paket Nasi + Olahan Tuna + Telur Dadar + Jukut Goreng + Kremesan + Sambal Matah',
          olseraId: 'OLS-TN-01',
        },
        {
          name: 'Tuna Sambal Matah (Jumbo)',
          price: 29000,
          sku: 'TN-SMT-J',
          desc: 'Paket Nasi + Olahan Tuna Jumbo + Telur Dadar + Jukut Goreng + Kremesan + Sambal Matah',
          olseraId: 'OLS-TN-02',
        },
        {
          name: 'Tuna Sambal Dabu-Dabu (Reguler)',
          price: 19000,
          sku: 'TN-DAB-R',
          desc: 'Paket Nasi + Olahan Tuna + Telur Dadar + Jukut Goreng + Kremesan + Sambal Dabu-Dabu',
          olseraId: 'OLS-TN-03',
        },
        {
          name: 'Tuna Sambal Dabu-Dabu (Jumbo)',
          price: 29000,
          sku: 'TN-DAB-J',
          desc: 'Paket Nasi + Olahan Tuna Jumbo + Telur Dadar + Jukut Goreng + Kremesan + Sambal Dabu-Dabu',
          olseraId: 'OLS-TN-04',
        },
        {
          name: 'Tuna Lada Garam (Reguler)',
          price: 19000,
          sku: 'TN-LDG-R',
          desc: 'Paket Nasi + Olahan Tuna + Telur Dadar + Jukut Goreng + Kremesan + Bumbu Lada Garam',
          olseraId: 'OLS-TN-05',
        },
        {
          name: 'Tuna Lada Garam (Jumbo)',
          price: 29000,
          sku: 'TN-LDG-J',
          desc: 'Paket Nasi + Olahan Tuna Jumbo + Telur Dadar + Jukut Goreng + Kremesan + Bumbu Lada Garam',
          olseraId: 'OLS-TN-06',
        },
      ],
    },
    {
      name: 'Non-Spicy',
      items: [
        {
          name: 'Tuna Mayo (Reguler)',
          price: 17000,
          sku: 'TN-MYO-R',
          desc: 'Paket Nasi + Olahan Tuna + Telur Dadar + Jukut Goreng + Kremesan + Saus Mayo Spesial',
          olseraId: 'OLS-TN-07',
        },
        {
          name: 'Tuna Mayo (Jumbo)',
          price: 26000,
          sku: 'TN-MYO-J',
          desc: 'Paket Nasi + Olahan Tuna Jumbo + Telur Dadar + Jukut Goreng + Kremesan + Saus Mayo Spesial',
          olseraId: 'OLS-TN-08',
        },
      ],
    },
    {
      name: 'Bakmie Series',
      items: [
        {
          name: 'Bakmie Tuna Sambal Matah',
          price: 38000,
          sku: 'BM-TN-SMT',
          desc: 'Bakmie kenyal gurih dengan topping tuna suwir melimpah & sambal matah serai segar',
          olseraId: 'OLS-BM-01',
        },
        {
          name: 'Bakmie Tuna Chili Oil',
          price: 38000,
          sku: 'BM-TN-CHO',
          desc: 'Bakmie kenyal dengan aroma chili oil khas dan potongan tuna berbumbu pedas gurih',
          olseraId: 'OLS-BM-02',
        },
        {
          name: 'Bakmie Tuna Original',
          price: 35000,
          sku: 'BM-TN-ORI',
          desc: 'Bakmie kenyal gurih klasik dengan topping tuna spesial dan kuah kaldu hangat',
          olseraId: 'OLS-BM-03',
        },
      ],
    },
    {
      name: 'Paket Nasi Telur Barendo',
      items: [
        {
          name: 'Nasi Telur Sambal Matah',
          price: 16000,
          sku: 'TL-SMT',
          desc: 'Nasi putih hangat + Telur dadar barendo krispi + Jukut goreng + Kremesan + Sambal Matah',
          olseraId: 'OLS-TL-01',
        },
        {
          name: 'Nasi Telur Sambal Dabu-Dabu',
          price: 16000,
          sku: 'TL-DAB',
          desc: 'Nasi putih hangat + Telur dadar barendo krispi + Jukut goreng + Kremesan + Sambal Dabu-Dabu',
          olseraId: 'OLS-TL-02',
        },
        {
          name: 'Nasi Telur Lada Garam',
          price: 16000,
          sku: 'TL-LDG',
          desc: 'Nasi putih hangat + Telur dadar barendo krispi + Jukut goreng + Kremesan + Bumbu Lada Garam',
          olseraId: 'OLS-TL-03',
        },
        {
          name: 'Nasi Telur Non-Spicy',
          price: 13000,
          sku: 'TL-NSP',
          desc: 'Nasi putih hangat + Telur dadar barendo krispi + Jukut goreng + Kremesan + Saus gurih non-pedas',
          olseraId: 'OLS-TL-04',
        },
      ],
    },
    {
      name: 'Camilan & Dessert',
      items: [
        {
          name: 'Risol Tuna Melt (Goreng)',
          price: 10000,
          sku: 'CM-RS-GRG',
          desc: 'Risol renyah isi tuna melt lezat disajikan hangat (1 pcs)',
          olseraId: 'OLS-CM-01',
        },
        {
          name: 'Risol Tuna Melt (Frozen isi 3)',
          price: 28000,
          sku: 'CM-RS-FRZ',
          desc: 'Kemasan frozen siap goreng isi 3 pcs risol tuna melt gurih lumer',
          olseraId: 'OLS-CM-02',
        },
        {
          name: 'Soft Cookies Matwona',
          price: 10000,
          sku: 'CM-SC-ORI',
          desc: 'Soft baked cookies manis gurih lumer penutup makan yang sempurna',
          olseraId: 'OLS-CM-03',
        },
      ],
    },
    {
      name: 'Alacarte & Tambahan',
      items: [
        {
          name: 'Extra Twona (Tuna Alacarte)',
          price: 12000,
          sku: 'TB-EXT-TWN',
          desc: 'Porsi ekstra olahan tuna tanpa nasi',
          olseraId: 'OLS-TB-01',
        },
        {
          name: 'Telur Dadar Barendo',
          price: 7000,
          sku: 'TB-TL-BRD',
          desc: 'Telur dadar khas Padang goreng berenda renyah gurih',
          olseraId: 'OLS-TB-02',
        },
        {
          name: 'Jukut Goreng',
          price: 7000,
          sku: 'TB-JKT-GRG',
          desc: 'Sayur jukut goreng renyah khas Matwona',
          olseraId: 'OLS-TB-03',
        },
        {
          name: 'Nasi Putih',
          price: 6000,
          sku: 'TB-NSP',
          desc: 'Nasi putih pulen hangat',
          olseraId: 'OLS-TB-04',
        },
        {
          name: 'Kremesan Gurih',
          price: 3000,
          sku: 'TB-KRM',
          desc: 'Kremesan renyah gurih pelengkap santapan',
          olseraId: 'OLS-TB-05',
        },
        {
          name: 'Sambal Matah',
          price: 4000,
          sku: 'TB-SB-MTH',
          desc: 'Sambal matah serai dan bawang merah segar ekstra',
          olseraId: 'OLS-TB-06',
        },
        {
          name: 'Sambal Dabu-Dabu',
          price: 4000,
          sku: 'TB-SB-DAB',
          desc: 'Sambal tomat cabai segar dabu-dabu ekstra',
          olseraId: 'OLS-TB-07',
        },
        {
          name: 'Sambal Lada Garam',
          price: 4000,
          sku: 'TB-SB-LDG',
          desc: 'Bumbu oseng lada garam renyah pedas gurih ekstra',
          olseraId: 'OLS-TB-08',
        },
      ],
    },
    {
      name: 'Minuman',
      items: [
        {
          name: 'Es Teh Manis',
          price: 5000,
          sku: 'MN-ETM',
          desc: 'Es teh melati manis dingin segar',
          olseraId: 'OLS-MN-01',
        },
        {
          name: 'Es Teh Tawar',
          price: 4000,
          sku: 'MN-ETT',
          desc: 'Es teh melati tawar dingin segar',
          olseraId: 'OLS-MN-02',
        },
        {
          name: 'Lemon Tea Dingin',
          price: 8000,
          sku: 'MN-LMT',
          desc: 'Teh lemon dingin segar pelepas dahaga',
          olseraId: 'OLS-MN-03',
        },
        {
          name: 'Es Jeruk Segar',
          price: 10000,
          sku: 'MN-EJR',
          desc: 'Es perasan jeruk asli manis segar',
          olseraId: 'OLS-MN-04',
        },
        {
          name: 'Air Mineral',
          price: 5000,
          sku: 'MN-AIR',
          desc: 'Air mineral botol dingin atau suhu ruang',
          olseraId: 'OLS-MN-05',
        },
      ],
    },
  ];

  for (const [ci, cat] of catalog.entries()) {
    let category = await prisma.category.findFirst({
      where: { outletId: outlet.id, name: cat.name },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { outletId: outlet.id, name: cat.name, sortOrder: ci },
      });
    } else {
      category = await prisma.category.update({
        where: { id: category.id },
        data: { sortOrder: ci },
      });
    }

    for (const [ii, item] of cat.items.entries()) {
      const imageUrl = getItemImage(cat.name, item.name);
      await prisma.menuItem.upsert({
        where: {
          outletId_sku: {
            outletId: outlet.id,
            sku: item.sku,
          },
        },
        update: {
          categoryId: category.id,
          name: item.name,
          price: item.price,
          description: item.desc,
          sortOrder: ii,
          olseraProductId: item.olseraId,
          imageUrl,
          isAvailable: true,
        },
        create: {
          outletId: outlet.id,
          categoryId: category.id,
          name: item.name,
          price: item.price,
          description: item.desc,
          sku: item.sku,
          olseraProductId: item.olseraId,
          sortOrder: ii,
          imageUrl,
          isAvailable: true,
        },
      });
    }
  }

  // Update foto untuk semua menu item yang ada di outlet ini
  const allMenuItems = await prisma.menuItem.findMany({
    where: { outletId: outlet.id },
    include: { category: true },
  });
  for (const item of allMenuItems) {
    const imageUrl = getItemImage(item.category.name, item.name);
    await prisma.menuItem.update({
      where: { id: item.id },
      data: { imageUrl },
    });
  }

  const existingTables = await prisma.diningTable.count({ where: { outletId: outlet.id } });
  if (existingTables === 0) {
    for (let i = 1; i <= 10; i++) {
      await prisma.diningTable.create({
        data: {
          outletId: outlet.id,
          label: String(i),
          capacity: 4,
          qrToken: i === 1 ? 'tok-meja-01' : generateTableToken(),
        },
      });
    }
  } else {
    // Meja 1 dipastikan selalu memiliki token demo `tok-meja-01`
    const table1 = await prisma.diningTable.findFirst({
      where: { outletId: outlet.id, label: '1' },
    });
    if (table1) {
      await prisma.diningTable.update({
        where: { id: table1.id },
        data: { qrToken: 'tok-meja-01', isActive: true },
      });
    }
  }

  const tables = await prisma.diningTable.findMany({
    where: { outletId: outlet.id },
    orderBy: { createdAt: 'asc' },
  });
  console.log('\nSeed selesai. URL menu per meja:');
  for (const t of tables) {
    console.log(`  Meja ${t.label.padEnd(3)} http://localhost:3000/m/${outlet.slug}/t/${t.qrToken}`);
  }
  console.log('\nLogin: admin@matwona.local / Admin123!  ·  kasir@matwona.local / Kasir123!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
