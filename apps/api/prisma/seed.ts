/**
 * Seed data lokal: outlet Matwona, akun admin & kasir, kategori, menu riil Matwona, 10 meja.
 * Jalankan: pnpm db:seed
 */
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { MATWONA_CATALOG } from 'shared';
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

  // Satu katalog acuan dengan buku menu publik, mengikuti foto menu mitra.
  const catalog = MATWONA_CATALOG;

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
      const imageUrl = item.imageUrl ?? null;
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
          description: item.description,
          sortOrder: ii,
          imageUrl,
          isAvailable: true,
        },
        create: {
          outletId: outlet.id,
          categoryId: category.id,
          name: item.name,
          price: item.price,
          description: item.description,
          sku: item.sku,
          sortOrder: ii,
          imageUrl,
          isAvailable: true,
        },
      });
    }
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
    console.log(
      `  Meja ${t.label.padEnd(3)} http://localhost:3000/m/${outlet.slug}/t/${t.qrToken}`,
    );
  }
  console.log('\nLogin: admin@matwona.local / Admin123!  ·  kasir@matwona.local / Kasir123!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
