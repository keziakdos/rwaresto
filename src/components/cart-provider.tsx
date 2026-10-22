"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartOption = {
  groupId: string;
  groupName: string;
  choiceId: string;
  choiceName: string;
  priceDeltaCents: number;
};

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  image: string | null;
  basePriceCents: number;
  unitPriceCents: number;
  quantity: number;
  note: string;
  options: CartOption[];
};

export type AddToCartInput = {
  productId: string;
  name: string;
  image: string | null;
  basePriceCents: number;
  unitPriceCents: number;
  quantity: number;
  note?: string;
  options: CartOption[];
};

type CartState = {
  lines: CartLine[];
  mode: "dine_in" | "takeaway";
  tableNumber: number | null;
};

type CartContextValue = CartState & {
  hydrated: boolean;
  count: number;
  subtotalCents: number;
  addItem: (input: AddToCartInput) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  setMode: (mode: "dine_in" | "takeaway") => void;
  setTableNumber: (table: number | null) => void;
};

const CART_KEY = "rwaresto_cart_v1";
const CART_TTL_MS = 6 * 60 * 60 * 1000;
const CartContext = createContext<CartContextValue | null>(null);

function lineKey(input: AddToCartInput): string {
  const choices = [...input.options.map((option) => option.choiceId)].sort().join(",");
  return `${input.productId}|${choices}|${(input.note || "").trim()}`;
}

type StoredCart = CartState & { expiresAt: number };

function readCart(): CartState {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { lines: [], mode: "dine_in", tableNumber: null };
    const stored = JSON.parse(raw) as StoredCart;
    if (!stored.expiresAt || stored.expiresAt < Date.now()) {
      localStorage.removeItem(CART_KEY);
      return { lines: [], mode: "dine_in", tableNumber: null };
    }
    return {
      lines: Array.isArray(stored.lines) ? stored.lines : [],
      mode: stored.mode === "takeaway" ? "takeaway" : "dine_in",
      tableNumber: typeof stored.tableNumber === "number" ? stored.tableNumber : null,
    };
  } catch {
    return { lines: [], mode: "dine_in", tableNumber: null };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>({
    lines: [],
    mode: "dine_in",
    tableNumber: null,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const stored: StoredCart = { ...state, expiresAt: Date.now() + CART_TTL_MS };
      localStorage.setItem(CART_KEY, JSON.stringify(stored));
    } catch {
      // Le stockage peut être indisponible en navigation privée.
    }
  }, [state, hydrated]);

  const addItem = useCallback((input: AddToCartInput) => {
    setState((current) => {
      const key = lineKey(input);
      const existing = current.lines.find((line) => line.key === key);
      if (existing) {
        return {
          ...current,
          lines: current.lines.map((line) =>
            line.key === key
              ? { ...line, quantity: Math.min(20, line.quantity + input.quantity) }
              : line,
          ),
        };
      }
      return {
        ...current,
        lines: [
          ...current.lines,
          {
            key,
            productId: input.productId,
            name: input.name,
            image: input.image,
            basePriceCents: input.basePriceCents,
            unitPriceCents: input.unitPriceCents,
            quantity: Math.max(1, Math.min(20, input.quantity)),
            note: input.note?.trim() || "",
            options: input.options,
          },
        ],
      };
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setState((current) => ({
      ...current,
      lines:
        quantity <= 0
          ? current.lines.filter((line) => line.key !== key)
          : current.lines.map((line) =>
              line.key === key ? { ...line, quantity: Math.min(20, quantity) } : line,
            ),
    }));
  }, []);

  const removeItem = useCallback((key: string) => {
    setState((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== key),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState((current) => ({ ...current, lines: [] }));
    try {
      localStorage.removeItem(CART_KEY);
    } catch {
      // ignore
    }
  }, []);

  const setMode = useCallback((mode: "dine_in" | "takeaway") => {
    setState((current) => ({
      ...current,
      mode,
      tableNumber: mode === "takeaway" ? null : current.tableNumber,
    }));
  }, []);

  const setTableNumber = useCallback((tableNumber: number | null) => {
    setState((current) => ({ ...current, tableNumber }));
  }, []);

  const count = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalCents = state.lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      count,
      subtotalCents,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      setMode,
      setTableNumber,
    }),
    [
      state,
      hydrated,
      count,
      subtotalCents,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      setMode,
      setTableNumber,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider absent");
  return context;
}

export function getClientId(): string {
  try {
    const existing = localStorage.getItem("rwaresto_client_id");
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem("rwaresto_client_id", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function getSavedName(): string {
  try {
    return localStorage.getItem("rwaresto_customer_name") || "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem("rwaresto_customer_name", name);
  } catch {
    // ignore
  }
}

export type TrackedOrder = {
  id: string;
  token: string;
  orderNumber: string;
  status: string;
  createdAt: string;
};

export function getTrackedOrders(): TrackedOrder[] {
  try {
    const raw = localStorage.getItem("rwaresto_orders");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrackedOrder[];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function trackOrder(order: TrackedOrder) {
  try {
    const orders = getTrackedOrders().filter((item) => item.id !== order.id);
    localStorage.setItem("rwaresto_orders", JSON.stringify([order, ...orders].slice(0, 10)));
  } catch {
    // ignore
  }
}
