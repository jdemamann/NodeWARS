/* ================================================================
   NODE WARS v3 — Safe Storage
   Falls back to in-memory if localStorage is blocked (file:// URI,
   or restricted Android WebView).
   ================================================================ */

const _mem = {};
let _ok = false;

try {
  localStorage.setItem('_t', '1');
  localStorage.removeItem('_t');
  _ok = true;
} catch (e) { /* localStorage unavailable */ }

export const store = {
  set(k, v) {
    _mem[k] = v;
    if (_ok) try { localStorage.setItem(k, v); } catch (e) {}
  },
  get(k) {
    if (_ok) try {
      const r = localStorage.getItem(k);
      if (r !== null) return r;
    } catch (e) {}
    return _mem[k] ?? null;
  },
};
