/* Motor Magix — smooth heightfield tracks */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = LTT.util;
  const TAU = U.TAU;
  const SAMPLE = 0.1; // metres per cached height sample

  function featureHeight(f, x) {
    const u = x - f.x;
    switch (f.type) {
      case 'ramp': {
        if (u <= 0 || u >= f.len) return 0;
        const t = u / f.len;
        return f.h * Math.pow(t, f.power || 2.35);
      }
      case 'trench': {
        if (u <= 0 || u >= f.w) return 0;
        const edge = f.edge || 4.5;
        const a = U.smoothstep(u / edge);
        const b = U.smoothstep((f.w - u) / edge);
        return -f.depth * Math.min(a, b);
      }
      case 'landing': {
        if (u <= 0) return 0;
        const t = U.clamp01(u / f.len);
        return -f.drop * U.smoothstep(t);
      }
      case 'table': {
        if (u <= 0 || u >= f.len) return 0;
        const rise = f.rise || Math.min(6, f.len * 0.3);
        const fall = f.fall || Math.min(7, f.len * 0.34);
        if (u < rise) return f.h * U.smoothstep(u / rise);
        if (u > f.len - fall) return f.h * U.smoothstep((f.len - u) / fall);
        return f.h;
      }
      case 'whoops': {
        if (u <= 0 || u >= f.len) return 0;
        const fade =
          U.smoothstep(U.clamp01(u / 7)) *
          U.smoothstep(U.clamp01((f.len - u) / 7));
        return (
          f.h *
          0.5 *
          (1 - Math.cos((u / f.len) * f.count * TAU)) *
          fade
        );
      }
      case 'drop': {
        if (u <= 0) return 0;
        return -f.drop * U.smoothstep(U.clamp01(u / f.len));
      }
      case 'bump': {
        if (u <= 0 || u >= f.len) return 0;
        return f.h * 0.5 * (1 - Math.cos((u / f.len) * TAU));
      }
      default:
        return 0;
    }
  }

  class Track {
    constructor(def) {
      this.def = def;
      this.length = def.length;
      this.startX = def.startX != null ? def.startX : 24;
      this.features = def.features || [];
      this.sines = def.sines || [];
      this._build();
      this.startY = this.heightAt(this.startX);
      this.finishX = def.finishX != null ? def.finishX : def.length - 40;
    }

    baseHeight(x) {
      const d = this.def;
      const mask = U.smoothstep(U.clamp01((x - 22) / 58));
      let y = d.startY + (d.trend || 0) * x * mask;
      for (let i = 0; i < this.sines.length; i++) {
        const s = this.sines[i];
        y += s.a * Math.sin((TAU * x) / s.w + s.p) * mask;
      }
      return y;
    }

    rawHeight(x) {
      let y = this.baseHeight(x);
      const fs = this.features;
      for (let i = 0; i < fs.length; i++) {
        const f = fs[i];
        /* cheap reject */
        if (x < f.x - 1) continue;
        if (f.type === 'landing' || f.type === 'drop') {
          if (x < f.x) continue;
        } else if (x > f.x + (f.len || f.w || 0) + 1) continue;
        y += featureHeight(f, x);
      }
      return y;
    }

    _build() {
      const n = Math.ceil(this.length / SAMPLE) + 3;
      const h = new Float32Array(n);
      const m = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        h[i] = this.rawHeight(i * SAMPLE);
      }
      for (let i = 0; i < n; i++) {
        const a = h[Math.max(0, i - 1)];
        const b = h[Math.min(n - 1, i + 1)];
        m[i] = (b - a) / (2 * SAMPLE);
      }
      this._h = h;
      this._m = m;
      this._n = n;
    }

    heightAt(x) {
      if (x <= 0) return this._h[0];
      if (x >= this.length) return this._h[this._n - 2];
      const fi = x / SAMPLE;
      const i = fi | 0;
      const t = fi - i;
      return this._h[i] * (1 - t) + this._h[i + 1] * t;
    }

    slopeAt(x) {
      if (x <= 0) return this._m[0];
      if (x >= this.length) return this._m[this._n - 2];
      const fi = x / SAMPLE;
      const i = fi | 0;
      const t = fi - i;
      return this._m[i] * (1 - t) + this._m[i + 1] * t;
    }

    normalAt(x) {
      const s = this.slopeAt(x);
      const inv = 1 / Math.sqrt(1 + s * s);
      return { x: -s * inv, y: inv };
    }

    tangentAt(x) {
      const s = this.slopeAt(x);
      const inv = 1 / Math.sqrt(1 + s * s);
      return { x: inv, y: s * inv };
    }

    angleAt(x) {
      return Math.atan(this.slopeAt(x));
    }

    /* average angle over a short span — smoother for spawning */
    avgAngleAt(x) {
      return Math.atan(
        (this.slopeAt(x - 1.2) + this.slopeAt(x) + this.slopeAt(x + 1.2)) / 3
      );
    }
  }

  /* ---------------- track plans ---------------- */

  function addGap(features, x, o) {
    const rampLen = o.rampLen;
    const width = o.width;
    features.push({ type: 'ramp', x, len: rampLen, h: o.h, power: o.power || 2.35 });
    features.push({
      type: 'trench',
      x: x + rampLen,
      w: width,
      depth: o.depth,
      edge: o.edge || 4.5,
    });
    features.push({
      type: 'landing',
      x: x + rampLen + width,
      len: o.landLen || 22,
      drop: o.landDrop || 3,
    });
    return x + rampLen + width + (o.landLen || 22);
  }

  function addWhoops(features, x, len, count, h) {
    features.push({ type: 'whoops', x, len, count, h });
    return x + len;
  }

  function addTable(features, x, len, h) {
    features.push({ type: 'table', x, len, h });
    return x + len;
  }

  /**
   * Build a flowing plan. Each level gets a distinct rhythm but the
   * grammar is shared: flow > gap > flow > whoops > table > gap ...
   */
  function makePlan(style, seed, length) {
    const rng = U.rng(seed);
    const features = [];
    const safe = [];
    const gapSpecs = style.gaps;
    let x = style.intro || 150;
    let gi = 0;
    let guard = 0;

    while (x < length - (style.outro || 170) && guard++ < 40) {
      /* an undulating run-up with occasional rhythm bumps */
      const flow = U.randRange(rng, style.flow[0], style.flow[1]);
      if (rng() < style.whoopsChance) {
        x = addWhoops(features, x + 8, U.randRange(rng, 26, 46), 3 + ((rng() * 3) | 0), U.randRange(rng, 0.35, 0.75));
      }
      x += flow;

      const spec = gapSpecs[gi % gapSpecs.length];
      const jitter = U.randRange(rng, -0.1, 0.1);
      addGap(features, x, {
        rampLen: spec.rampLen * (1 + jitter),
        h: spec.h * (1 + jitter * 0.7),
        width: spec.width * (1 + jitter * 1.4),
        depth: spec.depth * (1 + jitter * 0.5),
        edge: spec.edge || 4.5,
        landLen: spec.landLen,
        landDrop: spec.landDrop,
        power: spec.power,
      });
      x += spec.rampLen + spec.width + spec.landLen + U.randRange(rng, 46, 90);
      safe.push(x - 25);

      if (gi % 2 === 1) {
        x = addTable(features, x, U.randRange(rng, 20, 30), U.randRange(rng, 1.4, 2.6)) + 40;
        safe.push(x - 15);
      }
      gi++;
    }

    /* a final long descent to the finish */
    features.push({ type: 'drop', x: length - 210, len: 130, drop: 9 });
    safe.push(length - 70);
    return { features, safe };
  }

  LTT.Track = Track;
  LTT.trackTools = { makePlan, addGap, addWhoops, addTable, featureHeight };
})();
