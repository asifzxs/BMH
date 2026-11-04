import { useEffect, useRef, useState } from 'react';
import { fx } from './fx.js';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ITEM_COLORS = {
  Besan: '#FFB020', Sugar: '#FFF1DC', Ghee: '#FFD66B', Cashew: '#FF8A5B',
  Khoa: '#F7C6D0', Cardamom: '#8FE36A', Pista: '#5FD4A8', 'Gift box': '#B98CFF',
};

export function CountUp({ value, format = (v) => Math.round(v), dur = 1200 }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { setV(value); from.current = value; return; }
    const start = performance.now(), a = from.current;
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const cur = a + (value - a) * (1 - Math.pow(1 - p, 4));
      setV(cur);
      from.current = cur;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // Background tabs pause rAF; make sure the real number still lands.
    const done = setTimeout(() => { cancelAnimationFrame(raf); setV(value); from.current = value; }, dur + 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); };
  }, [value, dur]);
  return <>{format(v)}</>;
}

// Card that leans toward the cursor and carries a spotlight.
export function Tilt({ children, className = '', ...rest }) {
  const ref = useRef();
  const move = (e) => {
    const el = ref.current, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${-y * 9}deg`);
    el.style.setProperty('--ry', `${x * 11}deg`);
    el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const leave = () => { ref.current.style.setProperty('--rx', '0deg'); ref.current.style.setProperty('--ry', '0deg'); };
  return (
    <div ref={ref} className={`card tilt ${className}`} onMouseMove={move} onMouseLeave={leave} {...rest}>
      {children}
    </div>
  );
}

export function Kpi({ label, value, format, foot, tone, spark, i = 0 }) {
  return (
    <Tilt className={`kpi ${tone || ''}`} style={{ '--i': i }}>
      <div className="lbl">{label}</div>
      <div className="big"><CountUp value={value} format={format} /></div>
      {foot && <div className="foot">{foot}</div>}
      {spark && <Spark data={spark} />}
    </Tilt>
  );
}

export function Spark({ data, h = 44 }) {
  const w = 200, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / (max - min || 1)) * (h - 6) - 3]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sp" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" stopOpacity=".55" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L${w},${h}L0,${h}Z`} fill="url(#sp)" />
      <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Bars({ items, format, onPick, height = 220 }) {
  const max = Math.max(...items.map((x) => x.value), 1);
  return (
    <div className="bars" style={{ height }}>
      {items.map((x, i) => (
        <button key={x.label} className="bar" style={{ '--h': `${(x.value / max) * 100}%`, '--i': i }}
          onClick={() => onPick?.(x)} title={`${x.label}: ${format(x.value)}`} disabled={!onPick}>
          <span className="bar-val">{format(x.value)}</span>
          <span className="bar-fill" />
          <span className="bar-lbl">{x.short ?? x.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Donut({ segments, center, sub, size = 200 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 80, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg className="donut" viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={center}>
      <circle cx="100" cy="100" r={r} fill="none" stroke="var(--line)" strokeWidth="22" />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const el = (
          <circle key={s.label} cx="100" cy="100" r={r} fill="none" stroke={s.color} strokeWidth="22"
            strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-acc}
            transform="rotate(-90 100 100)" className="donut-seg" style={{ '--i': i }}>
            <title>{s.label}</title>
          </circle>
        );
        acc += len;
        return el;
      })}
      <text x="100" y="98" textAnchor="middle" className="donut-c">{center}</text>
      <text x="100" y="122" textAnchor="middle" className="donut-s">{sub}</text>
    </svg>
  );
}

export function Gauge({ value, label }) {
  const r = 80, c = Math.PI * r;
  return (
    <svg className="gauge" viewBox="0 0 200 120" role="img" aria-label={`${label} ${Math.round(value * 100)}%`}>
      <defs>
        <linearGradient id="gg" x1="0" x2="1">
          <stop offset="0" stopColor="var(--rose)" />
          <stop offset=".6" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--lime)" />
        </linearGradient>
      </defs>
      <path d="M20,105 A80,80 0 0 1 180,105" fill="none" stroke="var(--line)" strokeWidth="16" strokeLinecap="round" />
      <path d="M20,105 A80,80 0 0 1 180,105" fill="none" stroke="url(#gg)" strokeWidth="16" strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`} className="gauge-arc" />
      <text x="100" y="96" textAnchor="middle" className="donut-c">{Math.round(value * 100)}%</text>
      <text x="100" y="116" textAnchor="middle" className="donut-s">{label}</text>
    </svg>
  );
}

export function Ring({ value, max = 100, label, color = 'var(--gold)' }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${(value / max) * c} ${c}`} transform="rotate(-90 32 32)" className="ring-arc" />
      </svg>
      <div><b>{label}</b></div>
    </div>
  );
}

export const Tag = ({ tone = '', children, pulse }) => <span className={`tag ${tone} ${pulse ? 'pulse' : ''}`}>{children}</span>;

export function Section({ kicker, title, note, children }) {
  return (
    <div className="section-head">
      <div>
        <div className="kicker">{kicker}</div>
        <h2>{title}</h2>
        {note && <p className="lbl">{note}</p>}
      </div>
      {children && <div className="section-tools">{children}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="ghost x" onClick={onClose} aria-label="Close">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export const Loading = ({ error }) =>
  error ? <div className="card err">⚠ {error}</div> : <div className="loading"><span /><span /><span /></div>;

// Toasts and confetti.
const CONFETTI = ['#FFB020', '#FF5D7A', '#8FE36A', '#FFF1DC', '#B98CFF', '#5FD4A8'];
export function FxLayer() {
  const [toasts, setToasts] = useState([]);
  const [bits, setBits] = useState([]);
  useEffect(() => fx.on((e) => {
    const id = Math.random();
    if (e.type === 'toast') {
      setToasts((t) => [...t.slice(-2), { id, ...e }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    }
    if (e.type === 'burst' && !reduced()) {
      const pieces = Array.from({ length: 70 }, (_, i) => {
        const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
        return {
          id: id + i, x: e.x, y: e.y, dx: Math.cos(a) * d, dy: Math.sin(a) * d - 140,
          r: Math.random() * 720 - 360, c: CONFETTI[i % CONFETTI.length], round: i % 3 === 0,
        };
      });
      setBits((b) => [...b, ...pieces]);
      setTimeout(() => setBits((b) => b.filter((p) => !pieces.includes(p))), 1600);
    }
  }), []);
  return (
    <>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.tone}`}>{t.tone === 'bad' ? '✋ ' : '✦ '}{t.msg}</div>)}
      </div>
      {bits.map((p) => (
        <i key={p.id} className={`confetti ${p.round ? 'round' : ''}`}
          style={{ left: p.x, top: p.y, background: p.c, '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--r': `${p.r}deg` }} />
      ))}
    </>
  );
}
