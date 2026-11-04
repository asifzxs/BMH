import { useContext, useState } from 'react';
import { AppCtx, useAct, useLoad, R, shortDate } from '../api.js';
import { Section, Loading, Tag, Modal, Kpi, ITEM_COLORS } from '../ui.jsx';

function AdjustModal({ lot, reasons, ownerLimit, onClose }) {
  const act = useAct();
  const [reason, setReason] = useState(reasons[0]);
  const [delta, setDelta] = useState(-1);
  const value = Math.abs(delta) * (lot.value / lot.qty || 0);
  const submit = async (e) => {
    e.preventDefault();
    if (await act(`/lots/${lot.id}/adjust`, { reason, delta }, `${lot.id} adjusted and logged`)) onClose();
  };
  return (
    <Modal title={`Adjust ${lot.id} · ${lot.item}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Reason code
          <select value={reason} onChange={(e) => setReason(e.target.value)}>{reasons.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
        <label>Quantity change ({lot.unit}) · on hand {lot.qty}
          <input type="number" step="any" value={delta} onChange={(e) => setDelta(+e.target.value)} />
        </label>
        <p className={value > ownerLimit ? 'dn' : 'lbl'}>
          Value {R(value)} {value > ownerLimit ? `· over ${R(ownerLimit)}, only the Owner can post this` : '· within your limit'}
        </p>
        <div className="row-end"><button type="button" className="ghost" onClick={onClose}>Cancel</button><button className="pri">Post adjustment</button></div>
      </form>
    </Modal>
  );
}

export default function Inventory() {
  const { role } = useContext(AppCtx);
  const act = useAct();
  const [adjusting, setAdjusting] = useState(null);
  const { data, error } = useLoad('/lots');
  if (!data) return <Loading error={error} />;
  const { lots, items } = data;
  const low = items.filter((i) => i.onHand < i.reorder);
  const canRelease = role === 'Owner' || role === 'Quality';

  return (
    <>
      <Section kicker="03 · First expiry, first out" title="Inventory & warehouse" />
      <div className="kpis">
        <Kpi i={0} label="Lots on hand" value={lots.length} foot={`${R(lots.reduce((s, l) => s + l.value, 0))} at standard cost`} />
        <Kpi i={1} label="In quarantine" value={lots.filter((l) => l.status === 'Quarantine').length} foot="Awaiting Quality release" />
        <Kpi i={2} label="Expiring < 30 days" value={lots.filter((l) => l.daysLeft < 30).length} tone="hot" foot="Pick these first" />
        <Kpi i={3} label="Below reorder" value={low.length} foot={low.map((i) => i.item).join(', ') || 'All healthy'} />
      </div>

      <div className="card">
        <div className="card-head"><h3>Stock by lot</h3><span className="lbl">Sorted FEFO. The fuse shows remaining shelf life.</span></div>
        <div className="wrap">
          <table className="tbl">
            <thead><tr><th>Lot</th><th>Item</th><th>Qty</th><th>Location</th><th>Best before</th><th>Shelf life</th><th>Status</th><th /></tr></thead>
            <tbody>
              {lots.map((l) => {
                const frac = Math.max(0, Math.min(1, l.daysLeft / Math.min(l.shelfLife, 120)));
                return (
                  <tr key={l.id} className={l.daysLeft < 0 ? 'expired' : ''}>
                    <td className="mono">{l.id}</td>
                    <td><i className="dot" style={{ background: ITEM_COLORS[l.item] }} /> {l.item}
                      {l.itemBelowReorder && <> <Tag tone="crit">Reorder</Tag></>}</td>
                    <td>{l.qty} {l.unit}</td>
                    <td>{l.loc}</td>
                    <td>{shortDate(l.exp)}</td>
                    <td>
                      <div className="fuse" title={`${l.daysLeft} days left`}>
                        <i style={{ width: `${frac * 100}%`, '--hue': frac }} className={l.daysLeft < 30 ? 'burning' : ''} />
                      </div>
                      <span className={l.daysLeft < 30 ? 'dn small' : 'lbl small'}>{l.daysLeft < 0 ? 'Expired' : `${l.daysLeft}d left`}</span>
                    </td>
                    <td><Tag tone={l.status === 'Released' ? 'ok' : 'warn'} pulse={l.status === 'Quarantine'}>{l.status}</Tag></td>
                    <td className="actions">
                      {l.status === 'Quarantine'
                        ? (canRelease
                          ? <button className="pri" onClick={() => act(`/lots/${l.id}/release`, null, `${l.id} released to stock`, { party: true })}>Release</button>
                          : <span className="lbl">Quality only</span>)
                        : <button onClick={() => setAdjusting(l)}>Adjust</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="lbl">Every adjustment needs a reason code and lands in the audit log. Over ₹5,000 needs the Owner.</p>
      </div>
      {adjusting && <AdjustModal lot={adjusting} reasons={data.reasons} ownerLimit={data.ownerLimit} onClose={() => setAdjusting(null)} />}
    </>
  );
}
