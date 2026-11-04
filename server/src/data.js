// Seed data for the BMH control tower. Everything lives in memory and resets on restart.
// Dates are stored as offsets from "now" so the demo never goes stale.

const DAY = 864e5;
export const isoIn = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
const agoMin = (m) => new Date(Date.now() - m * 6e4).toISOString();

export const ROLES = {
  Owner: { label: 'Owner' },
  Procurement: { label: 'Procurement' },
  Quality: { label: 'Quality' },
  Franchise: { label: 'Franchise · Coimbatore RS Puram', outlet: 'Coimbatore RS Puram' },
};

export const ADJUST_REASONS = ['Damage', 'Spillage', 'Count correction', 'Expiry write-off'];

// Daily share of a 7-day sales total, oldest day first.
export const DAY_WEIGHTS = [0.12, 0.13, 0.14, 0.13, 0.15, 0.17, 0.16];

export function seed() {
  const vendors = {
    SG: { name: 'Sri Ganesh Agro', otd: 94, rej: 1.2 },
    KD: { name: 'Kovai Dairy Co-op', otd: 91, rej: 2.1 },
    MS: { name: 'Madurai Spice House', otd: 88, rej: 3.4 },
    RN: { name: 'Royal Nut Traders', otd: 96, rej: 0.8 },
    PW: { name: 'PackWell Industries', otd: 90, rej: 1.9 },
    SS: { name: 'Sakthi Sugars', otd: 87, rej: 2.5 },
    TD: { name: 'TN Dairy Fresh', otd: 93, rej: 1.5 },
    NN: { name: 'Nilgiri Nuts', otd: 89, rej: 3.8 },
    KP: { name: 'Kaveri Packaging', otd: 95, rej: 1.1 },
  };

  const units = { Besan: 'kg', Sugar: 'kg', Ghee: 'kg', Cashew: 'kg', Khoa: 'kg', Cardamom: 'kg', Pista: 'kg', 'Gift box': 'pcs' };
  const stdPrice = { Besan: 80, Sugar: 43, Ghee: 560, Cashew: 770, Khoa: 320, Cardamom: 2650, Pista: 1450, 'Gift box': 12 };
  const reorder = { Besan: 300, Sugar: 400, Ghee: 40, Cashew: 60, Khoa: 30, Cardamom: 5, Pista: 15, 'Gift box': 1500 };
  const shelfLife = { Besan: 120, Sugar: 365, Ghee: 90, Cashew: 120, Khoa: 10, Cardamom: 240, Pista: 90, 'Gift box': 720 };

  const quotes = [
    ['Besan', 'SG', 82, 100, 3], ['Besan', 'MS', 78, 250, 5],
    ['Sugar', 'SS', 41, 500, 4], ['Sugar', 'SG', 44, 200, 2],
    ['Ghee', 'KD', 560, 50, 2], ['Ghee', 'SG', 585, 20, 3],
    ['Cashew', 'RN', 780, 25, 6], ['Cashew', 'MS', 745, 100, 9], ['Cashew', 'NN', 760, 50, 8],
    ['Khoa', 'KD', 320, 30, 1], ['Khoa', 'TD', 335, 10, 1],
    ['Cardamom', 'MS', 2600, 5, 4], ['Cardamom', 'RN', 2750, 2, 7],
    ['Pista', 'RN', 1450, 10, 7], ['Pista', 'NN', 1380, 20, 10],
    ['Gift box', 'PW', 12, 1000, 5], ['Gift box', 'KP', 12.8, 500, 3],
  ].map(([item, vendor, price, moq, lead]) => ({ item, vendor, price, moq, lead }));

  const lots = [
    ['L-1042', 'Cashew', 64, 'Cold Rm A', 83, 'Released'],
    ['L-1043', 'Besan', 410, 'Dry Rack 3', 126, 'Released'],
    ['L-1044', 'Ghee', 38, 'Cold Rm B', 24, 'Released'],
    ['L-1045', 'Sugar', 900, 'Dry Rack 1', 278, 'Released'],
    ['L-1046', 'Khoa', 22, 'Cold Rm B', 6, 'Quarantine'],
    ['L-1047', 'Cardamom', 3, 'Spice Cage', 195, 'Released'],
    ['L-1048', 'Pista', 18, 'Cold Rm A', 64, 'Released'],
    ['L-1049', 'Gift box', 2600, 'Pack Hall', 431, 'Released'],
    ['L-1050', 'Cashew', 140, 'Cold Rm A', 110, 'Released'],
    ['L-1051', 'Sugar', 350, 'Dry Rack 1', 318, 'Released'],
    ['L-1052', 'Ghee', 22, 'Cold Rm B', 39, 'Released'],
    ['L-1053', 'Besan', 180, 'Dry Rack 3', 90, 'Released'],
    ['L-1054', 'Khoa', 45, 'Cold Rm B', 16, 'Released'],
    ['L-1055', 'Pista', 6, 'Cold Rm A', 22, 'Released'],
    ['L-1056', 'Cardamom', 8, 'Spice Cage', 246, 'Released'],
  ].map(([id, item, qty, loc, days, status]) => ({ id, item, qty, loc, exp: isoIn(days), status }));

  // stdYield = kg of finished sweet expected per kg of ingredient input.
  const recipes = [
    { name: 'Kaju Katli', version: 'v3', bom: { Cashew: 0.55, Sugar: 0.4, Ghee: 0.03 }, yield: 1 },
    { name: 'Mysore Pak', version: 'v2', bom: { Besan: 0.35, Ghee: 0.55, Sugar: 0.5 }, yield: 1.4 },
    { name: 'Besan Ladoo', version: 'v4', bom: { Besan: 0.5, Ghee: 0.25, Sugar: 0.3, Cardamom: 0.004 }, yield: 1.05 },
    { name: 'Soan Papdi', version: 'v2', bom: { Besan: 0.3, Sugar: 0.5, Ghee: 0.3, Cardamom: 0.003 }, yield: 1 },
    { name: 'Motichoor Ladoo', version: 'v5', bom: { Besan: 0.45, Sugar: 0.5, Ghee: 0.2 }, yield: 1.1 },
  ].map((r) => ({ ...r, stdYield: r.yield * 0.6 }));

  const batches = [
    ['B-7731', 0, 100, 60, 0.9], ['B-7732', 1, 100, 70, 3.2], ['B-7733', 2, 100, 64, 1.0],
    ['B-7734', 3, 100, 59, 1.2], ['B-7735', 4, 100, 66, 0.8], ['B-7736', 0, 200, 121, 1.6],
    ['B-7737', 1, 150, 128, 2.4], ['B-7738', 2, 120, 70, 4.1],
  ].map(([id, recipe, input, output, rejects]) => ({ id, recipe, input, output, rejects }));

  const outlets = [
    ['Coimbatore RS Puram', 'Franchise', 180000, 166000],
    ['Chennai T Nagar', 'Company', 264000, 241000],
    ['Madurai Anna Nagar', 'Franchise', 142000, 135000],
    ['Salem Fairlands', 'Company', 98000, 99500],
    ['Trichy Srirangam', 'Franchise', 156000, 141000],
    ['Erode Perundurai', 'Franchise', 87000, 80500],
  ].map(([name, model, sales7d, lastWeek]) => ({ name, model, region: name.split(' ')[0], sales7d, lastWeek }));

  const shipments = [
    ['S-5521', 'Coimbatore RS Puram', 120, 120, 'TN38 AK 4410'],
    ['S-5522', 'Chennai T Nagar', 200, 196, 'TN09 BX 1182'],
    ['S-5523', 'Madurai Anna Nagar', 90, 81, 'TN59 CQ 0907'],
    ['S-5524', 'Salem Fairlands', 60, 60, 'TN30 AD 7781'],
    ['S-5525', 'Coimbatore RS Puram', 80, 80, 'TN38 AK 4410'],
    ['S-5526', 'Trichy Srirangam', 110, 108, 'TN45 BB 2290'],
    ['S-5527', 'Erode Perundurai', 70, 70, 'TN33 AZ 6605'],
    ['S-5528', 'Chennai T Nagar', 150, 150, 'TN09 BX 1182'],
    ['S-5529', 'Coimbatore RS Puram', 60, 57, 'TN38 AK 4410'],
  ].map(([id, outlet, dispatched, received, vehicle]) => ({ id, outlet, dispatched, received, vehicle }));

  const exceptions = [
    ['E-101', 'Receipt variance', 'S-5523', '9 boxes short at Madurai Anna Nagar', 4050, 'High', 'Logistics lead', 2],
    ['E-102', 'Price deviation', 'PO-1999', 'Cashew PO 6% above approved rate', 1900, 'Medium', 'Procurement', 1],
    ['E-103', 'Yield variance', 'B-7732', 'Mysore Pak batch under standard yield', 2600, 'High', 'Factory mgr', 1],
    ['E-104', 'Near expiry', 'L-1046', 'Khoa lot in quarantine, 6 days of shelf life left', 7040, 'High', 'Quality', 0],
    ['E-105', 'Receipt variance', 'S-5529', '3 boxes short at Coimbatore RS Puram', 1350, 'Low', 'Logistics lead', 0],
    ['E-106', 'Yield variance', 'B-7738', 'Besan Ladoo batch 7% under standard', 3100, 'High', 'Factory mgr', 0],
    ['E-107', 'Near expiry', 'L-1055', 'Pista lot has 22 days left, 6 kg on hand', 8700, 'Medium', 'Warehouse', 3],
    ['E-108', 'Vendor', 'MS', 'Madurai Spice House rejection rate above 3%', 0, 'Medium', 'Procurement', 5],
    ['E-109', 'Receipt variance', 'S-5522', '4 boxes short at Chennai T Nagar', 1800, 'Low', 'Logistics lead', 1],
    ['E-110', 'Receipt variance', 'S-5526', '2 boxes short at Trichy Srirangam', 900, 'Low', 'Logistics lead', 0],
  ].map(([id, type, ref, detail, impact, severity, owner, age]) => ({
    id, type, ref, detail, impact, severity, owner,
    raisedBy: 'System', createdAt: new Date(Date.now() - age * DAY).toISOString(), status: 'Open',
  }));

  // Forward-trace links: supplier lot -> receipt -> batch -> shipment.
  const trace = {
    'L-1042': { vendor: 'RN', grnDaysAgo: 27, batch: 'B-7731', shipment: 'S-5521' },
    'L-1043': { vendor: 'SG', grnDaysAgo: 24, batch: 'B-7733', shipment: 'S-5522' },
    'L-1044': { vendor: 'KD', grnDaysAgo: 20, batch: 'B-7732', shipment: 'S-5523' },
    'L-1045': { vendor: 'SS', grnDaysAgo: 32, batch: 'B-7736', shipment: 'S-5528' },
    'L-1050': { vendor: 'RN', grnDaysAgo: 17, batch: 'B-7736', shipment: 'S-5526' },
  };
  for (const lot of lots) {
    trace[lot.id] ??= { vendor: quotes.find((q) => q.item === lot.item).vendor, grnDaysAgo: 12 };
  }

  const pos = [
    ['PO-2000', 'Sugar', 'SS', 600, 24600, 0, 'Approved', 'Procurement'],
    ['PO-1999', 'Cashew', 'RN', 100, 78000, 3, 'Pending approval', 'Procurement'],
    ['PO-1998', 'Ghee', 'KD', 120, 67200, -5, 'Received', 'Procurement'],
    ['PO-1997', 'Besan', 'SG', 300, 24600, -8, 'Received', 'Procurement'],
    ['PO-1996', 'Gift box', 'PW', 3000, 36000, 2, 'Approved', 'Procurement'],
    ['PO-1995', 'Pista', 'RN', 20, 29000, 4, 'Approved', 'Procurement'],
  ].map(([id, item, vendor, qty, value, etaDays, status, raisedBy]) => ({
    id, item, vendor, qty, value, eta: isoIn(etaDays), status, raisedBy,
  }));

  const audit = [
    [8, 'Owner', 'PO approved', 'PO-2000'],
    [35, 'Quality', 'Lot released', 'L-1048'],
    [52, 'Procurement', 'PO raised', 'PO-1999 · 100 kg Cashew at ₹780'],
    [80, 'Owner', 'Exception closed', 'E-099: courier delay confirmed, no loss'],
    [98, 'Procurement', 'Stock adjusted', 'L-1044 −2 kg · Spillage'],
  ].map(([m, user, action, detail]) => ({ ts: agoMin(m), user, action, detail }));

  return {
    vendors, units, stdPrice, reorder, shelfLife, quotes, lots, recipes, batches,
    outlets, shipments, exceptions, trace, pos, audit,
    seq: { po: 2001, lot: 1057, ex: 111 },
  };
}
