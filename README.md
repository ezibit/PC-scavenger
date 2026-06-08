# PC Scavenger

A mobile-friendly Vite/React prototype for hunting high-end PC parts and complete systems around Brisbane, Gold Coast, Sunshine Coast, and national freight listings.

## Current status

This is a working front-end prototype with mock marketplace data.

It ranks finds by:

- Free / giveaway priority
- Disgustingly cheap bargains
- Cheap high-end gear
- Discounted or slashed showroom stock
- High-end categories first: GPU, CPU, motherboard, PSU, RAM
- Distance from Calamvale
- Estimated value gap

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Netlify settings

Use these settings when importing this repo into Netlify:

```text
Build command: npm run build
Publish directory: dist
```

## Important note

Real marketplace scanning cannot be done properly from browser-only React because many sources block client-side scraping, require login, have CORS restrictions, or need scheduled background tasks.

The next serious layer should be a backend worker or automation layer that collects listings twice daily and feeds the front-end.

Suggested backend options:

- Netlify Functions + scheduled jobs
- GitHub Actions twice daily
- Supabase database + Edge Functions
- n8n automation
- A small VPS scraper worker

## Priority sources

- Facebook Marketplace
- Gumtree
- eBay Australia
- Grays Auctions
- Pickles Auctions
- AllBids
- OzBargain
- Reddit hardware swap / build sales groups
- Local refurbishers
- University notice boards
- Community giveaway groups
