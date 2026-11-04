import { useState } from 'react';
import { useLoad, R, RL, pct, shortDate } from '../api.js';
import { Kpi, Bars, Donut, Gauge, Section, Loading, Modal, ITEM_COLORS, Spark } from '../ui.jsx';

function Drill({ outlet, onClose }) {
  const { data, error } = useLoad(`/outlets/${encodeURIComponent(outlet)}/days`);
  return (
    <Modal title={`${outlet} · last 7 days`} onClose={onClose}>
      {!data ? <Loading error={error} /> : (
        <>
          <Bars height={160} format={RL} items={data.days.map((d) => ({ label: d.day, short: shortDate(d.day), value: d.value }))} />
          <table className="tbl">
            <thead><tr><th>Day</th><th>Sales</th><th>Bills</th><th>Avg bill</th></tr></thead>
            <tbody>
              {data.days.map((d) => (
                <tr key={d.day}><td>{shortDate(d.day)}</td><td>{R(d.value)}</td><td>{d.bills}</td><td>{R(d.value / d.bills)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="lbl">Totals reconcile to POS bills for each business day.</p>
        </>
      )}
    </Modal>
  );
}

export default function CommandCenter() {
  const [region, setRegion] = useState('All');
  const [pick, setPick] = useState(null);
  const { data: d, error } = useLoad(`/dashboard?region=${region}`);
  if (!d) return <Loading error={error} />;
  const growth = d.growth;
  const spark = d.trend.map((t) => t.value);

  return (
    <>
      <Section kicker="01 · Live floor" title="Command center" note={`Report generated ${new Date(d.generatedAt).toLocaleString('en-IN')}`}>
        <div className="chips">
          {d.regions.map((r) => <button key={r} className={r === region ? 'chip on' : 'chip'} onClick={() => setRegion(r)}>{r}</button>)}
        </div>
      </Section>

      <div className="kpis">
        <Kpi i={0} label={d.scope === 'franchise' ? 'Outlet sales · 7 days' : 'Sales · 7 days'} value={d.sales} format={RL}
          foot={<span className={growth >= 0 ? 'up' : 'dn'}>{growth >= 0 ? '▲' : '▼'} {pct(Math.abs(growth), 1)} vs last week</span>} spark={spark} />
        {d.scope === 'franchise' ? (
          <>
            <Kpi i={1} label="Order fill rate" value={d.fillRate * 100} format={(v) => v.toFixed(1) + '%'} foot="Received ÷ dispatched boxes" />
            <Kpi i={2} label="Shipments this week" value={d.shipments} foot="Visible to your outlet only" />
          </>
        ) : (
          <>
            <Kpi i={1} label="Stock value on hand" value={d.stockValue} format={RL} foot={<span className="warn-t">{RL(d.nearExpiryValue)} expires within 30 days</span>} />
            <Kpi i={2} label="Open purchase orders" value={d.openPOs} foot={d.pendingApprovals ? <span className="warn-t">{d.pendingApprovals} waiting for Owner</span> : 'All approved'} />
            <Kpi i={3} label="Open exceptions" value={d.openExceptions} tone={d.highExceptions ? 'hot' : ''}
              foot={<span className="dn">{R(d.atRisk)} at risk · {d.highExceptions} high</span>} />
          </>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>Sales by outlet</h3><span className="lbl">Click a bar to drill into daily bills</span></div>
          <Bars format={RL} onPick={(x) => setPick(x.label)}
            items={d.outlets.map((o) => ({ label: o.name, short: o.name.split(' ')[0], value: o.value }))} />
        </div>
        <div className="card center-stack">
          <h3>Delivery health</h3>
          <Gauge value={d.otif} label="On-time in-full" />
          <div className="mini-trend">
            <span className="lbl">Daily sales trend</span>
            <Spark data={spark} h={56} />
          </div>
        </div>
      </div>

      {d.scope === 'company' && (
        <div className="card stock-mix">
          <div>
            <h3>Where the money sits</h3>
            <p className="lbl">Stock value by ingredient at standard cost</p>
            <ul className="legend">
              {d.stockByItem.map((s) => (
                <li key={s.item}><i style={{ background: ITEM_COLORS[s.item] }} />{s.item}<b>{RL(s.value)}</b></li>
              ))}
            </ul>
          </div>
          <Donut size={230} center={RL(d.stockValue)} sub="on hand"
            segments={d.stockByItem.map((s) => ({ label: `${s.item} ${R(s.value)}`, value: s.value, color: ITEM_COLORS[s.item] }))} />
        </div>
      )}

      {pick && <Drill outlet={pick} onClose={() => setPick(null)} />}
    </>
  );
}
