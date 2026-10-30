/**
 * Seed data lokal: outlet Matwona, akun admin & kasir, kategori, menu contoh (fiktif), 10 meja.
 * Jalankan: pnpm db:seed
 * Data menu riil nantinya berasal dari impor CSV Olsera (FR-013).
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
    update: {},
    create: {
      slug: 'matwona',
      name: 'Matwona',
      tagline: 'Two worlds. One table. Simply, makan.',
      description:
        'Rumah makan spesialis tuna dan ayam kampung dengan dapur terbuka. Protein terpenuhi, dengan tuna setiap hari.',
      address: 'Alamat outlet Matwona (isi dari mitra), Bandung',
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

  const existingCategories = await prisma.category.count({ where: { outletId: outlet.id } });
  if (existingCategories === 0) {
    // Menu contoh FIKTIF — ganti dengan hasil impor Olsera
    const catalog: Array<{ name: string; items: Array<[string, number, string]> }> = [
      {
        name: 'Olahan Tuna',
        items: [
          ['Tuna Sambal Matah', 45000, 'TN-SMT'],
          ['Tuna Geprek', 38000, 'TN-GPK'],
          ['Tuna Bakar Kecap', 42000, 'TN-BKK'],
        ],
      },
      {
        name: 'Olahan Ayam Kampung',
        items: [
          ['Ayam Kampung Bakar', 42000, 'AK-BKR'],
          ['Ayam Kampung Goreng Lengkuas', 40000, 'AK-GRL'],
        ],
      },
      {
        name: 'Tambahan',
        items: [
          ['Nasi Putih', 6000, 'TB-NSP'],
          ['Sambal Ekstra', 4000, 'TB-SBL'],
          ['Lalapan', 5000, 'TB-LLP'],
        ],
      },
      {
        name: 'Minuman',
        items: [
          ['Es Teh Serai', 8000, 'MN-ETS'],
          ['Es Jeruk', 10000, 'MN-EJR'],
          ['Air Mineral', 5000, 'MN-AIR'],
        ],
      },
    ];

    for (const [ci, cat] of catalog.entries()) {
      const category = await prisma.category.create({
        data: { outletId: outlet.id, name: cat.name, sortOrder: ci },
      });
      for (const [ii, [name, price, sku]] of cat.items.entries()) {
        await prisma.menuItem.create({
          data: { outletId: outlet.id, categoryId: category.id, name, price, sku, sortOrder: ii },
        });
      }
    }
  }

  const existingTables = await prisma.diningTable.count({ where: { outletId: outlet.id } });
  if (existingTables === 0) {
    for (let i = 1; i <= 10; i++) {
      await prisma.diningTable.create({
        data: { outletId: outlet.id, label: String(i), capacity: 4, qrToken: generateTableToken() },
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
