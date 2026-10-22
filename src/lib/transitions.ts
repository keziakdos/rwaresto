import type { OrderStatus } from "./constants";

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  submitted: ["in_progress", "cancelled"],
  in_progress: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: string, to: OrderStatus): boolean {
  if (!(from in ALLOWED)) return false;
  return ALLOWED[from as OrderStatus].includes(to);
}

export const STATUS_ACTION_LABEL: Record<string, string> = {
  in_progress: "Valider",
  ready: "Déclarer prête",
  completed: "Encaisser",
  cancelled: "Annuler",
};
