import { CHANNELS, CITIES, MONTHS, SKUS, monthLabel, type Channel, type Order, type Panel, type SkuId } from "./panel";

export type Filters = { channel: Channel | "All"; from: number; to: number };

export const DEFAULT_FILTERS: Filters = { channel: "All", from: 0, to: MONTHS - 1 };

export function inWindow(order: Order, f: Filters): boolean {
  if (order.month < f.from || order.month > f.to) return false;
  if (f.channel !== "All" && order.channel !== f.channel) return false;
  return true;
}

export function filteredOrders(panel: Panel, f: Filters): Order[] {
  return panel.orders.filter((o) => inWindow(o, f));
}

export type Kpis = {
  revenue: number;
  contribution: number;
  orders: number;
  buyers: number;
  aov: number;
  repeatRate: number;
  active90: number;
  units: number;
};

export function kpis(panel: Panel, f: Filters): Kpis {
  const orders = filteredOrders(panel, f);
  const byBuyer = new Map<number, number>();
  let revenue = 0;
  let contribution = 0;
  let units = 0;
  for (const o of orders) {
    const line = o.price * o.qty;
    revenue += line;
    contribution += (o.price - o.cost) * o.qty;
    units += o.qty;
    byBuyer.set(o.customerId, (byBuyer.get(o.customerId) ?? 0) + 1);
  }
  const buyers = byBuyer.size;
  const repeat = [...byBuyer.values()].filter((n) => n >= 2).length;
  const cutoff = f.to - 2;
  const active = new Set(orders.filter((o) => o.month >= cutoff).map((o) => o.customerId)).size;
  return {
    revenue,
    contribution,
    orders: orders.length,
    buyers,
    aov: orders.length ? revenue / orders.length : 0,
    repeatRate: buyers ? repeat / buyers : 0,
    active90: buyers ? active / buyers : 0,
    units,
  };
}

export type RfmRow = { name: string; buyers: number; revenue: number; share: number };

export function rfm(panel: Panel, f: Filters): RfmRow[] {
  const orders = filteredOrders(panel, f);
  const rec = new Map<number, number>();
  const freq = new Map<number, number>();
  const mon = new Map<number, number>();
  for (const o of orders) {
    rec.set(o.customerId, Math.max(rec.get(o.customerId) ?? 0, o.month));
    freq.set(o.customerId, (freq.get(o.customerId) ?? 0) + 1);
    mon.set(o.customerId, (mon.get(o.customerId) ?? 0) + o.price * o.qty);
  }
  const buckets = new Map<string, { buyers: number; revenue: number }>();
  const add = (name: string, revenue: number) => {
    const b = buckets.get(name) ?? { buyers: 0, revenue: 0 };
    b.buyers += 1;
    b.revenue += revenue;
    buckets.set(name, b);
  };
  for (const [id, last] of rec) {
    const age = f.to - last;
    const n = freq.get(id) ?? 1;
    const spend = mon.get(id) ?? 0;
    let name = "New";
    if (n >= 3 && age <= 2) name = "Champions";
    else if (n >= 2 && age <= 3) name = "Loyal";
    else if (n === 1 && age <= 1) name = "New";
    else if (age >= 5) name = "Lost";
    else if (age >= 3) name = "At risk";
    else name = "Promising";
    add(name, spend);
  }
  const total = [...buckets.values()].reduce((s, b) => s + b.revenue, 0);
  const order = ["Champions", "Loyal", "Promising", "New", "At risk", "Lost"];
  return order
    .filter((name) => buckets.has(name))
    .map((name) => {
      const b = buckets.get(name) as { buyers: number; revenue: number };
      return { name, buyers: b.buyers, revenue: b.revenue, share: total ? b.revenue / total : 0 };
    });
}

export type Cohort = { acquired: number; label: string; size: number; rates: number[] };

export function cohorts(panel: Panel, f: Filters): Cohort[] {
  const orders = filteredOrders(panel, f);
  const byCustomer = new Map<number, number[]>();
  for (const o of orders) {
    const list = byCustomer.get(o.customerId) ?? [];
    list.push(o.month);
    byCustomer.set(o.customerId, list);
  }
  const rows: Cohort[] = [];
  for (let m = f.from; m <= f.to; m++) {
    const members = panel.customers.filter(
      (c) => c.acquired === m && (f.channel === "All" || c.channel === f.channel),
    );
    if (!members.length) continue;
    const rates: number[] = [];
    for (let k = 0; m + k <= f.to; k++) {
      const alive = members.filter((c) => (byCustomer.get(c.id) ?? []).includes(m + k)).length;
      rates.push(alive / members.length);
    }
    rows.push({ acquired: m, label: monthLabel(m), size: members.length, rates });
  }
  return rows;
}

export type Ltv = { label: string; buyers: number; revenue: number; ltv: number };

export function ltvByChannel(panel: Panel, f: Filters): Ltv[] {
  const orders = filteredOrders(panel, f);
  const spend = new Map<string, Map<number, number>>();
  for (const ch of CHANNELS) spend.set(ch, new Map());
  for (const o of orders) {
    const map = spend.get(o.channel);
    if (!map) continue;
    map.set(o.customerId, (map.get(o.customerId) ?? 0) + o.price * o.qty);
  }
  return CHANNELS.filter((ch) => f.channel === "All" || f.channel === ch).map((ch) => {
    const map = spend.get(ch) as Map<number, number>;
    const buyers = map.size;
    const revenue = [...map.values()].reduce((s, n) => s + n, 0);
    return { label: ch, buyers, revenue, ltv: buyers ? revenue / buyers : 0 };
  });
}

export function repeatLadder(panel: Panel, f: Filters): { orders: string; buyers: number }[] {
  const counts = new Map<number, number>();
  for (const o of filteredOrders(panel, f)) {
    counts.set(o.customerId, (counts.get(o.customerId) ?? 0) + 1);
  }
  const bins = [0, 0, 0, 0];
  for (const n of counts.values()) {
    if (n === 1) bins[0] = (bins[0] ?? 0) + 1;
    else if (n === 2) bins[1] = (bins[1] ?? 0) + 1;
    else if (n === 3) bins[2] = (bins[2] ?? 0) + 1;
    else bins[3] = (bins[3] ?? 0) + 1;
  }
  return [
    { orders: "1", buyers: bins[0] ?? 0 },
    { orders: "2", buyers: bins[1] ?? 0 },
    { orders: "3", buyers: bins[2] ?? 0 },
    { orders: "4+", buyers: bins[3] ?? 0 },
  ];
}

export type MonthPoint = { month: number; label: string; revenue: number; newBuyers: number; returning: number };

export function monthly(panel: Panel, f: Filters): MonthPoint[] {
  const points: MonthPoint[] = [];
  const seen = new Set<number>();
  for (let m = f.from; m <= f.to; m++) {
    const slice = filteredOrders(panel, { ...f, from: m, to: m });
    let revenue = 0;
    const buyers = new Set<number>();
    for (const o of slice) {
      revenue += o.price * o.qty;
      buyers.add(o.customerId);
    }
    let fresh = 0;
    let back = 0;
    for (const id of buyers) {
      if (seen.has(id)) back += 1;
      else fresh += 1;
      seen.add(id);
    }
    points.push({ month: m, label: monthLabel(m), revenue, newBuyers: fresh, returning: back });
  }
  return points;
}

export type MixRow = { name: string; revenue: number; orders: number; contribution: number };

export function channelMix(panel: Panel, f: Filters): MixRow[] {
  return group(filteredOrders(panel, f), (o) => o.channel);
}

export function skuMix(panel: Panel, f: Filters): MixRow[] {
  return group(filteredOrders(panel, f), (o) => SKUS.find((s) => s.id === o.sku)?.name ?? o.sku);
}

export function cityMix(panel: Panel, f: Filters): MixRow[] {
  return group(filteredOrders(panel, f), (o) => o.city).slice(0, 8);
}

function group(orders: Order[], key: (o: Order) => string): MixRow[] {
  const map = new Map<string, MixRow>();
  for (const o of orders) {
    const name = key(o);
    const row = map.get(name) ?? { name, revenue: 0, orders: 0, contribution: 0 };
    row.revenue += o.price * o.qty;
    row.contribution += (o.price - o.cost) * o.qty;
    row.orders += 1;
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export type Forecast = { label: string; revenue: number };

export function forecast(panel: Panel, f: Filters): Forecast[] {
  const series = monthly(panel, f).map((p) => p.revenue);
  const n = series.length;
  if (n < 3) return [];
  const recent = series.slice(-6);
  const avg = recent.reduce((s, n) => s + n, 0) / recent.length;
  const first = recent[0] ?? avg;
  const last = recent[recent.length - 1] ?? avg;
  const slope = (last - first) / Math.max(1, recent.length - 1);
  return [1, 2, 3].map((k) => ({
    label: monthLabel(f.to + k),
    revenue: Math.max(0, avg + slope * k),
  }));
}

export function promoLift(panel: Panel, f: Filters): { promoAov: number; fullAov: number; promoShare: number } {
  const orders = filteredOrders(panel, f);
  const promo = orders.filter((o) => o.promo);
  const full = orders.filter((o) => !o.promo);
  const avg = (list: Order[]) =>
    list.length ? list.reduce((s, o) => s + o.price * o.qty, 0) / list.length : 0;
  return {
    promoAov: avg(promo),
    fullAov: avg(full),
    promoShare: orders.length ? promo.length / orders.length : 0,
  };
}

export { CHANNELS, CITIES, MONTHS, SKUS, monthLabel };
export type { Channel, SkuId };
