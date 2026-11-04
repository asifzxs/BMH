import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppCtx, api, setApiRole, useLoad } from './api.js';
import { FxLayer } from './ui.jsx';
import CommandCenter from './views/CommandCenter.jsx';
import Procurement from './views/Procurement.jsx';
import Inventory from './views/Inventory.jsx';
import Production from './views/Production.jsx';
import Distribution from './views/Distribution.jsx';
import Traceability from './views/Traceability.jsx';
import Exceptions from './views/Exceptions.jsx';

const VIEWS = {
  'Command Center': CommandCenter, Procurement, Inventory, Production, Distribution, Traceability, 'Exceptions & Audit': Exceptions,
};
const ICONS = {
  'Command Center': '◉', Procurement: '⇄', Inventory: '▦', Production: '♨', Distribution: '➶', Traceability: '⛓', 'Exceptions & Audit': '⚑',
};

function Hero() {
  const line = (text, offset) =>
    [...text].map((ch, i) => (
      <span key={i} className="ch" style={{ '--d': `${(offset + i) * 35}ms`, '--k': offset + i }}>{ch === ' ' ? ' ' : ch}</span>
    ));
  return (
    <h1 className="hero" aria-label="Bhaskar’s Money Holege">
      <span className="hero-line" aria-hidden>{line('Bhaskar’s', 0)}</span>
      <span className="hero-line italic" aria-hidden>{line('Money Holege', 9)}</span>
    </h1>
  );
}

function Stamp() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="stamp" aria-hidden>
      <svg viewBox="0 0 200 200" className="stamp-ring">
        <defs><path id="circ" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
        <text><textPath href="#circ">EVERY GRAM TRACED ✦ EVERY ADJUSTMENT SIGNED ✦ BMH CONTROL TOWER ✦ </textPath></text>
      </svg>
      <div className="stamp-core">
        <b>BMH</b>
        <span>{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        <i className="live-dot" /> LIVE
      </div>
    </div>
  );
}

function Tapes() {
  const { data } = useLoad('/ticker');
  const items = data?.length ? data : ['Loading the floor…'];
  const strip = (cls, list) => (
    <div className={`tape ${cls}`}>
      <div className="tape-track">
        {[0, 1].map((k) => (
          <span key={k} aria-hidden={k === 1}>{list.map((t, i) => <em key={i}>{t}</em>)}</span>
        ))}
      </div>
    </div>
  );
  return (
    <div className="tapes">
      {strip('gold', items)}
      {strip('rose rev', ['KAJU KATLI', 'MYSORE PAK', 'BESAN LADOO', 'SOAN PAPDI', 'MOTICHOOR', 'FEFO OR BUST', 'MAKER ✕ CHECKER', 'NO SILENT STOCK CHANGES'])}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState('Owner');
  const [me, setMe] = useState(null);
  const [view, setView] = useState('Command Center');
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  setApiRole(role); // must be set before children fetch on this render

  useEffect(() => {
    api('/me').then((m) => {
      setMe(m);
      setView((v) => (m.tabs.includes(v) ? v : m.tabs[0]));
    });
  }, [role]);

  useEffect(() => {
    const move = (e) => {
      document.documentElement.style.setProperty('--mx', e.clientX + 'px');
      document.documentElement.style.setProperty('--my', e.clientY + 'px');
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const ctx = useMemo(() => ({ role, tick, refresh, me }), [role, tick, refresh, me]);
  const View = VIEWS[view];

  return (
    <AppCtx.Provider value={ctx}>
      <div className="aurora" aria-hidden><i /><i /><i /><i /></div>
      <div className="spotlight" aria-hidden />
      <div className="grain" aria-hidden />

      <header className="masthead">
        <div className="eyebrow"><span className="live-dot" /> Control tower · Tamil Nadu · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <Hero />
        <p className="sub">Procurement, production, stock, dispatch and franchise outlets on one screen. <b>Every gram traced, every adjustment signed.</b></p>
        <Stamp />
      </header>

      <Tapes key={role + tick} />

      <nav className="nav">
        <div className="tabs" role="tablist">
          {(me?.tabs || []).map((t) => (
            <button key={t} role="tab" aria-selected={t === view} className={t === view ? 'on' : ''} onClick={() => setView(t)}>
              <span className="ico">{ICONS[t]}</span>{t}
            </button>
          ))}
        </div>
        <label className="role">
          <span className="avatar">{role[0]}</span>
          <span className="role-txt"><small>Signed in as</small>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {(me?.roles || [{ id: 'Owner', label: 'Owner' }]).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </span>
        </label>
      </nav>

      <main key={view + role} className="view-enter">
        {me?.role === role && me.tabs.includes(view) && <View />}
      </main>

      <footer className="foot-note">
        BMH Control Tower · demo data resets when the API restarts · anomalies are signals to investigate, not proof of wrongdoing
      </footer>
      <FxLayer />
    </AppCtx.Provider>
  );
}
