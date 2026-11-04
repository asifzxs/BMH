import { useLoad, R, RL } from '../api.js';
import { Section, Loading, Tag, Tilt } from '../ui.jsx';

export default function Distribution() {
  const ships = useLoad('/shipments');
  const outlets = useLoad('/outlets');
  if (!ships.data || !outlets.data) return <Loading error={ships.error || outlets.error} />;

  return (
    <>
      <Section kicker="05 · Out the door" title="Distribution & franchise" />
      <div className="card">
        <div className="card-head"><h3>Shipments · dispatched vs received</h3><span className="lbl">Every short box opens a case with an owner.</span></div>
        <div className="ship-list">
          {ships.data.map((s, i) => (
            <div key={s.id} className={`ship ${s.variance ? 'short' : ''}`} style={{ '--i': i }}>
              <div className="ship-id"><span className="mono">{s.id}</span><small>{s.vehicle}</small></div>
              <div className="ship-route">
                <span className="lbl">Factory</span>
                <div className="road"><i className="truck">🚚</i></div>
                <b>{s.outlet}</b>
              </div>
              <div className="ship-qty">
                <div className="ship-bar"><i style={{ width: `${(s.received / s.dispatched) * 100}%` }} /></div>
                <span>{s.received}/{s.dispatched} boxes</span>
              </div>
              <div>{s.variance
                ? <Tag tone="crit">{s.variance} boxes{s.exception ? ` · ${s.exception.id}` : ''}</Tag>
                : <Tag tone="ok">Matched</Tag>}</div>
            </div>
          ))}
        </div>
      </div>

      <h3 className="sub-h">Outlets & commercial terms</h3>
      <div className="outlet-grid">
        {outlets.data.map((o, i) => (
          <Tilt key={o.name} className={`outlet ${o.model === 'Franchise' ? 'fr' : 'co'}`} style={{ '--i': i }}>
            <div className="vendor-head"><Tag tone={o.model === 'Franchise' ? 'info' : 'ok'}>{o.model}</Tag><span className="lbl">{o.region}</span></div>
            <h4>{o.name}</h4>
            <div className="big">{RL(o.sales7d)}</div>
            <div className={o.sales7d >= o.lastWeek ? 'up small' : 'dn small'}>
              {o.sales7d >= o.lastWeek ? '▲' : '▼'} {Math.abs((o.sales7d / o.lastWeek - 1) * 100).toFixed(1)}% vs last week
            </div>
            <dl className="terms">
              <dt>Pricing</dt><dd>{o.terms.pricing}</dd>
              <dt>Credit limit</dt><dd>{o.terms.creditLimit ? R(o.terms.creditLimit) : 'n/a'}</dd>
              <dt>Royalty</dt><dd>{o.terms.royalty ?? 'n/a'}</dd>
            </dl>
          </Tilt>
        ))}
      </div>
    </>
  );
}
