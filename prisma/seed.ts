import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_FLAG = "demoCatalogSeeded";

async function ensureInitialAdmin() {
  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn("ADMIN_PASSWORD absent : aucun administrateur initial créé.");
    return;
  }

  const admins = await prisma.user.count({ where: { role: "admin", active: true } });
  if (admins > 0) return;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "admin",
        active: true,
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: false,
      },
    });
    console.log(`Compte ${username} promu administrateur.`);
    return;
  }

  await prisma.user.create({
    data: {
      username,
      displayName: "Administrateur",
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
      active: true,
      mustChangePassword: false,
    },
  });
  console.log(`Compte administrateur initial créé : ${username}`);
}

async function ensureSettings() {
  const defaults: Record<string, string> = {
    restaurantName: "Rwaresto",
    tagline: "Des bols généreux, des épices qui voyagent.",
    welcomeMessage:
      "Composez votre bol, installez-vous, et laissez les saveurs faire le reste.",
    currency: process.env.CURRENCY || "EUR",
    logoUrl: "",
    primaryColor: "#C4512C",
    accentColor: "#234D3C",
    openTime: "09:00",
    closeTime: "01:00",
    closedDays: "1",
    manualOpen: "true",
    address: "12 place des Saveurs",
    phone: "",
    hoursText: "Du mardi au dimanche · 09h00 – 01h00",
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
}

async function ensureTables() {
  for (let number = 1; number <= 12; number += 1) {
    await prisma.diningTable.upsert({
      where: { number },
      update: {},
      create: { number, label: `Table ${number}` },
    });
  }
}

type SeedCategory = {
  name: string;
  slug: string;
  sortOrder: number;
  image?: string;
  availableFrom?: string;
  availableTo?: string;
};
type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  image: string;
  vegetarian?: boolean;
  vegan?: boolean;
  spicy?: boolean;
  halal?: boolean;
  isNew?: boolean;
};

const categories: SeedCategory[] = [
  {
    name: "Petit-déjeuner",
    slug: "petit-dejeuner",
    sortOrder: -1,
    image: "/images/drink.jpg",
    availableFrom: "09:00",
    availableTo: "11:00",
  },
  {
    name: "Bowls",
    slug: "bowls",
    sortOrder: 0,
    image: "/images/matoke.jpg",
    availableFrom: "11:00",
    availableTo: "01:00",
  },
  {
    name: "Assiettes",
    slug: "assiettes",
    sortOrder: 1,
    image: "/images/ugali.jpg",
    availableFrom: "11:00",
    availableTo: "01:00",
  },
  {
    name: "Boissons",
    slug: "boissons",
    sortOrder: 2,
    image: "/images/drink.jpg",
    availableFrom: "09:00",
    availableTo: "01:00",
  },
  {
    name: "Desserts",
    slug: "desserts",
    sortOrder: 3,
    image: "/images/dessert-degue.webp",
    availableFrom: "09:00",
    availableTo: "01:00",
  },
];

const products: SeedProduct[] = [
  {
    slug: "bowl-poulet-yassa",
    name: "Bowl Poulet Yassa",
    description:
      "Riz parfumé, poulet mariné au citron et aux oignons confits, légumes croquants.",
    priceCents: 1290,
    category: "bowls",
    image: "/images/bowl-yassa.webp",
    halal: true,
  },
  {
    slug: "bowl-boeuf-mafe",
    name: "Bowl Bœuf Mafé",
    description:
      "Bœuf mijoté dans une sauce arachide onctueuse, riz, carottes et chou.",
    priceCents: 1390,
    category: "bowls",
    image: "/images/bowl-mafe.webp",
    halal: true,
  },
  {
    slug: "bowl-vegetarien",
    name: "Bowl Jardin d'Épices",
    description:
      "Légumes rôtis, pois chiches croustillants, riz complet et sauce tomate-gingembre.",
    priceCents: 1190,
    category: "bowls",
    image: "/images/bowl-jardin.webp",
    vegetarian: true,
    isNew: true,
  },
  {
    slug: "bowl-poisson-braise",
    name: "Bowl Poisson Braisé",
    description:
      "Poisson braisé, riz, plantain doré et sauce piment doux maison.",
    priceCents: 1490,
    category: "bowls",
    image: "/images/bowl-poisson.webp",
    spicy: true,
  },
  {
    slug: "assiette-thieboudienne",
    name: "Assiette Thiéboudienne",
    description:
      "Riz au poisson, légumes fondants et sauce tomate parfumée, généreusement servie.",
    priceCents: 1590,
    category: "assiettes",
    image: "/images/assiette-thieb.webp",
    spicy: true,
  },
  {
    slug: "assiette-poulet-dg",
    name: "Assiette Poulet DG",
    description:
      "Poulet doré, plantain, poivrons et tomates dans une sauce douce et colorée.",
    priceCents: 1490,
    category: "assiettes",
    image: "/images/assiette-poulet.webp",
    halal: true,
  },
  {
    slug: "assiette-plantain-haricots",
    name: "Plantain & Haricots",
    description:
      "Plantain caramélisé, haricots mijotés à l'huile de palme et salade fraîche.",
    priceCents: 1090,
    category: "assiettes",
    image: "/images/assiette-plantain.webp",
    vegetarian: true,
  },
  {
    slug: "bissap-maison",
    name: "Bissap Maison",
    description:
      "Infusion d'hibiscus, gingembre frais et une pointe de menthe. Servie fraîche.",
    priceCents: 350,
    category: "boissons",
    image: "/images/boisson-bissap.webp",
    vegetarian: true,
  },
  {
    slug: "gingembre-tonique",
    name: "Gingembre Tonique",
    description:
      "Boisson pétillante au gingembre, citron vert et sucre de canne.",
    priceCents: 350,
    category: "boissons",
    image: "/images/boisson-gingembre.webp",
    vegetarian: true,
    spicy: true,
    isNew: true,
  },
  {
    slug: "eau-minerale",
    name: "Eau minérale",
    description: "Bouteille d'eau minérale fraîche, 50 cl.",
    priceCents: 200,
    category: "boissons",
    image: "/images/boisson-eau.webp",
    vegetarian: true,
  },
  {
    slug: "degue-mangue",
    name: "Dégué Mangue",
    description:
      "Crème de mil onctueuse, mangue fraîche et éclats de noix de coco.",
    priceCents: 450,
    category: "desserts",
    image: "/images/dessert-degue.webp",
    vegetarian: true,
  },
  {
    slug: "fondant-chocolat",
    name: "Fondant Chocolat",
    description:
      "Petit fondant tiède au chocolat noir, cœur coulant et fleur de sel.",
    priceCents: 450,
    category: "desserts",
    image: "/images/dessert-fondant.webp",
    vegetarian: true,
  },
  {
    slug: "rituel-du-matin",
    name: "Rituel du matin",
    description:
      "Thé ou café, cookie maison et fruits frais pour démarrer la journée.",
    priceCents: 590,
    category: "petit-dejeuner",
    image: "/images/drink.jpg",
    vegetarian: true,
    isNew: true,
  },
  {
    slug: "the-citronne",
    name: "Thé citronné",
    description: "Thé noir infusé, citron frais et une pointe de miel.",
    priceCents: 300,
    category: "petit-dejeuner",
    image: "/images/drink.jpg",
    vegetarian: true,
    vegan: true,
  },
  {
    slug: "cookie-maison",
    name: "Cookie maison",
    description: "Cookie moelleux au chocolat, préparé chaque matin.",
    priceCents: 250,
    category: "petit-dejeuner",
    image: "/images/dessert-fondant.webp",
    vegetarian: true,
  },
  {
    slug: "cafe-noir",
    name: "Café noir",
    description: "Café noir fraîchement infusé, servi chaud.",
    priceCents: 250,
    category: "petit-dejeuner",
    image: "/images/drink.jpg",
    vegetarian: true,
    vegan: true,
  },
  {
    slug: "cafe-au-lait",
    name: "Café au lait",
    description: "Café et lait chaud, dosage doux.",
    priceCents: 300,
    category: "petit-dejeuner",
    image: "/images/drink.jpg",
    vegetarian: true,
  },
  {
    slug: "chocolat-chaud",
    name: "Chocolat chaud",
    description: "Chocolat noir fondu, lait chaud et touche de cannelle.",
    priceCents: 350,
    category: "petit-dejeuner",
    image: "/images/drink.jpg",
    vegetarian: true,
  },
  {
    slug: "jus-orange",
    name: "Jus d'orange pressé",
    description: "Orange fraîche pressée à la commande.",
    priceCents: 400,
    category: "petit-dejeuner",
    image: "/images/boisson-gingembre.webp",
    vegetarian: true,
    vegan: true,
  },
  {
    slug: "bol-fruits",
    name: "Bol de fruits frais",
    description: "Fruits de saison, citron vert et menthe fraîche.",
    priceCents: 450,
    category: "petit-dejeuner",
    image: "/images/dessert-degue.webp",
    vegetarian: true,
    vegan: true,
  },
  {
    slug: "yaourt-granola",
    name: "Yaourt, granola & miel",
    description: "Yaourt nature, granola maison et filet de miel.",
    priceCents: 450,
    category: "petit-dejeuner",
    image: "/images/dessert-degue.webp",
    vegetarian: true,
  },
  {
    slug: "matoke-boeuf",
    name: "Matoke & Bœuf",
    description:
      "Bananes plantains mijotées avec bœuf, tomates et épices douces.",
    priceCents: 1490,
    category: "assiettes",
    image: "/images/matoke.jpg",
    halal: true,
    isNew: true,
  },
  {
    slug: "ugali-grillades",
    name: "Ugali & Grillades",
    description:
      "Ugali fondant, grillades marinées et sauce arachide relevée.",
    priceCents: 1590,
    category: "assiettes",
    image: "/images/ugali.jpg",
    spicy: true,
    isNew: true,
  },
  {
    slug: "muceli-vegetal",
    name: "Muceli Végétalien",
    description:
      "Riz, légumes verts, haricots et sauce maison : généreux et 100% végétal.",
    priceCents: 1290,
    category: "assiettes",
    image: "/images/muceli.jpg",
    vegetarian: true,
    vegan: true,
    isNew: true,
  },
];

type ExpansionProduct = SeedProduct & { categorySlug: string };

const EXPANSION_PRODUCTS: ExpansionProduct[] = [
  {
    slug: "poulet-braise-gingembre",
    name: "Poulet braisé au gingembre",
    description: "Poulet mariné au gingembre, riz parfumé et légumes sautés.",
    priceCents: 1490,
    category: "assiettes",
    categorySlug: "assiettes",
    image: "/images/assiette-poulet.webp",
    halal: true,
  },
  {
    slug: "poisson-entier-grille",
    name: "Poisson entier grillé",
    description: "Poisson entier braisé, sauce citron-gingembre et plantain doré.",
    priceCents: 1690,
    category: "assiettes",
    categorySlug: "assiettes",
    image: "/images/assiette-thieb.webp",
    spicy: true,
  },
  {
    slug: "brochettes-boeuf-marinees",
    name: "Brochettes de bœuf marinées",
    description: "Brochettes de bœuf marinées, sauce arachide et oignons grillés.",
    priceCents: 1590,
    category: "assiettes",
    categorySlug: "assiettes",
    image: "/images/ugali.jpg",
    halal: true,
    spicy: true,
  },
  {
    slug: "riz-coco-legumes",
    name: "Riz coco & légumes sautés",
    description: "Riz au lait de coco, légumes sautés et herbes fraîches.",
    priceCents: 1290,
    category: "assiettes",
    categorySlug: "assiettes",
    image: "/images/muceli.jpg",
    vegetarian: true,
    vegan: true,
  },
  {
    slug: "haricots-verts-palmiste",
    name: "Haricots verts au palmiste",
    description: "Haricots verts fondants au palmiste, tomates et épices douces.",
    priceCents: 1190,
    category: "assiettes",
    categorySlug: "assiettes",
    image: "/images/muceli.jpg",
    vegetarian: true,
    vegan: true,
  },
  {
    slug: "plantain-frit-avocat",
    name: "Plantain frit & avocat",
    description: "Plantain frit, avocat frais et sauce tomate-gingembre.",
    priceCents: 990,
    category: "assiettes",
    categorySlug: "assiettes",
    image: "/images/assiette-plantain.webp",
    vegetarian: true,
    vegan: true,
  },
  {
    slug: "samoussas-legumes",
    name: "Samoussas aux légumes",
    description: "Samoussas croustillants aux légumes, servis avec une sauce tamarin.",
    priceCents: 650,
    category: "assiettes",
    categorySlug: "assiettes",
    image: "/images/assiette-plantain.webp",
    vegetarian: true,
  },
  {
    slug: "beignets-banane",
    name: "Beignets de banane",
    description: "Beignets de banane moelleux, saupoudrés de sucre.",
    priceCents: 550,
    category: "desserts",
    categorySlug: "desserts",
    image: "/images/dessert-fondant.webp",
    vegetarian: true,
  },
  {
    slug: "salade-mangue-avocat",
    name: "Salade mangue, avocat & arachides",
    description: "Mangue fraîche, avocat, arachides concassées et citron vert.",
    priceCents: 1090,
    category: "assiettes",
    categorySlug: "assiettes",
    image: "/images/dessert-degue.webp",
    vegetarian: true,
    vegan: true,
  },
  {
    slug: "jus-tamarin",
    name: "Jus de tamarin",
    description: "Jus de tamarin frais, légèrement acidulé.",
    priceCents: 390,
    category: "boissons",
    categorySlug: "boissons",
    image: "/images/boisson-bissap.webp",
    vegetarian: true,
    vegan: true,
  },
];

async function ensureCategorySchedules(): Promise<Map<string, string>> {
  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    const patch: Record<string, string> = {};
    if (!row.image && category.image) patch.image = category.image;
    if (!row.availableFrom && category.availableFrom) patch.availableFrom = category.availableFrom;
    if (!row.availableTo && category.availableTo) patch.availableTo = category.availableTo;
    if (Object.keys(patch).length) {
      await prisma.category.update({ where: { id: row.id }, data: patch });
    }
    categoryIds.set(category.slug, row.id);
  }
  return categoryIds;
}

async function seedCatalog(categoryIds: Map<string, string>) {
  const flag = await prisma.setting.findUnique({ where: { key: DEMO_FLAG } });
  if (flag?.value === "1") return;

  const protein = await prisma.optionGroup.upsert({
    where: { id: "seed-group-protein" },
    update: {},
    create: {
      id: "seed-group-protein",
      name: "Protéine",
      type: "single",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 0,
      choices: {
        create: [
          { id: "seed-choice-poulet", name: "Poulet mariné", priceDeltaCents: 0, sortOrder: 0 },
          { id: "seed-choice-boeuf", name: "Bœuf mijoté", priceDeltaCents: 150, sortOrder: 1 },
          { id: "seed-choice-poisson", name: "Poisson braisé", priceDeltaCents: 250, sortOrder: 2 },
          { id: "seed-choice-vege", name: "Légumes & pois chiches", priceDeltaCents: -100, sortOrder: 3 },
        ],
      },
    },
    include: { choices: true },
  });

  const sauce = await prisma.optionGroup.upsert({
    where: { id: "seed-group-sauce" },
    update: {},
    create: {
      id: "seed-group-sauce",
      name: "Sauce",
      type: "single",
      required: false,
      minSelections: 0,
      maxSelections: 1,
      sortOrder: 1,
      choices: {
        create: [
          { id: "seed-choice-yassa", name: "Yassa citronnée", priceDeltaCents: 0, sortOrder: 0 },
          { id: "seed-choice-mafe-sauce", name: "Mafé arachide", priceDeltaCents: 0, sortOrder: 1 },
          { id: "seed-choice-tomate", name: "Tomate-gingembre", priceDeltaCents: 0, sortOrder: 2 },
          { id: "seed-choice-piment", name: "Piment doux", priceDeltaCents: 50, sortOrder: 3 },
        ],
      },
    },
    include: { choices: true },
  });

  const extras = await prisma.optionGroup.upsert({
    where: { id: "seed-group-extras" },
    update: {},
    create: {
      id: "seed-group-extras",
      name: "Suppléments",
      type: "multiple",
      required: false,
      minSelections: 0,
      maxSelections: 3,
      sortOrder: 2,
      choices: {
        create: [
          { id: "seed-choice-avocat", name: "Avocat", priceDeltaCents: 150, sortOrder: 0 },
          { id: "seed-choice-plantain", name: "Plantain doré", priceDeltaCents: 200, sortOrder: 1 },
          { id: "seed-choice-oeuf", name: "Œuf", priceDeltaCents: 100, sortOrder: 2 },
          { id: "seed-choice-piment-fort", name: "Piment fort", priceDeltaCents: 50, sortOrder: 3 },
        ],
      },
    },
    include: { choices: true },
  });

  const drinkSize = await prisma.optionGroup.upsert({
    where: { id: "seed-group-drink-size" },
    update: {},
    create: {
      id: "seed-group-drink-size",
      name: "Taille",
      type: "single",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 0,
      choices: {
        create: [
          { id: "seed-choice-33", name: "33 cl", priceDeltaCents: 0, sortOrder: 0 },
          { id: "seed-choice-50", name: "50 cl", priceDeltaCents: 100, sortOrder: 1 },
        ],
      },
    },
    include: { choices: true },
  });

  for (const product of products) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) continue;
    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        categoryId,
        image: product.image,
        vegetarian: product.vegetarian ?? false,
        vegan: product.vegan ?? false,
        spicy: product.spicy ?? false,
        halal: product.halal ?? false,
        isNew: product.isNew ?? false,
        sortOrder: products.filter((p) => p.category === product.category).indexOf(product),
      },
    });

    const groups: [string, number][] =
      product.category === "boissons"
        ? [[drinkSize.id, 0]]
        : product.category === "desserts" || product.category === "petit-dejeuner"
          ? []
          : [
              [protein.id, 0],
              [sauce.id, 1],
              [extras.id, 2],
            ];

    for (const [optionGroupId, sortOrder] of groups) {
      await prisma.productOptionGroup.upsert({
        where: {
          productId_optionGroupId: { productId: created.id, optionGroupId },
        },
        update: {},
        create: { productId: created.id, optionGroupId, sortOrder },
      });
    }
  }

  await prisma.setting.upsert({
    where: { key: DEMO_FLAG },
    update: { value: "1" },
    create: { key: DEMO_FLAG, value: "1" },
  });
}

const SERVICE_PRODUCT_SLUGS = [
  "rituel-du-matin",
  "the-citronne",
  "cookie-maison",
  "cafe-noir",
  "cafe-au-lait",
  "chocolat-chaud",
  "jus-orange",
  "bol-fruits",
  "yaourt-granola",
  "matoke-boeuf",
  "ugali-grillades",
  "muceli-vegetal",
];

async function seedServiceCatalog(categoryIds: Map<string, string>) {
  const flag = await prisma.setting.findUnique({ where: { key: "serviceMenuSeeded" } });
  if (flag?.value === "2") return;
  let index = 0;
  for (const product of products) {
    if (!SERVICE_PRODUCT_SLUGS.includes(product.slug)) continue;
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) continue;
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        categoryId,
        image: product.image,
        vegetarian: product.vegetarian ?? false,
        vegan: product.vegan ?? false,
        spicy: product.spicy ?? false,
        halal: product.halal ?? false,
        isNew: product.isNew ?? false,
        sortOrder: 100 + index,
      },
    });
    index += 1;
  }
  await prisma.setting.upsert({
    where: { key: "serviceMenuSeeded" },
    update: { value: "2" },
    create: { key: "serviceMenuSeeded", value: "2" },
  });
}

async function seedMenuExpansion(categoryIds: Map<string, string>) {
  const flag = await prisma.setting.findUnique({ where: { key: "menuExpansionSeeded" } });
  if (flag?.value === "1") return;
  let index = 0;
  for (const product of EXPANSION_PRODUCTS) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) continue;
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        categoryId,
        image: product.image,
        vegetarian: product.vegetarian ?? false,
        vegan: product.vegan ?? false,
        spicy: product.spicy ?? false,
        halal: product.halal ?? false,
        isNew: product.isNew ?? false,
        sortOrder: 200 + index,
      },
    });
    index += 1;
  }
  await prisma.setting.upsert({
    where: { key: "menuExpansionSeeded" },
    update: { value: "1" },
    create: { key: "menuExpansionSeeded", value: "1" },
  });
}

async function ensureDietFlags() {
  const veganSlugs = [
    "bowl-vegetarien",
    "assiette-plantain-haricots",
    "bissap-maison",
    "gingembre-tonique",
    "eau-minerale",
    "the-citronne",
    "cafe-noir",
    "jus-orange",
    "bol-fruits",
    "riz-coco-legumes",
    "haricots-verts-palmiste",
    "plantain-frit-avocat",
    "salade-mangue-avocat",
    "jus-tamarin",
    "muceli-vegetal",
  ];
  await prisma.product.updateMany({
    where: { slug: { in: veganSlugs } },
    data: { vegan: true },
  });
}

async function main() {
  await ensureInitialAdmin();
  await ensureSettings();
  await ensureTables();
  const categoryIds = await ensureCategorySchedules();
  await seedCatalog(categoryIds);
  await seedServiceCatalog(categoryIds);
  await seedMenuExpansion(categoryIds);
  await ensureDietFlags();
  console.log("Seed terminé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
