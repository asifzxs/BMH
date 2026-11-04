import { useState } from 'react';
import { useLoad } from '../api.js';
import { Section, Loading, ITEM_COLORS } from '../ui.jsx';

const ICON = { lot: '📦', grn: '🧾', qc: '🧪', batch: '🏭', ship: '🚚', outlet: '🏪' };

export default function Traceability() {
  const list = useLoad('/trace');
  const [lot, setLot] = useState('L-1042');
  const { data, error } = useLoad(`/trace/${lot}`);

  return (
    <>
      <Section kicker="06 · Follow the gram" title="Lot traceability" note="Forward trace from supplier lot to the outlet that sold it." />
      <div className="chips">
        {(list.data || []).map((l) => (
          <button key={l.id} className={l.id === lot ? 'chip on' : 'chip'} onClick={() => setLot(l.id)} style={{ '--chip': ITEM_COLORS[l.item] }}>
            <i className="dot" />{l.id} · {l.item}{l.full ? ' ⛓' : ''}
          </button>
        ))}
      </div>
      {!data ? <Loading error={error} /> : (
        <div className="card chain-card" key={lot}>
          <div className="chain">
            {data.steps.map((s, i) => (
              <div key={s.kind} className={`link ${s.done ? 'done' : 'pending'}`} style={{ '--i': i }}>
                <div className="link-ico">{ICON[s.kind]}</div>
                <div className="link-step">Step {i + 1} · {s.label}</div>
                <div className="link-title">{s.title}</div>
                {s.sub && <div className="link-sub">{s.sub}</div>}
              </div>
            ))}
          </div>
          <p className="lbl">
            {data.steps.filter((s) => s.done).length} of {data.steps.length} checkpoints confirmed: receipt, inspection, storage, production, dispatch, outlet
          </p>
        </div>
      )}
    </>
  );
}
