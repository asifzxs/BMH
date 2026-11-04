import { createContext, useContext, useEffect, useState } from 'react';
import { toast, burst } from './fx.js';

let currentRole = 'Owner';
export const setApiRole = (r) => { currentRole = r; };

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-role': currentRole },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const AppCtx = createContext({ role: 'Owner', tick: 0, refresh() {} });

// Fetches `path`, refetching whenever the role changes or something calls refresh().
export function useLoad(path) {
  const { role, tick } = useContext(AppCtx);
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let live = true;
    api(path)
      .then((data) => live && setState({ data, error: null }))
      .catch((e) => live && setState({ data: null, error: e.message }));
    return () => { live = false; };
  }, [path, role, tick]);
  return state;
}

// POST helper that toasts the outcome, optionally celebrates, and refreshes every view.
export function useAct() {
  const { refresh } = useContext(AppCtx);
  return async (path, body, success, { party = false } = {}) => {
    try {
      const r = await api(path, { method: 'POST', body });
      toast(typeof success === 'function' ? success(r) : success);
      if (party) burst();
      refresh();
      return r;
    } catch (e) {
      toast(e.message, 'bad');
      return null;
    }
  };
}

export const R = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const RL = (n) => (n >= 1e5 ? '₹' + (n / 1e5).toFixed(2) + ' L' : R(n));
export const pct = (n, d = 0) => (n * 100).toFixed(d) + '%';
export const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
