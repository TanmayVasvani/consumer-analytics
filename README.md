# Consumer analytics

RFM, cohort retention, LTV, repeat rate, channel and SKU mix, city mix, promo response and a three-month revenue forecast. Everything is computed in the browser from a seeded panel of 3,200 D2C buyers over 18 months.

**Live:** https://tanmayvasvani.github.io/consumer-analytics/ · **Author:** Tanmay Vaswani

## What it does

- **Overview:** revenue, buyers, AOV, repeat rate, share active in the last three months.
- **RFM:** Champions, Loyal, Promising, New, At risk, Lost.
- **Cohorts:** monthly acquisition cohorts and retention through month 7.
- **LTV by channel:** Site, Amazon, Flipkart, Modern trade.
- **Repeat ladder:** buyers on 1, 2, 3 and 4+ orders.
- **Mix:** channel, SKU and city, by revenue.
- **Promo:** share of orders on discount, and AOV against full price.
- **Forecast:** next three months from the recent trend.

Channel and date window recompute every figure.

## Run it

```bash
npm install
npm run dev
npm test
npm run build
```

Requires Node 20 or newer. The build is a static site in `dist/`.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, Vitest. The panel and the metrics are in `src/lib` with no data dependencies.

## Data

The panel is synthetic and seeded. Cities, channels and SKUs are labels on that panel.

## License

MIT
