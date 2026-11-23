/* Motor Magix — camera, pseudo-3D terrain, particles, post */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = LTT.util;
  const PPM = 42;

  const Render = {
    W: 0,
    H: 0,
    dpr: 1,
    cam: { x: 0, y: 0, zoom: 0.95 },
    track: null,
    level: null,
    levelIndex: 0,
    pal: null,
    bike: null,
    time: 0,
    mode: 'title',
    particles: [],
    shake: 0,
    alpha: 1,
    fade: 0,
    flashA: 0,
    flashColor: null,
    attractT: 0,
  };

  Render.init = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.skyGrad = null;
    this.cloudSprites = null;
    this._stars = null;
    this._lastLevel = -1;
  };

  Render.resize = function () {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.dpr = dpr;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.floor(this.W * dpr);
    this.canvas.height = Math.floor(this.H * dpr);
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.buildVignette();
    this.buildSky();
    if (this.level) {
      this.cloudSprites = null;
      LTT.RenderArt.prepare(this);
    }
  };

  Render.setLevel = function (index, track) {
    if (this.levelIndex === index && this.level === LTT.LEVELS[index]) return;
    this.levelIndex = index;
    this.level = LTT.LEVELS[index];
    this.track = track;
    this.pal = this.level.palette;
    this.cloudSprites = null;
    this._stars = null;
    this.buildSky();
    LTT.RenderArt.prepare(this);
  };

  Render.buildSky = function () {
    if (!this.pal || !this.W) return;
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    const p = this.pal.sky;
    g.addColorStop(0, U.rgba(p[0]));
    g.addColorStop(0.46, U.rgba(p[1]));
    g.addColorStop(0.74, U.rgba(p[2]));
    g.addColorStop(0.86, U.rgba(this.pal.horizon));
    g.addColorStop(1, U.rgba(this.pal.fog));
    this.skyGrad = g;
  };

  Render.buildVignette = function () {
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.floor(this.W / 2));
    c.height = Math.max(2, Math.floor(this.H / 2));
    const g = c.getContext('2d');
    const rad = g.createRadialGradient(
      c.width * 0.5, c.height * 0.5, Math.min(c.width, c.height) * 0.26,
      c.width * 0.5, c.height * 0.5, Math.max(c.width, c.height) * 0.72
    );
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(0.62, 'rgba(0,0,0,0.18)');
    rad.addColorStop(1, 'rgba(0,0,0,0.72)');
    g.fillStyle = rad;
    g.fillRect(0, 0, c.width, c.height);
    this.vignette = c;
  };

  Render.setMode = function (mode) {
    this.mode = mode;
    if (mode === 'title' || mode === 'select') this.attractT = 0;
  };

  Render.snapCamera = function (bike) {
    if (!bike) return;
    const frac = this.bikeFrac();
    this.cam.x = bike.x + 4;
    this.cam.y = bike.y + ((frac - 0.64) * this.H) / (PPM * 0.9);
    this.cam.zoom = 0.9;
  };

  /* where the bike sits vertically — lower on tall screens, higher on
     short landscape phones so the touch pads never cover it */
  Render.bikeFrac = function () {
    return U.clamp(0.78 - Math.max(0, 720 - this.H) * 0.00036, 0.66, 0.78);
  };

  Render.update = function (dt, bike, input) {
    this.time += dt;
    this.bike = bike;

    /* post-effect decay */
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt * 2.6);
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 1.4);

    const cam = this.cam;
    const playing = this.mode === 'playing' || this.mode === 'countdown' || this.mode === 'paused' || this.mode === 'results';

    if (bike && playing) {
      const sp = Math.hypot(bike.vx, bike.vy);
      const look = 2.4 + bike.vx * 0.34;
      const targetX = bike.x + look;
      const frac = this.bikeFrac();
      const targetY =
        bike.y +
        ((frac - 0.64) * this.H) / (PPM * Math.max(0.5, cam.zoom)) +
        Math.min(1.4, sp * 0.04);
      const airK = bike.airborne ? 1 : 0;
      let targetZoom = U.clamp(1.06 - sp * 0.0105 - airK * 0.10, 0.70, 1.12);
      if (bike.crashed) targetZoom = 1.05;

      cam.x = U.damp(cam.x, targetX, 3.4, dt);
      cam.y = U.damp(cam.y, targetY, 3.1, dt);
      cam.zoom = U.damp(cam.zoom, targetZoom, 1.9, dt);
    } else {
      /* attract mode: a slow cinematic drift over the beginning of the road */
      this.attractT += dt;
      const t = this.attractT * 0.05;
      const len = this.track ? this.track.length : 400;
      let targetX;
      let targetZoom = 0.92;
      if (this.mode === 'title') {
        targetX = 68 + Math.sin(t * 0.9) * 16;
        targetZoom = 0.98;
      } else {
        targetX = 60 + (Math.sin(t * 0.8) * 0.5 + 0.5) * Math.min(300, len * 0.22);
      }
      const targetY = this.track ? this.track.heightAt(targetX) + 7 : 40;
      if (this.attractT < 0.12) {
        cam.x = targetX;
        cam.y = targetY;
        cam.zoom = targetZoom;
      }
      cam.x = U.damp(cam.x, targetX, 1.1, dt);
      cam.y = U.damp(cam.y, targetY, 1.2, dt);
      cam.zoom = U.damp(cam.zoom, targetZoom, 1.2, dt);
    }

    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.updateParticles(dt, bike, input);
  };

  Render.sx = function (x) {
    return this.W * 0.5 + (x - this.cam.x) * PPM * this.cam.zoom;
  };
  Render.sy = function (y) {
    return this.H * 0.64 - (y - this.cam.y) * PPM * this.cam.zoom;
  };
  Render.scale = function () {
    return PPM * this.cam.zoom;
  };
  Render.worldLeft = function () {
    return this.cam.x - (this.W * 0.5) / this.scale();
  };
  Render.worldRight = function () {
    return this.cam.x + (this.W * 0.5) / this.scale();
  };

  /* ------------------------------------------------------------------ */
  /*  particles                                                         */
  /* ------------------------------------------------------------------ */
  Render.spawnDust = function (x, y, count, power, color, dir) {
    const max = 230;
    for (let i = 0; i < count && this.particles.length < max; i++) {
      const a = Math.random() * Math.PI;
      const v = (0.4 + Math.random() * 1.7) * power;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.5,
        y: y + Math.random() * 0.3,
        vx: -1.2 * power - Math.cos(a) * v + (dir || 0),
        vy: Math.sin(a) * v * 0.8 + 0.7,
        life: 0.6 + Math.random() * 1.1,
        max: 1.7,
        size: 0.10 + Math.random() * 0.32,
        color: color || this.pal.ground.dirt,
        front: Math.random() < 0.35,
        grav: 1.6,
      });
    }
  };

  Render.spawnSpark = function (x, y, color) {
    if (this.particles.length > 230) return;
    this.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2.4,
      life: 0.3 + Math.random() * 0.5,
      max: 0.8,
      size: 0.03 + Math.random() * 0.06,
      color: color,
      front: true,
      grav: 5,
    });
  };

  Render.updateParticles = function (dt, bike) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps.splice(i, 1);
        continue;
      }
      p.vy -= p.grav * dt;
      p.vx *= 1 - 0.7 * dt;
      p.vy *= 1 - 0.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (!bike || this.mode !== 'playing') return;
    const contact = bike.wheels[0].contact;
    const sp = Math.hypot(bike.vx, bike.vy);
    if (contact && !bike.airborne && bike.throttle > 0.18 && sp > 2.5) {
      const n = bike.wheels[0].slip > 0.15 ? 3 : 1;
      if (Math.random() < 0.55) {
        this.spawnDust(contact.x, contact.y + 0.05, n, 0.4 + bike.throttle * 0.8, null, -bike.vx * 0.06);
      }
    }
    if (bike.justLanded && bike.lastAir > 0.4) {
      const f = bike.wheels[1].contact || bike.wheels[0].contact;
      if (f) {
        this.spawnDust(f.x, f.y, Math.min(18, 6 + (bike.lastAir * 6) | 0), 1.3, null, 0);
        this.shake = Math.min(0.7, 0.18 + bike.lastAir * 0.2);
      }
    }
    if (bike.airborne && sp > 14 && Math.random() < 0.35) {
      const w = bike.wheels[1].world;
      if (w) this.spawnDust(w.x, w.y, 1, 0.3, this.pal.rimLight, -4);
    }
  };

  Render.drawParticles = function (front) {
    const ctx = this.ctx;
    const s = this.scale();
    for (const p of this.particles) {
      if (!!p.front !== front) continue;
      const a = U.clamp01(p.life / p.max);
      const sx = this.sx(p.x);
      if (sx < -60 || sx > this.W + 60) continue;
      const sy = this.sy(p.y);
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = U.rgba(p.color);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.6, p.size * s * (0.5 + a * 0.7)), 0, U.TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /* ------------------------------------------------------------------ */
  /*  terrain                                                           */
  /* ------------------------------------------------------------------ */
  Render.drawTerrain = function () {
    const ctx = this.ctx;
    const tr = this.track;
    const pal = this.pal;
    if (!tr) return;

    const s = this.scale();
    const left = this.worldLeft() - 14;
    const right = this.worldRight() + 14;
    /* ~2.6 px sampling keeps the crest smooth without flooding the path */
    const step = 2.6 / s;
    const pts = [];
    for (let x = left; x <= right; x += step) {
      pts.push(this.sx(x), this.sy(tr.heightAt(x)));
    }
    const n = pts.length;
    if (n < 8) return;

    const bandH = U.clamp(1.05 * s, 10, 64);
    const topCol = pal.ground.top;
    const faceCol = pal.ground.face;
    const deepCol = pal.ground.deep;
    const strataCol = pal.ground.strata;
    const rimCol = pal.ground.rim;

    /* a strip that hangs `d0`..`d1` metres below the *local* crest */
    const ribbon = (d0, d1) => {
      const p = new Path2D();
      const y0 = d0 * s;
      const y1 = d1 * s;
      p.moveTo(pts[0], pts[1] + y0);
      for (let i = 2; i < n; i += 2) p.lineTo(pts[i], pts[i + 1] + y0);
      for (let i = n - 2; i >= 0; i -= 2) p.lineTo(pts[i], pts[i + 1] + y1);
      p.closePath();
      return p;
    };

    /* ---------------- embankment face ---------------- */
    const face = new Path2D();
    face.moveTo(pts[0], this.H + 60);
    for (let i = 0; i < n; i += 2) face.lineTo(pts[i], pts[i + 1]);
    face.lineTo(pts[n - 2], this.H + 60);
    face.closePath();

    ctx.save();
    ctx.clip(face);

    /* base tone: everything below the painted soil bands */
    ctx.fillStyle = U.rgba(deepCol);
    ctx.fillRect(0, 0, this.W, this.H + 80);

    /* soil bands follow the crest, so a climb never turns pale green */
    const RIB = [
      [0.0, 0.18, U.lighten(topCol, 0.06)],
      [0.18, 0.4, topCol],
      [0.4, 0.74, U.mixColor(topCol, faceCol, 0.4)],
      [0.74, 1.25, U.mixColor(topCol, faceCol, 0.72)],
      [1.25, 2.0, faceCol],
      [2.0, 3.0, U.mixColor(faceCol, deepCol, 0.34)],
      [3.0, 4.5, U.mixColor(faceCol, deepCol, 0.6)],
      [4.5, 6.8, U.mixColor(faceCol, deepCol, 0.82)],
      [6.8, 10.5, U.mixColor(deepCol, faceCol, 0.05)],
    ];
    for (let i = 0; i < RIB.length; i++) {
      ctx.fillStyle = U.rgba(RIB[i][2]);
      ctx.fill(ribbon(RIB[i][0], RIB[i][1]));
    }

    /* strata seams, layered with the hill */
    ctx.lineJoin = 'round';
    const depths = [1.2, 2.05, 3.1, 4.6, 6.6];
    for (let k = 0; k < depths.length; k++) {
      ctx.globalAlpha = 0.09 + (k % 3) * 0.032;
      ctx.strokeStyle = U.rgba(strataCol);
      ctx.lineWidth = Math.max(1, (0.018 + (k % 3) * 0.012) * s);
      ctx.beginPath();
      for (let i = 0; i < n; i += 2) {
        const wy =
          pts[i + 1] +
          depths[k] * s +
          Math.sin(pts[i] * 0.011 + k * 2.3) * 0.05 * s +
          Math.sin(pts[i] * 0.0032 + k) * 0.1 * s;
        if (i === 0) ctx.moveTo(pts[i], wy);
        else ctx.lineTo(pts[i], wy);
      }
      ctx.stroke();
    }

    /* embedded stones & scars */
    const rockStep = 1.9;
    for (let wx = Math.floor(left / rockStep) * rockStep; wx < right; wx += rockStep) {
      const hx = U.hash(wx * 0.37 + 11);
      if (hx > 0.45) continue;
      const depth = 0.7 + hx * 5.4;
      const x = this.sx(wx);
      const y = this.sy(tr.heightAt(wx)) + depth * s;
      if (y > this.H + 12) continue;
      ctx.globalAlpha = 0.13 + hx * 0.15;
      ctx.fillStyle = U.rgba(strataCol);
      ctx.beginPath();
      ctx.ellipse(x, y, 1 + hx * 3.4, 0.7 + hx * 1.7, hx * 2, 0, U.TAU);
      ctx.fill();
    }

    /* thin shadow right under the crest */
    ctx.globalAlpha = 1;
    ctx.fillStyle = U.rgba(deepCol, 0.32);
    ctx.fill(ribbon(0, 0.13));
    ctx.restore();

    /* ---------------- receding surface band ---------------- */
    const bandAt = (f0, f1) => {
      const p = new Path2D();
      const y0 = -bandH * f0;
      const y1 = -bandH * f1;
      p.moveTo(pts[0], pts[1] + y0);
      for (let i = 2; i < n; i += 2) p.lineTo(pts[i], pts[i + 1] + y0);
      for (let i = n - 2; i >= 0; i -= 2) p.lineTo(pts[i], pts[i + 1] + y1);
      p.closePath();
      return p;
    };
    const back = bandAt(1, 0);
    const theme = this.level.id;
    const roadCol =
      theme === 'urban' ? topCol : U.mixColor(pal.ground.dirt, topCol, 0.34);

    ctx.fillStyle = U.rgba(U.mixColor(roadCol, pal.horizon, 0.12));
    ctx.fill(back);
    /* grassy verge on the near lip */
    ctx.fillStyle = U.rgba(U.mixColor(topCol, roadCol, 0.4));
    ctx.fill(bandAt(0.16, 0));
    ctx.fillStyle = U.rgba(U.mixColor(roadCol, pal.horizon, 0.34));
    ctx.fill(bandAt(1, 0.8));

    ctx.save();
    ctx.clip(back);

    /* wheel ruts / lane */
    if (theme === 'urban') {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = U.rgba(U.lighten(rimCol, 0.02), 0.8);
      ctx.lineWidth = Math.max(1.5, 0.055 * s);
      ctx.setLineDash([s * 0.9, s * 0.75]);
      ctx.beginPath();
      for (let i = 0; i < n; i += 2) {
        const y = pts[i + 1] - bandH * 0.55;
        if (i === 0) ctx.moveTo(pts[i], y);
        else ctx.lineTo(pts[i], y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      /* twin ruts worn into the dirt */
      for (let k = 0; k < 2; k++) {
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = U.rgba(deepCol);
        ctx.lineWidth = Math.max(1, 0.05 * s);
        ctx.beginPath();
        for (let i = 0; i < n; i += 2) {
          const y = pts[i + 1] - bandH * (0.34 + k * 0.26);
          if (i === 0) ctx.moveTo(pts[i], y);
          else ctx.lineTo(pts[i], y);
        }
        ctx.stroke();
      }
    }

    /* gravel speckle across the surface */
    const gsp = 0.55;
    for (let wx = Math.floor(left / gsp) * gsp; wx < right; wx += gsp) {
      const hx = U.hash(wx * 0.91 + 3);
      if (hx < 0.62) continue;
      const x = this.sx(wx);
      const y = this.sy(tr.heightAt(wx)) - bandH * (0.15 + hx * 0.8);
      const warm = hx > 0.85;
      ctx.globalAlpha = 0.18 + (hx - 0.62) * 0.5;
      ctx.fillStyle = warm ? U.rgba(rimCol) : U.rgba(deepCol);
      ctx.fillRect(x, y, 1 + hx * 1.8, 1);
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = U.rgba(rimCol, 0.26);
    ctx.lineWidth = Math.max(1.5, 0.045 * s);
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) {
      const y = pts[i + 1] - bandH * 1.02;
      if (i === 0) ctx.moveTo(pts[i], y);
      else ctx.lineTo(pts[i], y);
    }
    ctx.stroke();
    ctx.restore();

    /* ---------------- crown rim light ---------------- */
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) {
      if (i === 0) ctx.moveTo(pts[i], pts[i + 1]);
      else ctx.lineTo(pts[i], pts[i + 1]);
    }
    ctx.strokeStyle = U.rgba(deepCol, 0.5);
    ctx.lineWidth = Math.max(1, 0.03 * s);
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -Math.max(1.2, 0.028 * s));
    ctx.strokeStyle = U.rgba(rimCol, 0.85);
    ctx.lineWidth = Math.max(1.4, 0.05 * s);
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) {
      if (i === 0) ctx.moveTo(pts[i], pts[i + 1]);
      else ctx.lineTo(pts[i], pts[i + 1]);
    }
    ctx.stroke();
    ctx.restore();

    this._terrainPts = pts;
    this._bandH = bandH;
  };

  /* ------------------------------------------------------------------ */
  /*  valley mist                                                       */
  /*  a soft band that sits between the backdrop and the road so the     */
  /*  space under a jump reads as hazy distance instead of empty sky    */
  /* ------------------------------------------------------------------ */
  Render.drawValleyMist = function () {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const pal = this.pal;
    if (!pal) return;
    const fog = pal.fog;
    const city = this.level && this.level.id === 'urban';
    const top = H * 0.54;
    const bottom = H * 0.96;

    const g = ctx.createLinearGradient(0, top, 0, bottom);
    const peak = city ? 0.075 : 0.15;
    g.addColorStop(0, U.rgba(fog, 0));
    g.addColorStop(0.34, U.rgba(fog, peak * 0.4));
    g.addColorStop(0.58, U.rgba(fog, peak));
    g.addColorStop(0.8, U.rgba(fog, peak * 0.62));
    g.addColorStop(1, U.rgba(fog, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-20, top, W + 40, bottom - top);

    /* two slow drifting wisps give the mist a little movement */
    const drift = (this.time * 8) % (W + 400) - 200;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, top, W + 40, bottom - top);
    ctx.clip();
    for (let k = 0; k < 2; k++) {
      const y = H * (0.7 + k * 0.07);
      const h = H * (0.06 - k * 0.012);
      const wg = ctx.createLinearGradient(0, y - h, 0, y + h);
      wg.addColorStop(0, U.rgba(fog, 0));
      wg.addColorStop(0.5, U.rgba(fog, city ? 0.05 : 0.08));
      wg.addColorStop(1, U.rgba(fog, 0));
      ctx.fillStyle = wg;
      const ox = k ? -drift * 0.6 : drift;
      ctx.fillRect(ox - 160, y - h, W + 360, h * 2);
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ */
  /*  main draw                                                         */
  /* ------------------------------------------------------------------ */
  Render.draw = function () {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const pal = this.pal;
    if (!pal) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    /* camera shake */
    let ox = 0;
    let oy = 0;
    if (this.shake > 0.001) {
      ox = (Math.random() - 0.5) * this.shake * 9;
      oy = (Math.random() - 0.5) * this.shake * 7;
    }
    ctx.save();
    ctx.translate(ox, oy);

    ctx.fillStyle = this.skyGrad || '#000';
    ctx.fillRect(-20, -20, W + 40, H + 40);

    const Art = LTT.RenderArt;
    this._stage = 'sky';
    Art.drawSky(this);
    this._stage = 'backdrop';
    Art.drawBackdrop(this);
    this._stage = 'mist';
    this.drawValleyMist();
    this._stage = 'props';
    Art.drawMidProps(this);
    this._stage = 'terrain';
    this.drawTerrain();
    this._stage = 'decor';
    Art.drawGroundDecor(this);
    this._stage = 'particles';
    this.drawParticles(false);
    Art.drawBike(this, this.bike);
    this._stage = 'fg';
    this.drawParticles(true);
    Art.drawForeground(this);
    ctx.restore();

    this._stage = 'post';
    Art.drawPost(this);
    this._stage = 'done';
  };

  LTT.Render = Render;
})();
