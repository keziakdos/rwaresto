export const ORDER_STATUS = {
  submitted: {
    label: "À valider",
    clientLabel: "Envoyée, en attente de validation par la caisse",
    color: "bg-amber-100 text-amber-900 border-amber-200",
    clientColor: "text-amber-800",
  },
  in_progress: {
    label: "En préparation",
    clientLabel: "Validée, en cours de préparation",
    color: "bg-sky-100 text-sky-900 border-sky-200",
    clientColor: "text-sky-800",
  },
  ready: {
    label: "Prête",
    clientLabel: "Prête : venez la chercher et payer à la caisse",
    color: "bg-emerald-100 text-emerald-900 border-emerald-200",
    clientColor: "text-emerald-800",
  },
  completed: {
    label: "Terminée",
    clientLabel: "Terminée, merci !",
    color: "bg-stone-100 text-stone-700 border-stone-200",
    clientColor: "text-stone-700",
  },
  cancelled: {
    label: "Annulée",
    clientLabel: "Annulée",
    color: "bg-red-100 text-red-900 border-red-200",
    clientColor: "text-red-800",
  },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

export const ACTIVE_STATUSES: OrderStatus[] = ["submitted", "in_progress", "ready"];

export const KANBAN_COLUMNS: { status: OrderStatus; title: string; description: string }[] = [
  { status: "submitted", title: "À valider", description: "Nouvelles commandes" },
  { status: "in_progress", title: "En cours", description: "Validées, en préparation" },
  { status: "ready", title: "Prêtes", description: "À retirer et encaisser" },
  { status: "completed", title: "Terminées", description: "Payées aujourd'hui" },
];

export const PAYMENT_METHODS = {
  cash: "Espèces",
  card: "Carte bancaire",
} as const;

export const MODE_LABELS = {
  dine_in: "Sur place",
  takeaway: "À emporter",
} as const;

export const BADGES = {
  vegetarian: { label: "Végétarien", short: "Végé", className: "bg-emerald-50 text-emerald-800" },
  spicy: { label: "Épicé", short: "Épicé", className: "bg-orange-50 text-orange-800" },
  halal: { label: "Halal", short: "Halal", className: "bg-teal-50 text-teal-800" },
  isNew: { label: "Nouveau", short: "Nouveau", className: "bg-rose-50 text-rose-800" },
} as const;

export const ROLE_LABELS = {
  admin: "Administrateur",
  cashier: "Caisse",
} as const;

export const SESSION_COOKIE = "rwaresto_session";
