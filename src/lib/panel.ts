import { mulberry32, normal, pick } from "./rng";

export const AS_OF = "2026-10-01";
export const MONTHS = 18;
export const SEED = 20261030;

export const CHANNELS = ["Site", "Amazon", "Flipkart", "Modern trade"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CITIES = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Delhi", state: "Delhi" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Jaipur", state: "Rajasthan" },
] as const;

export const SKUS = [
  { id: "soft", name: "Soft", price: 149, cost: 42 },
  { id: "medium", name: "Medium", price: 129, cost: 38 },
  { id: "kids", name: "Kids", price: 99, cost: 32 },
  { id: "charcoal", name: "Charcoal", price: 179, cost: 48 },
  { id: "pack3", name: "Pack of 3", price: 349, cost: 110 },
] as const;

export type SkuId = (typeof SKUS)[number]["id"];

export type Order = {
  id: number;
  customerId: number;
  month: number;
  day: number;
  sku: SkuId;
  qty: number;
  price: number;
  cost: number;
  promo: boolean;
  channel: Channel;
  city: string;
  state: string;
};

export type Customer = {
  id: number;
  acquired: number;
  channel: Channel;
  city: string;
  state: string;
  loyalty: number;
};

export type Panel = { customers: Customer[]; orders: Order[] };

const CHANNEL_WEIGHT = [0.42, 0.28, 0.18, 0.12];

function weighted<T>(rng: () => number, items: readonly T[], weights: number[]): T {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i] ?? 0;
    if (r <= acc) return items[i] as T;
  }
  return items[items.length - 1] as T;
}

export function monthLabel(index: number): string {
  const start = new Date(2025, 4, 1);
  const d = new Date(start.getFullYear(), start.getMonth() + index, 1);
  return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

export function buildPanel(seed = SEED, buyers = 3200): Panel {
  const rng = mulberry32(seed);
  const customers: Customer[] = [];
  const orders: Order[] = [];
  let orderId = 1;

  for (let id = 1; id <= buyers; id++) {
    const acquired = Math.min(MONTHS - 1, Math.floor(rng() * rng() * MONTHS));
    const place = pick(rng, CITIES);
    const channel = weighted(rng, CHANNELS, CHANNEL_WEIGHT);
    const loyalty = Math.min(0.85, Math.max(0.05, 0.22 + normal(rng) * 0.12));
    customers.push({ id, acquired, channel, city: place.city, state: place.state, loyalty });

    let month = acquired;
    let first = true;
    while (month < MONTHS) {
      const seasonal = 1 + 0.12 * Math.sin(((month % 12) / 12) * Math.PI * 2);
      const chance = first ? 1 : Math.min(0.8, loyalty * seasonal);
      if (rng() < chance) {
        const sku = weighted(rng, SKUS, [0.28, 0.26, 0.16, 0.18, 0.12]);
        const promo = rng() < 0.18;
        const price = Math.round(sku.price * (promo ? 0.85 : 1));
        const qty = rng() < 0.12 ? 2 : 1;
        orders.push({
          id: orderId++,
          customerId: id,
          month,
          day: 1 + Math.floor(rng() * 28),
          sku: sku.id,
          qty,
          price,
          cost: sku.cost,
          promo,
          channel,
          city: place.city,
          state: place.state,
        });
        first = false;
        month += 1 + Math.floor(rng() * 3);
      } else {
        month += 1;
      }
    }
  }
  return { customers, orders };
}
