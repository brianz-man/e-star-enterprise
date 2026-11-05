import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("  Seeding E-Star database...");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@e-star.co.ke";
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword || adminPassword.length < 16)
    throw new Error(
      "ADMIN_SEED_PASSWORD is required and must be at least 16 characters",
    );
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_SEED !== "true"
  )
    throw new Error(
      "Production seeding requires ALLOW_PRODUCTION_SEED=true",
    );

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: "ADMIN", isVerified: true },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      firstName: "E-Star",
      lastName: "Admin",
      role: "ADMIN",
      isVerified: true,
    },
  });
  console.log("  Admin:", admin.email);

  // ── Brands ──────────────────────────────────────────────────────────────────
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { slug: "hp" },
      update: {},
      create: { name: "HP", slug: "hp" },
    }),
    prisma.brand.upsert({
      where: { slug: "canon" },
      update: {},
      create: { name: "Canon", slug: "canon" },
    }),
    prisma.brand.upsert({
      where: { slug: "epson" },
      update: {},
      create: { name: "Epson", slug: "epson" },
    }),
    prisma.brand.upsert({
      where: { slug: "brother" },
      update: {},
      create: { name: "Brother", slug: "brother" },
    }),
    prisma.brand.upsert({
      where: { slug: "samsung" },
      update: {},
      create: { name: "Samsung", slug: "samsung" },
    }),
  ]);
  console.log("  Brands:", brands.map((b) => b.name).join(", "));

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "toners" },
      update: {},
      create: {
        name: "Laser Toners",
        slug: "toners",
        description: "Laser printer toner cartridges",
      },
    }),
    prisma.category.upsert({
      where: { slug: "ink-cartridges" },
      update: {},
      create: {
        name: "Ink Cartridges",
        slug: "ink-cartridges",
        description: "Inkjet printer cartridges",
      },
    }),
    prisma.category.upsert({
      where: { slug: "drum-units" },
      update: {},
      create: {
        name: "Drum Units",
        slug: "drum-units",
        description: "Printer drum units",
      },
    }),
  ]);
  console.log(" Categories:", categories.map((c) => c.name).join(", "));

  // ── Products ─────────────────────────────────────────────────────────────────
  const hp = brands.find((b) => b.slug === "hp")!;
  const canon = brands.find((b) => b.slug === "canon")!;
  const toner = categories.find((c) => c.slug === "toners")!;
  const ink = categories.find((c) => c.slug === "ink-cartridges")!;

  const products = [
    {
      name: "HP 85A Black Toner Cartridge",
      sku: "HP-CE285A",
      slug: "hp-85a-black-toner-cartridge",
      description:
        "Original HP 85A Black LaserJet Toner Cartridge (CE285A). Yields approximately 1,600 pages.",
      price: 3800,
      comparePrice: 4500,
      stockQty: 45,
      brandId: hp.id,
      categoryId: toner.id,
      isFeatured: true,
      compatibility: [
        { brand: "HP", printerModel: "LaserJet P1102", printerSeries: "P1100" },
        {
          brand: "HP",
          printerModel: "LaserJet P1102w",
          printerSeries: "P1100",
        },
        {
          brand: "HP",
          printerModel: "LaserJet M1212nf",
          printerSeries: "M1200",
        },
        { brand: "HP", printerModel: "LaserJet M1132", printerSeries: "M1100" },
      ],
    },
    {
      name: "HP 12A Black Toner Cartridge",
      sku: "HP-Q2612A",
      slug: "hp-12a-black-toner-cartridge",
      description:
        "Original HP 12A Black Toner Cartridge (Q2612A). Yields approximately 2,000 pages.",
      price: 4200,
      comparePrice: 5000,
      stockQty: 32,
      brandId: hp.id,
      categoryId: toner.id,
      isFeatured: true,
      compatibility: [
        { brand: "HP", printerModel: "LaserJet 1010", printerSeries: "1000" },
        { brand: "HP", printerModel: "LaserJet 1015", printerSeries: "1000" },
        { brand: "HP", printerModel: "LaserJet 3015", printerSeries: "3000" },
      ],
    },
    {
      name: "Canon PG-745 Black Ink Cartridge",
      sku: "CN-PG745",
      slug: "canon-pg745-black-ink-cartridge",
      description:
        "Original Canon PG-745 Black Ink Cartridge. Yields approximately 180 pages.",
      price: 1200,
      comparePrice: 1500,
      stockQty: 60,
      brandId: canon.id,
      categoryId: ink.id,
      isFeatured: false,
      compatibility: [
        {
          brand: "Canon",
          printerModel: "PIXMA MG2570S",
          printerSeries: "PIXMA MG",
        },
        {
          brand: "Canon",
          printerModel: "PIXMA MG3070S",
          printerSeries: "PIXMA MG",
        },
        {
          brand: "Canon",
          printerModel: "PIXMA TS3170S",
          printerSeries: "PIXMA TS",
        },
      ],
    },
  ];

  for (const { compatibility, ...productData } of products) {
    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {},
      create: {
        ...productData,
        price: productData.price,
        comparePrice: productData.comparePrice,
        compatibility: { create: compatibility },
      },
    });
    console.log("  Product:", product.name);
  }

  console.log("\n  Seed complete!");
  console.log("   Bootstrap administrator:", adminEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
