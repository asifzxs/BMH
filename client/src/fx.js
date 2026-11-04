// Tiny event bus for toasts and confetti so any component can trigger them.
const subs = new Set();
export const fx = {
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
  emit(e) { subs.forEach((fn) => fn(e)); },
};

let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
window.addEventListener('pointerdown', (e) => { lastPointer = { x: e.clientX, y: e.clientY }; }, true);

export const toast = (msg, tone = 'ok') => fx.emit({ type: 'toast', msg, tone });
export const burst = () => fx.emit({ type: 'burst', ...lastPointer });
