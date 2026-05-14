# Frontend — React SPA

React 18 · TypeScript · Vite · Tailwind CSS · Leaflet.js

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` in this folder:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

> Default is already `http://localhost:8080/api` — only needed if your backend runs on a different port.

### 3. Start the dev server

```bash
npm run dev
```

App runs at **http://localhost:5173**

---

## Project Structure

```
src/
├── api/
│   └── axios.ts            # Axios instance — attaches JWT to every request
├── components/
│   ├── AiRouteModal.tsx    # AI itinerary generation UI
│   ├── AuthModal.tsx       # Login / register modal
│   ├── MapPreview.tsx      # Interactive Leaflet map (main map component)
│   └── ...
├── pages/
│   ├── Home.tsx
│   ├── CityPage.tsx        # Browse POIs for a city
│   ├── RoutePage.tsx       # View / edit a single route
│   └── ...
├── types/                  # TypeScript interfaces matching backend DTOs
└── main.tsx
```

---

## Authentication

JWT tokens are stored in `localStorage` under the key `token`.

The axios interceptor in `src/api/axios.ts` automatically attaches it to every request:
```
Authorization: Bearer eyJ...
```

On a `401` response the token is cleared and the page reloads — no manual handling needed in components.

---

## Map & Routing

`MapPreview.tsx` uses:

- **Leaflet.js** — interactive map rendering
- **OpenStreetMap tiles** — free, no API key required
- **OSRM** — real road routing between stops
  - Walking + cycling → `routing.openstreetmap.de`
  - Driving → `router.project-osrm.org` *(openstreetmap.de has no public driving profile)*

Route paths are cached at module level — switching between stops doesn't re-fetch known segments.

> ⚠️ OSRM public servers have rate limits. For production, self-host an OSRM instance.

---

## Build for Production

```bash
npm run build      # outputs to dist/
npm run preview    # preview production build locally
```

---

## Linting

```bash
npm run lint
```
