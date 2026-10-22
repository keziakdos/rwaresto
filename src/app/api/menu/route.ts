import { prisma } from "@/lib/db";
import { json, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          where: { archived: false, hidden: false },
          orderBy: { sortOrder: "asc" },
          include: {
            optionGroups: {
              orderBy: { sortOrder: "asc" },
              include: {
                optionGroup: {
                  include: {
                    choices: {
                      where: { available: true },
                      orderBy: { sortOrder: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        products: category.products.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          image: product.image,
          available: product.available,
          badges: {
            vegetarian: product.vegetarian,
            spicy: product.spicy,
            halal: product.halal,
            isNew: product.isNew,
          },
          optionGroups: product.optionGroups.map(({ optionGroup }) => ({
            id: optionGroup.id,
            name: optionGroup.name,
            type: optionGroup.type,
            required: optionGroup.required,
            minSelections: optionGroup.minSelections,
            maxSelections: optionGroup.maxSelections,
            choices: optionGroup.choices.map((choice) => ({
              id: choice.id,
              name: choice.name,
              priceDeltaCents: choice.priceDeltaCents,
              available: choice.available,
            })),
          })),
        })),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
