export type MenuChoice = {
  id: string;
  name: string;
  priceDeltaCents: number;
  available: boolean;
};

export type MenuOptionGroup = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  choices: MenuChoice[];
};

export type MenuProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  image: string | null;
  available: boolean;
  badges: {
    vegetarian: boolean;
    vegan: boolean;
    spicy: boolean;
    halal: boolean;
    isNew: boolean;
  };
  optionGroups: MenuOptionGroup[];
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  availableFromDate: string | null;
  availableToDate: string | null;
  products: MenuProduct[];
};

export type MenuService = {
  mode: "breakfast" | "full" | "closed";
  label: string;
  note: string;
};

export type MenuData = {
  categories: MenuCategory[];
  service: MenuService;
};
