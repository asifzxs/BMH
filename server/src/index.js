import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { seed, isoIn, ROLES, ADJUST_REASONS, DAY_WEIGHTS } from './data.js';

const db = seed();
const app = express();
app.use(express.json());

const STAFF = ['Owner', 'Procurement', 'Quality'];
const TABS = {
  staff: ['Command Center', 'Procurement', 'Inventory', 'Production', 'Distribution', 'Traceability', 'Exceptions & Audit'],
  Franchise: ['Command Center', 'Distribution'],
};
const PO_APPROVAL_LIMIT = 50000;
const ADJUST_OWNER_LIMIT = 5000;
const PRICE_TOLERANCE = 0.05;
const YIELD_TOLERANCE = 5;

// ---------- helpers ----------
const fail = (res, code, error) => res.status(code).json({ error });
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.role) ? next() : fail(res, 403, `${ROLES[req.role].label} cannot do this`);
const log = (req, action, detail) =>
  db.audit.unshift({ ts: new Date().toISOString(), user: req.role, action, detail });
const rupees = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const daysLeft = (iso) => Math.round((new Date(iso) - Date.now()) / 864e5);
const findOr404 = (list, id, res, what) => {
  const hit = list.find((x) => x.id === id);
  if (!hit) fail(res, 404, `${what} ${id} not found`);
  return hit;
};
const scopeOutlets = (req) => db.outlets.filter((o) => !req.outlet || o.name === req.outlet);
const scopeShipments = (req) => db.shipments.filter((s) => !req.outlet || s.outlet === req.outlet);
const stockValue = () => db.lots.reduce((s, l) => s + l.qty * db.stdPrice[l.item], 0);
const recipeCost = (r) => Object.entries(r.bom).reduce((s, [i, q]) => s + q * db.stdPrice[i], 0) / r.yield;

function raiseException(fields) {
  const ex = { id: 'E-' + db.seq.ex++, raisedBy: 'System', createdAt: new Date().toISOString(), status: 'Open', ...fields };
  db.exceptions.unshift(ex);
  return ex;
}

function rankQuotes(item, qty) {
  const qs = db.quotes.filter((q) => q.item === item);
  const max = Math.max(...qs.map((q) => q.price));
  return qs
    .map((q) => {
      const v = db.vendors[q.vendor];
      const score = ((v.otd - v.rej * 3) / 100) * 40 + (1 - q.price / max) * 300 + (10 - q.lead) * 2;
      const orderQty = Math.max(qty, q.moq);
      return {
        ...q, vendorName: v.name, otd: v.otd, rej: v.rej, meetsMoq: qty >= q.moq, orderQty,
        total: orderQty * q.price, deviation: q.price / db.stdPrice[item] - 1, eta: isoIn(q.lead), score: Math.round(score),
      };
    })
    .sort((a, b) => b.meetsMoq - a.meetsMoq || b.score - a.score);
}

function batchView(b) {
  const r = db.recipes[b.recipe];
  const expected = b.input * r.stdYield;
  const variance = ((b.output - expected) / expected) * 100;
  return {
    ...b, recipeName: r.name, version: r.version, expected: Math.round(expected),
    variance: +variance.toFixed(1), flagged: Math.abs(variance) > YIELD_TOLERANCE, costPerKg: recipeCost(r) * 1.08,
  };
}

function traceSteps(lot) {
  const t = db.trace[lot.id] || {};
  const batch = t.batch && batchView(db.batches.find((b) => b.id === t.batch));
  const ship = t.shipment && db.shipments.find((s) => s.id === t.shipment);
  const outlet = ship && db.outlets.find((o) => o.name === ship.outlet);
  const unit = db.units[lot.item];
  return [
    { kind: 'lot', label: 'Supplier lot', title: `${lot.item} · ${lot.id}`, sub: `${lot.qty} ${unit} at ${lot.loc}`, done: true },
    { kind: 'grn', label: 'Goods receipt', title: db.vendors[t.vendor]?.name ?? 'Unknown', sub: t.grnDaysAgo != null ? `GRN ${isoIn(-t.grnDaysAgo)}` : '', done: !!t.vendor },
    { kind: 'qc', label: 'Incoming QC', title: lot.status === 'Released' ? 'Passed & released' : 'Held in quarantine', sub: 'Quality team', done: lot.status === 'Released' },
    { kind: 'batch', label: 'Production', title: batch ? `${batch.id} ${batch.recipeName}` : 'Not consumed yet', sub: batch ? `${batch.output} kg out · ${batch.variance}% yield` : '', done: !!batch },
    { kind: 'ship', label: 'Dispatch', title: ship ? ship.id : 'Not dispatched', sub: ship ? `${ship.dispatched} boxes · ${ship.vehicle}` : '', done: !!ship },
    { kind: 'outlet', label: 'Destination', title: ship ? ship.outlet : 'Pending', sub: outlet ? `${outlet.model} outlet · ${ship.received} received` : '', done: !!ship },
  ];
}

// ---------- auth (demo: role picked in the UI and sent as a header) ----------
app.use('/api', (req, res, next) => {
  const role = req.get('x-role') || 'Owner';
  if (!ROLES[role]) return fail(res, 401, 'Unknown role');
  req.role = role;
  req.outlet = ROLES[role].outlet;
  next();
});

app.get('/api/me', (req, res) =>
  res.json({
    role: req.role, outlet: req.outlet ?? null, tabs: TABS[req.role] ?? TABS.staff,
    roles: Object.entries(ROLES).map(([id, r]) => ({ id, label: r.label })),
  })
);

// ---------- FR-01 dashboard ----------
app.get('/api/dashboard', (req, res) => {
  const region = req.query.region || 'All';
  const outlets = scopeOutlets(req).filter((o) => region === 'All' || o.region === region);
  const sales = outlets.reduce((s, o) => s + o.sales7d, 0);
  const lastWeek = outlets.reduce((s, o) => s + o.lastWeek, 0);
  const trend = DAY_WEIGHTS.map((w, i) => ({ day: isoIn(i - 6), value: Math.round(sales * w) }));
  const base = {
    generatedAt: new Date().toISOString(), region, sales, growth: lastWeek ? sales / lastWeek - 1 : 0, trend,
    outlets: outlets.map((o) => ({ name: o.name, model: o.model, value: o.sales7d })),
    regions: ['All', ...new Set(scopeOutlets(req).map((o) => o.region))],
  };
  const ships = scopeShipments(req);
  const otif = ships.length ? ships.filter((s) => s.dispatched === s.received).length / ships.length : 1;
  if (req.outlet) {
    const disp = ships.reduce((s, x) => s + x.dispatched, 0);
    const recv = ships.reduce((s, x) => s + x.received, 0);
    return res.json({ ...base, scope: 'franchise', fillRate: disp ? recv / disp : 1, otif, shipments: ships.length });
  }
  const open = db.exceptions.filter((e) => e.status === 'Open');
  const byItem = {};
  for (const l of db.lots) byItem[l.item] = (byItem[l.item] || 0) + l.qty * db.stdPrice[l.item];
  res.json({
    ...base, scope: 'company', stockValue: stockValue(), otif,
    openPOs: db.pos.filter((p) => p.status !== 'Received').length,
    pendingApprovals: db.pos.filter((p) => p.status === 'Pending approval').length,
    openExceptions: open.length, atRisk: open.reduce((s, e) => s + e.impact, 0),
    highExceptions: open.filter((e) => e.severity === 'High').length,
    nearExpiryValue: db.lots.filter((l) => daysLeft(l.exp) < 30).reduce((s, l) => s + l.qty * db.stdPrice[l.item], 0),
    stockByItem: Object.entries(byItem).map(([item, value]) => ({ item, value })).sort((a, b) => b.value - a.value),
  });
});

app.get('/api/ticker', (req, res) => {
  if (req.outlet) {
    return res.json(scopeShipments(req).map((s) => `${s.id} → ${s.outlet}: ${s.received}/${s.dispatched} boxes`));
  }
  const ex = db.exceptions.filter((e) => e.status === 'Open').slice(0, 6).map((e) => `⚠ ${e.id} ${e.type}: ${e.detail}`);
  const au = db.audit.slice(0, 6).map((a) => `✦ ${a.user} · ${a.action} · ${a.detail}`);
  res.json([...au, ...ex]);
});

// ---------- FR-02/03 procurement & vendors ----------
app.get('/api/items', allow(...STAFF), (req, res) =>
  res.json(Object.keys(db.units).map((item) => ({ item, unit: db.units[item], stdPrice: db.stdPrice[item] })))
);

app.get('/api/quotes', allow(...STAFF), (req, res) => {
  const item = req.query.item;
  if (!db.units[item]) return fail(res, 400, 'Unknown item');
  const qty = Math.max(1, Number(req.query.qty) || 1);
  res.json({ item, qty, unit: db.units[item], stdPrice: db.stdPrice[item], quotes: rankQuotes(item, qty) });
});

app.get('/api/vendors', allow(...STAFF), (req, res) =>
  res.json(
    Object.entries(db.vendors).map(([id, v]) => {
      const qs = db.quotes.filter((q) => q.vendor === id);
      const soleSource = qs.some((q) => db.quotes.filter((x) => x.item === q.item).length === 1);
      const risk = v.rej > 3 ? 'Repeated rejections' : soleSource ? 'Sole source' : 'Healthy';
      return { id, ...v, items: qs.map((q) => q.item), avgLead: qs.reduce((s, q) => s + q.lead, 0) / qs.length, risk };
    })
  )
);

app.get('/api/pos', allow(...STAFF), (req, res) =>
  res.json(db.pos.map((p) => ({ ...p, vendorName: db.vendors[p.vendor].name, unit: db.units[p.item] })))
);

app.post('/api/pos', allow('Owner', 'Procurement'), (req, res) => {
  const { item, vendor, qty, useMoq } = req.body || {};
  const quote = db.quotes.find((q) => q.item === item && q.vendor === vendor);
  if (!quote) return fail(res, 400, 'No approved quote for that item and vendor');
  const q = useMoq ? quote.moq : Number(qty);
  if (!(q > 0)) return fail(res, 400, 'Quantity must be positive');
  if (q < quote.moq) return fail(res, 400, `Below MOQ of ${quote.moq} ${db.units[item]}`);
  const value = q * quote.price;
  const po = {
    id: 'PO-' + db.seq.po++, item, vendor, qty: q, value, eta: isoIn(quote.lead),
    status: value > PO_APPROVAL_LIMIT ? 'Pending approval' : 'Approved', raisedBy: req.role,
  };
  db.pos.unshift(po);
  log(req, 'PO raised', `${po.id} · ${q} ${db.units[item]} ${item} at ${rupees(quote.price)}`);
  let exception = null;
  const dev = quote.price / db.stdPrice[item] - 1;
  if (dev > PRICE_TOLERANCE) {
    exception = raiseException({
      type: 'Price deviation', ref: po.id, detail: `${po.id} priced ${Math.round(dev * 100)}% above approved rate`,
      impact: Math.round((quote.price - db.stdPrice[item]) * q), severity: 'Medium', owner: 'Procurement',
      raisedBy: req.role, // whoever placed the over-priced order cannot also sign it off
    });
  }
  res.status(201).json({ po, exception });
});

app.post('/api/pos/:id/approve', allow('Owner'), (req, res) => {
  const po = findOr404(db.pos, req.params.id, res, 'PO');
  if (!po) return;
  if (po.status !== 'Pending approval') return fail(res, 409, `${po.id} is ${po.status}`);
  po.status = 'Approved';
  po.approvedBy = req.role;
  log(req, 'PO approved', po.id);
  res.json(po);
});

app.post('/api/pos/:id/receive', allow('Owner', 'Procurement'), (req, res) => {
  const po = findOr404(db.pos, req.params.id, res, 'PO');
  if (!po) return;
  if (po.status !== 'Approved') return fail(res, 409, `${po.id} must be Approved before receiving`);
  po.status = 'Received';
  const lot = { id: 'L-' + db.seq.lot++, item: po.item, qty: po.qty, loc: 'Receiving Bay', exp: isoIn(db.shelfLife[po.item]), status: 'Quarantine', po: po.id };
  db.lots.push(lot);
  db.trace[lot.id] = { vendor: po.vendor, grnDaysAgo: 0 };
  log(req, 'Goods received', `${po.id} → ${lot.id} · ${po.qty} ${db.units[po.item]} ${po.item} to quarantine`);
  res.json({ po, lot });
});

// ---------- FR-06 inventory ----------
app.get('/api/lots', allow(...STAFF), (req, res) => {
  const totals = {};
  for (const l of db.lots) totals[l.item] = (totals[l.item] || 0) + l.qty;
  const lots = db.lots
    .map((l) => ({
      ...l, unit: db.units[l.item], daysLeft: daysLeft(l.exp), shelfLife: db.shelfLife[l.item],
      value: l.qty * db.stdPrice[l.item], itemBelowReorder: totals[l.item] < db.reorder[l.item],
    }))
    .sort((a, b) => a.exp.localeCompare(b.exp));
  const items = Object.keys(db.units).map((item) => ({ item, unit: db.units[item], onHand: totals[item] || 0, reorder: db.reorder[item] }));
  res.json({ lots, items, reasons: ADJUST_REASONS, ownerLimit: ADJUST_OWNER_LIMIT });
});

app.post('/api/lots/:id/release', allow('Owner', 'Quality'), (req, res) => {
  const lot = findOr404(db.lots, req.params.id, res, 'Lot');
  if (!lot) return;
  if (lot.status !== 'Quarantine') return fail(res, 409, `${lot.id} is not in quarantine`);
  if (daysLeft(lot.exp) < 0) return fail(res, 409, `${lot.id} is past best-before and cannot be released`);
  lot.status = 'Released';
  if (lot.loc === 'Receiving Bay') lot.loc = ['Cashew', 'Pista', 'Ghee', 'Khoa'].includes(lot.item) ? 'Cold Rm A' : 'Dry Rack 2';
  log(req, 'Lot released', lot.id);
  res.json(lot);
});

app.post('/api/lots/:id/adjust', allow(...STAFF), (req, res) => {
  const lot = findOr404(db.lots, req.params.id, res, 'Lot');
  if (!lot) return;
  const { reason, delta } = req.body || {};
  const d = Number(delta);
  if (!ADJUST_REASONS.includes(reason)) return fail(res, 400, 'Pick a reason code');
  if (!d) return fail(res, 400, 'Quantity change cannot be zero');
  if (lot.qty + d < 0) return fail(res, 400, `Only ${lot.qty} ${db.units[lot.item]} on hand`);
  const value = Math.abs(d * db.stdPrice[lot.item]);
  if (value > ADJUST_OWNER_LIMIT && req.role !== 'Owner')
    return fail(res, 403, `${rupees(value)} adjustment exceeds ${rupees(ADJUST_OWNER_LIMIT)}: needs Owner`);
  lot.qty += d;
  log(req, 'Stock adjusted', `${lot.id} ${d > 0 ? '+' : '−'}${Math.abs(d)} ${db.units[lot.item]} · ${reason}`);
  res.json(lot);
});

// ---------- FR-04/05 recipes & production ----------
app.get('/api/recipes', allow(...STAFF), (req, res) =>
  res.json(db.recipes.map((r) => ({ ...r, costPerKg: recipeCost(r), perKg: Object.fromEntries(Object.entries(r.bom).map(([i, q]) => [i, q / r.yield])) })))
);
app.get('/api/batches', allow(...STAFF), (req, res) => res.json({ tolerance: YIELD_TOLERANCE, batches: db.batches.map(batchView) }));

// ---------- FR-09/11 distribution & franchise ----------
app.get('/api/shipments', (req, res) =>
  res.json(
    scopeShipments(req).map((s) => ({
      ...s, variance: s.received - s.dispatched,
      exception: db.exceptions.find((e) => e.ref === s.id) ?? null,
    }))
  )
);

app.get('/api/outlets', (req, res) =>
  res.json(
    scopeOutlets(req).map((o) => ({
      ...o,
      terms: o.model === 'Franchise'
        ? { pricing: 'Franchise tier B', creditLimit: 150000, royalty: '5% of sales' }
        : { pricing: 'Retail MRP', creditLimit: null, royalty: null },
    }))
  )
);

app.get('/api/outlets/:name/days', (req, res) => {
  const o = scopeOutlets(req).find((x) => x.name === req.params.name);
  if (!o) return fail(res, 404, 'Outlet not found or not yours');
  res.json({
    outlet: o.name,
    days: DAY_WEIGHTS.map((w, i) => {
      const value = Math.round(o.sales7d * w);
      return { day: isoIn(i - 6), value, bills: Math.round(value / 140) };
    }),
  });
});

// ---------- FR-08 traceability ----------
app.get('/api/trace', allow(...STAFF), (req, res) =>
  res.json(db.lots.map((l) => ({ id: l.id, item: l.item, full: !!db.trace[l.id]?.shipment })))
);
app.get('/api/trace/:id', allow(...STAFF), (req, res) => {
  const lot = findOr404(db.lots, req.params.id, res, 'Lot');
  if (lot) res.json({ lot: lot.id, steps: traceSteps(lot) });
});

// ---------- FR-14/15 exceptions & audit ----------
app.get('/api/exceptions', allow(...STAFF), (req, res) =>
  res.json(db.exceptions.map((e) => ({ ...e, ageDays: Math.floor((Date.now() - new Date(e.createdAt)) / 864e5) })))
);

app.post('/api/exceptions/:id/resolve', allow(...STAFF), (req, res) => {
  const ex = findOr404(db.exceptions, req.params.id, res, 'Exception');
  if (!ex) return;
  const finding = String(req.body?.finding || '').trim();
  if (ex.status !== 'Open') return fail(res, 409, `${ex.id} is already closed`);
  if (finding.length < 5) return fail(res, 400, 'Record a finding before closing');
  if (ex.raisedBy === req.role) return fail(res, 403, 'Maker-checker: a different role must close this case');
  Object.assign(ex, { status: 'Closed', finding, closedBy: req.role, closedAt: new Date().toISOString() });
  log(req, 'Exception closed', `${ex.id}: ${finding}`);
  res.json(ex);
});

app.get('/api/audit', allow(...STAFF), (req, res) => res.json(db.audit));

app.use('/api', (req, res) => fail(res, 404, 'No such endpoint'));

// Serve the built React app in production.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`BMH API listening on http://localhost:${PORT}`));
