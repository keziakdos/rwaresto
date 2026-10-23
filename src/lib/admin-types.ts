export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  availableFromDate: string | null;
  availableToDate: string | null;
  sortOrder: number;
  active: boolean;
  _count: { products: number };
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  image: string | null;
  categoryId: string;
  available: boolean;
  hidden: boolean;
  archived: boolean;
  vegetarian: boolean;
  vegan: boolean;
  spicy: boolean;
  halal: boolean;
  isNew: boolean;
  sortOrder: number;
  category: { id: string; name: string };
  optionGroups: { optionGroupId: string }[];
  _count: { orderItems: number };
};

export type AdminOptionChoice = {
  id: string;
  name: string;
  priceDeltaCents: number;
  available: boolean;
  sortOrder: number;
};

export type AdminOptionGroup = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  choices: AdminOptionChoice[];
  _count?: { products: number };
};

export type AdminCatalog = {
  categories: AdminCategory[];
  products: AdminProduct[];
  optionGroups: AdminOptionGroup[];
};
