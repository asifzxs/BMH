import { useState } from 'react';
import { useAct, useLoad, R } from '../api.js';
import { Section, Loading, Tag, Modal, Kpi } from '../ui.jsx';

const SEV = { High: 'crit', Medium: 'warn', Low: 'info' };

function ResolveModal({ ex, onClose }) {
  const act = useAct();
  const [finding, setFinding] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (await act(`/exceptions/${ex.id}/resolve`, { finding }, `${ex.id} closed with finding`, { party: true })) onClose();
  };
  return (
    <Modal title={`Close ${ex.id} · ${ex.type}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p>{ex.detail}</p>
        <label>Finding
          <textarea rows="3" value={finding} onChange={(e) => setFinding(e.target.value)} placeholder="What did the investigation find?" autoFocus />
        </label>
        <p className="lbl">Raised by {ex.raisedBy}. The closer must be a different role.</p>
        <div className="row-end"><button type="button" className="ghost" onClick={onClose}>Cancel</button><button className="pri">Close case</button></div>
      </form>
    </Modal>
  );
}

export default function Exceptions() {
  const ex = useLoad('/exceptions');
  const audit = useLoad('/audit');
  const [closing, setClosing] = useState(null);
  const [filter, setFilter] = useState('Open');
  if (!ex.data || !audit.data) return <Loading error={ex.error || audit.error} />;
  const open = ex.data.filter((e) => e.status === 'Open');
  const shown = ex.data.filter((e) => filter === 'All' || e.status === filter);

  return (
    <>
      <Section kicker="07 · Nothing silent" title="Exceptions & audit trail" note="Anomalies are signals to investigate, not proof of wrongdoing.">
        <div className="chips">{['Open', 'Closed', 'All'].map((f) => <button key={f} className={f === filter ? 'chip on' : 'chip'} onClick={() => setFilter(f)}>{f}</button>)}</div>
      </Section>
      <div className="kpis">
        {['High', 'Medium', 'Low'].map((s, i) => {
          const list = open.filter((e) => e.severity === s);
          return <Kpi key={s} i={i} tone={s === 'High' ? 'hot' : ''} label={`${s} severity open`} value={list.length} foot={`${R(list.reduce((a, e) => a + e.impact, 0))} estimated impact`} />;
        })}
      </div>

      <div className="case-grid">
        {shown.map((e, i) => (
          <div key={e.id} className={`card case sev-${e.severity} ${e.status === 'Closed' ? 'closed' : ''}`} style={{ '--i': i }}>
            <div className="vendor-head">
              <span className="mono badge">{e.id}</span>
              <Tag tone={e.status === 'Closed' ? 'ok' : SEV[e.severity]} pulse={e.status === 'Open' && e.severity === 'High'}>{e.status === 'Closed' ? 'Closed' : e.severity}</Tag>
            </div>
            <h4>{e.type}</h4>
            <p>{e.detail}</p>
            <div className="case-meta">
              <span>Ref <b className="mono">{e.ref}</b></span><span>Owner <b>{e.owner}</b></span><span>Age <b>{e.ageDays}d</b></span>
            </div>
            <div className="case-foot">
              <div className="big-sm">{R(e.impact)}</div>
              {e.status === 'Open' ? <button onClick={() => setClosing(e)}>Investigate & close</button> : <span className="lbl">“{e.finding}” · {e.closedBy}</span>}
            </div>
          </div>
        ))}
        {!shown.length && <div className="card lbl">Nothing here. Enjoy a laddoo.</div>}
      </div>

      <h3 className="sub-h">Audit log</h3>
      <div className="card timeline">
        {audit.data.map((a, i) => (
          <div key={i} className="tl" style={{ '--i': i }}>
            <span className="tl-dot" />
            <span className="mono tl-time">{new Date(a.ts).toLocaleTimeString('en-IN')}</span>
            <b>{a.user}</b><span className="tl-act">{a.action}</span><span className="lbl">{a.detail}</span>
          </div>
        ))}
      </div>
      {closing && <ResolveModal ex={closing} onClose={() => setClosing(null)} />}
    </>
  );
}
