import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Metric, Panel } from "./components/bits";
import { Shell } from "./components/shell";
import {
  CHANNELS,
  DEFAULT_FILTERS,
  channelMix,
  cityMix,
  cohorts,
  forecast,
  kpis,
  ltvByChannel,
  monthly,
  promoLift,
  repeatLadder,
  rfm,
  skuMix,
  type Filters,
} from "./lib/engine";
import { intish, pct, rupees } from "./lib/format";
import { MONTHS, buildPanel, monthLabel } from "./lib/panel";

const panel = buildPanel();
const tick = { fill: "var(--color-muted)", fontSize: 12 };

export function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const view = useMemo(() => {
    return {
      k: kpis(panel, filters),
      rfm: rfm(panel, filters),
      cohorts: cohorts(panel, filters),
      ltv: ltvByChannel(panel, filters),
      ladder: repeatLadder(panel, filters),
      monthly: monthly(panel, filters),
      channels: channelMix(panel, filters),
      skus: skuMix(panel, filters),
      cities: cityMix(panel, filters),
      forecast: forecast(panel, filters),
      promo: promoLift(panel, filters),
    };
  }, [filters]);

  return (
    <Shell project="Consumer analytics">
      <header className="max-w-3xl">
        <p className="text-xs tracking-widest text-teal uppercase">D2C oral care · 18 months</p>
        <h1 className="mt-2 text-4xl leading-tight md:text-5xl">Who buys, who comes back, what it is worth</h1>
        <p className="mt-4 text-muted md:text-lg">
          {intish(panel.customers.length)} buyers and {intish(panel.orders.length)} orders, drawn from a
          seeded panel. Move the window or the channel and every figure recomputes.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <label className="text-sm text-muted">
          Channel
          <select
            className="ml-2 border border-line bg-paper px-2 py-1 text-ink"
            value={filters.channel}
            onChange={(e) => setFilters({ ...filters, channel: e.target.value as Filters["channel"] })}
          >
            <option>All</option>
            {CHANNELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          From
          <select
            className="ml-2 border border-line bg-paper px-2 py-1 text-ink"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: Number(e.target.value) })}
          >
            {Array.from({ length: MONTHS }, (_, i) => (
              <option key={i} value={i}>
                {monthLabel(i)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          To
          <select
            className="ml-2 border border-line bg-paper px-2 py-1 text-ink"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: Number(e.target.value) })}
          >
            {Array.from({ length: MONTHS }, (_, i) => (
              <option key={i} value={i}>
                {monthLabel(i)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Revenue" value={rupees(view.k.revenue, 0)} />
        <Metric label="Buyers" value={intish(view.k.buyers)} hint={`${intish(view.k.orders)} orders`} />
        <Metric label="AOV" value={rupees(view.k.aov, 0)} />
        <Metric label="Repeat rate" value={pct(view.k.repeatRate)} hint={`${pct(view.k.active90)} active in last 3 months`} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Panel title="Revenue, new and returning">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={view.monthly}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="label" tick={tick} />
                <YAxis tick={tick} width={48} />
                <Tooltip />
                <Line dataKey="revenue" stroke="var(--color-teal)" dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Repeat ladder">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view.ladder}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="orders" tick={tick} />
                <YAxis tick={tick} width={40} />
                <Tooltip />
                <Bar dataKey="buyers" fill="var(--color-ink)" name="Buyers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Panel title="RFM">
          <table className="w-full text-sm">
            <tbody>
              {view.rfm.map((r) => (
                <tr key={r.name} className="border-t border-line">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-right tabular-nums">{intish(r.buyers)}</td>
                  <td className="py-2 text-right tabular-nums">{pct(r.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="LTV by channel">
          <table className="w-full text-sm">
            <tbody>
              {view.ltv.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="py-2">{r.label}</td>
                  <td className="py-2 text-right tabular-nums">{intish(r.buyers)}</td>
                  <td className="py-2 text-right tabular-nums">{rupees(r.ltv, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Cohort retention">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted">
                <th className="py-1 text-left">Cohort</th>
                <th className="py-1 text-right">n</th>
                {Array.from({ length: 8 }, (_, i) => (
                  <th key={i} className="py-1 text-right">
                    M{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.cohorts.slice(-10).map((c) => (
                <tr key={c.acquired} className="border-t border-line">
                  <td className="py-1">{c.label}</td>
                  <td className="py-1 text-right tabular-nums">{c.size}</td>
                  {Array.from({ length: 8 }, (_, i) => (
                    <td key={i} className="py-1 text-right tabular-nums">
                      {c.rates[i] == null ? "" : pct(c.rates[i] as number, 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <Mix title="Channel" rows={view.channels} />
        <Mix title="SKU" rows={view.skus} />
        <Mix title="City" rows={view.cities} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Panel title="Promo">
          <p className="text-sm text-muted">
            {pct(view.promo.promoShare)} of orders are on promo. Promo AOV {rupees(view.promo.promoAov, 0)} against{" "}
            {rupees(view.promo.fullAov, 0)} at full price.
          </p>
        </Panel>
        <Panel title="Next three months">
          <ul className="text-sm">
            {view.forecast.map((p) => (
              <li key={p.label} className="flex justify-between border-t border-line py-2">
                <span>{p.label}</span>
                <span className="tabular-nums">{rupees(p.revenue, 0)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Shell>
  );
}

function Mix({ title, rows }: { title: string; rows: { name: string; revenue: number; orders: number }[] }) {
  return (
    <Panel title={title}>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-line">
              <td className="py-2">{r.name}</td>
              <td className="py-2 text-right tabular-nums">{rupees(r.revenue, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
