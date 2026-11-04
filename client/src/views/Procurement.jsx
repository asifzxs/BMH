import { useContext, useState } from 'react';
import { AppCtx, useAct, useLoad, R, shortDate } from '../api.js';
import { Section, Loading, Tag, Ring, ITEM_COLORS } from '../ui.jsx';

const PO_TONE = { Received: 'ok', 'Pending approval': 'warn', Approved: 'info' };

function QuoteBoard() {
  const { role } = useContext(AppCtx);
  const act = useAct();
  const [item, setItem] = useState('Cashew');
  const [qty, setQty] = useState(100);
  const items = useLoad('/items').data;
  const { data, error } = useLoad(`/quotes?item=${encodeURIComponent(item)}&qty=${qty}`);
  const canRaise = role === 'Owner' || role === 'Procurement';
  const raise = (q, useMoq) =>
    act('/pos', { item, vendor: q.vendor, qty, useMoq },
      (r) => `${r.po.id} ${r.po.status === 'Approved' ? 'approved and sent' : 'sent to Owner for approval'}${r.exception ? ` · ${r.exception.id} price flag opened` : ''}`,
      { party: true });

  return (
    <div className="card">
      <div className="card-head">
        <h3>Quote arena</h3>
        <span className="lbl">Vendors ranked on price, delivery record, rejections and lead time</span>
      </div>
      <div className="chips">
        {(items || []).map((i) => (
          <button key={i.item} className={i.item === item ? 'chip on' : 'chip'} onClick={() => setItem(i.item)}
            style={{ '--chip': ITEM_COLORS[i.item] }}>
            <i className="dot" />{i.item}
          </button>
        ))}
      </div>
      <div className="qty">
        <button className="ghost" onClick={() => setQty((q) => Math.max(1, q - 10))} aria-label="Less">−</button>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} aria-label="Quantity" />
        <button className="ghost" onClick={() => setQty((q) => q + 10)} aria-label="More">+</button>
        <span className="lbl">{data?.unit} required · approved rate {data && R(data.stdPrice)}</span>
      </div>
      {!data ? <Loading error={error} /> : (
        <div className="arena">
          {data.quotes.map((q, i, all) => {
            const topScore = Math.max(...all.map((x) => x.score), 1);
            const best = i === 0 && q.meetsMoq;
            return (
              <div key={q.vendor} className={`quote ${best ? 'best' : ''}`} style={{ '--i': i }}>
                <div className="rank">{best ? '👑' : `#${i + 1}`}</div>
                <div className="quote-main">
                  <div className="quote-name">{q.vendorName} {best && <Tag tone="ok">Recommended</Tag>}</div>
                  <div className="quote-meta">
                    <span><b>{R(q.price)}</b>/{data.unit}</span>
                    {q.deviation > 0.05 && <Tag tone="crit">+{Math.round(q.deviation * 100)}% vs approved</Tag>}
                    <span>MOQ {q.moq}</span><span>{q.lead}d lead · by {shortDate(q.eta)}</span>
                    <span>{q.otd}% on-time</span><span>{q.rej}% rejects</span>
                  </div>
                  <div className="score"><i style={{ width: `${Math.max(6, (q.score / topScore) * 100)}%` }} /><span>score {q.score}</span></div>
                </div>
                <div className="quote-cta">
                  <div className="big-sm">{R(q.total)}</div>
                  {!canRaise ? <span className="lbl">View only</span> : q.meetsMoq
                    ? <button className="pri" onClick={() => raise(q, false)}>Raise PO</button>
                    : <><Tag tone="warn">Short of MOQ by {q.moq - qty}</Tag><button onClick={() => raise(q, true)}>Order MOQ</button></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PurchaseOrders() {
  const { role } = useContext(AppCtx);
  const act = useAct();
  const { data, error } = useLoad('/pos');
  if (!data) return <Loading error={error} />;
  return (
    <div className="card">
      <div className="card-head"><h3>Purchase orders</h3><span className="lbl">Over ₹50,000 needs the Owner (maker-checker). Receiving posts a lot to quarantine.</span></div>
      <div className="wrap">
        <table className="tbl">
          <thead><tr><th>PO</th><th>Item</th><th>Vendor</th><th>Qty</th><th>Value</th><th>ETA</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.id}</td><td>{p.item}</td><td>{p.vendorName}</td><td>{p.qty} {p.unit}</td>
                <td>{R(p.value)}</td><td>{shortDate(p.eta)}</td>
                <td><Tag tone={PO_TONE[p.status]} pulse={p.status === 'Pending approval'}>{p.status}</Tag></td>
                <td className="actions">
                  {p.status === 'Pending approval' && (role === 'Owner'
                    ? <button className="pri" onClick={() => act(`/pos/${p.id}/approve`, null, `${p.id} approved`, { party: true })}>Approve</button>
                    : <span className="lbl">Owner only</span>)}
                  {p.status === 'Approved' && role !== 'Quality' &&
                    <button onClick={() => act(`/pos/${p.id}/receive`, null, (r) => `${r.lot.id} posted to quarantine`)}>Receive goods</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Vendors() {
  const { data, error } = useLoad('/vendors');
  if (!data) return <Loading error={error} />;
  return (
    <>
      <h3 className="sub-h">Vendor scorecards</h3>
      <div className="vendor-grid">
        {data.map((v, i) => (
          <div key={v.id} className="card vendor" style={{ '--i': i }}>
            <div className="vendor-head">
              <span className="mono badge">{v.id}</span>
              <Tag tone={v.risk === 'Healthy' ? 'ok' : v.risk === 'Sole source' ? 'warn' : 'crit'}>{v.risk}</Tag>
            </div>
            <h4>{v.name}</h4>
            <div className="rings">
              <Ring value={v.otd} label={`${v.otd}% on-time`} color="var(--lime)" />
              <Ring value={Math.max(0, 5 - v.rej)} max={5} label={`${v.rej}% rejects`} color={v.rej > 3 ? 'var(--rose)' : 'var(--gold)'} />
            </div>
            <p className="lbl">{v.items.join(' · ')} · avg lead {v.avgLead.toFixed(1)} days</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Procurement() {
  return (
    <>
      <Section kicker="02 · Buy smart" title="Procurement & vendor intelligence" />
      <QuoteBoard />
      <PurchaseOrders />
      <Vendors />
    </>
  );
}
