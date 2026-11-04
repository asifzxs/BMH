# BMH Control Tower

React (Vite) frontend + Express backend for Bhaskar's Money Holege, built from the initial BRD (v0.1) and the HTML prototype.

## Run

```bash
npm install
npm run dev        # API on :4000, web on :5173 (proxies /api)
```

Production: `npm run build && npm start` serves the built client from Express on :4000.

## Layout

- `server/src/data.js` – in-memory seed data (resets on restart)
- `server/src/index.js` – REST API, role checks, approvals, audit log
- `client/src/App.jsx` – shell: hero, ticker tapes, nav, role switcher
- `client/src/views/*` – one screen per module
- `client/src/ui.jsx` – charts, cards, modal, toasts, confetti

## Roles (sent as the `x-role` header; demo only, no real auth)

| Role | Sees | Can do |
|---|---|---|
| Owner | everything | approve POs > ₹50,000, adjustments > ₹5,000, release lots |
| Procurement | everything except Quality actions | raise and receive POs, adjust stock ≤ ₹5,000 |
| Quality | everything | release quarantined lots, adjust stock ≤ ₹5,000 |
| Franchise | own outlet only (dashboard, distribution) | read-only |

## Controls implemented (BRD refs)

- FR-02 PO > ₹50,000 waits for Owner; price > 5% above approved rate opens an exception
- FR-05 yield variance beyond ±5% is flagged per batch
- FR-06 FEFO sort, reorder flags, reason codes required for adjustments
- FR-08 receiving creates a quarantined lot; only Quality/Owner release; forward trace lot → outlet
- FR-11 franchise users are restricted to their outlet's data on the server
- FR-14 every mutation is written to the audit log; maker-checker on closing exceptions
