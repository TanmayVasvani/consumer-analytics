import { describe, expect, it } from "vitest";
import { buildPanel } from "./panel";
import { cohorts, forecast, kpis, ltvByChannel, rfm } from "./engine";

const panel = buildPanel(7, 400);

describe("panel", () => {
  it("is reproducible", () => {
    const a = buildPanel(7, 200);
    const b = buildPanel(7, 200);
    expect(a.orders.length).toBe(b.orders.length);
    expect(a.orders[0]?.price).toBe(b.orders[0]?.price);
  });

  it("keeps every order inside the window", () => {
    for (const o of panel.orders) {
      expect(o.month).toBeGreaterThanOrEqual(0);
      expect(o.month).toBeLessThan(18);
      expect(o.qty).toBeGreaterThan(0);
    }
  });
});

describe("engine", () => {
  const f = { channel: "All" as const, from: 0, to: 17 };

  it("balances revenue with buyers", () => {
    const k = kpis(panel, f);
    expect(k.orders).toBe(panel.orders.length);
    expect(k.buyers).toBeGreaterThan(0);
    expect(k.revenue).toBeGreaterThan(0);
    expect(k.aov).toBeCloseTo(k.revenue / k.orders, 6);
    expect(k.repeatRate).toBeGreaterThan(0);
    expect(k.repeatRate).toBeLessThan(1);
  });

  it("puts every buyer in one RFM bucket", () => {
    const rows = rfm(panel, f);
    const buyers = rows.reduce((s, r) => s + r.buyers, 0);
    expect(buyers).toBe(kpis(panel, f).buyers);
    expect(rows.some((r) => r.name === "Champions" || r.name === "Loyal")).toBe(true);
  });

  it("starts each cohort at its acquisition month", () => {
    const rows = cohorts(panel, f);
    expect(rows.length).toBeGreaterThan(3);
    for (const row of rows) expect(row.rates[0]).toBeGreaterThan(0.5);
  });

  it("reports LTV for every channel", () => {
    const rows = ltvByChannel(panel, f);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.ltv >= 0)).toBe(true);
  });

  it("forecasts three months", () => {
    expect(forecast(panel, f)).toHaveLength(3);
  });
});
