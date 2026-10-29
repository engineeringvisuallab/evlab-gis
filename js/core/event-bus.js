const t = new EventTarget();
export const bus = {
  on: (n, f) => t.addEventListener(n, e => f(e.detail)),
  emit: (n, d) => t.dispatchEvent(new CustomEvent(n, { detail: d }))
};
