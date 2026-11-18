/* LANG TUNG TING — shared math & helpers */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = {};

  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (b - a === 0 ? 0 : (v - a) / (b - a));
  U.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  U.smoothstep = (t) => {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  };
  U.sstep = (a, b, x) => U.smoothstep(U.invLerp(a, b, x));
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  U.damp = (current, target, lambda, dt) =>
    target + (current - target) * Math.exp(-lambda * dt);
  U.dampVec = (cx, cy, tx, ty, lambda, dt) => {
    const k = Math.exp(-lambda * dt);
    return [tx + (cx - tx) * k, ty + (cy - ty) * k];
  };
  U.angleDelta = (a, b) => {
    let d = (a - b) % U.TAU;
    if (d > Math.PI) d -= U.TAU;
    if (d < -Math.PI) d += U.TAU;
    return d;
  };
  U.dampAngle = (current, target, lambda, dt) => {
    const d = U.angleDelta(target, current);
    return current + d * (1 - Math.exp(-lambda * dt));
  };
  U.hypot = (x, y) => Math.sqrt(x * x + y * y);

  /* deterministic RNG */
  U.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash = function (n) {
    let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  U.hash2 = function (a, b) {
    return U.hash(a * 113.5 + b * 271.9);
  };
  U.randRange = (rng, a, b) => a + (b - a) * rng();
  U.pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

  /* cubic hermite segment */
  U.hermite = function (y0, y1, m0, m1, dx, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * y0 + h10 * dx * m0 + h01 * y1 + h11 * dx * m1;
  };

  U.fmtTime = function (sec) {
    if (sec == null || !isFinite(sec)) return '--:--.--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return (
      String(m).padStart(2, '0') +
      ':' +
      String(s).padStart(2, '0') +
      '.' +
      String(cs).padStart(2, '0')
    );
  };
  U.fmtDelta = function (sec) {
    if (sec == null || !isFinite(sec)) return '';
    const sign = sec < 0 ? '-' : '+';
    const v = Math.abs(sec);
    const s = Math.floor(v);
    const cs = Math.floor((v % 1) * 100);
    return sign + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
  };
  U.fmtShort = function (sec) {
    if (sec == null || !isFinite(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  };
  U.clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  /* rgba helper for procedural art */
  U.rgba = function (c, a) {
    if (typeof c === 'string') return c;
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
  };
  U.mixColor = function (a, b, t) {
    return [
      Math.round(U.lerp(a[0], b[0], t)),
      Math.round(U.lerp(a[1], b[1], t)),
      Math.round(U.lerp(a[2], b[2], t)),
    ];
  };
  U.lighten = function (c, amt) {
    return [
      U.clamp(Math.round(c[0] + 255 * amt), 0, 255),
      U.clamp(Math.round(c[1] + 255 * amt), 0, 255),
      U.clamp(Math.round(c[2] + 255 * amt), 0, 255),
    ];
  };

  LTT.util = U;
})();
