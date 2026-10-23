import { prisma } from "@/lib/db";
import { json, handleApiError } from "@/lib/api";
import { getOpenState, getSettings, isWithinDateRange, isWithinWindow } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    const openState = getOpenState(settings);
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

    const dated = categories.filter((category) =>
      isWithinDateRange(category.availableFromDate, category.availableToDate),
    );
    const scheduled = openState.isOpen
      ? dated.filter((category) =>
          isWithinWindow(category.availableFrom, category.availableTo),
        )
      : dated;
    const visible = scheduled.length ? scheduled : dated;
    const breakfast = openState.isOpen && visible.some((category) => category.slug === "petit-dejeuner");
    const service = !openState.isOpen
      ? {
          mode: "closed" as const,
          label: "Commandes fermées",
          note: settings.hoursText,
        }
      : breakfast
        ? {
            mode: "breakfast" as const,
            label: "Petit-déjeuner",
            note: "Servi de 9h à 11h · la carte complète arrive à 11h.",
          }
        : {
            mode: "full" as const,
            label: "Carte complète",
            note: "La cuisine vous accueille jusqu'à 01h00.",
          };

    return json({
      service,
      categories: visible.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        availableFrom: category.availableFrom,
        availableTo: category.availableTo,
        availableFromDate: category.availableFromDate,
        availableToDate: category.availableToDate,
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
            vegan: product.vegan,
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
