/* Motor Magix â€” painterly scenery, props, rider and post */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = LTT.util;
  const TAU = U.TAU;

  const Art = {};

  function rgba(c, a) {
    return U.rgba(c, a);
  }
  function mix(a, b, t) {
    return U.mixColor(a, b, t);
  }
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  /* ------------------------------------------------------------------ */
  /*  preparation                                                       */
  /* ------------------------------------------------------------------ */
  Art.prepare = function (R) {
    const pal = R.pal;
    const rng = U.rng(1234 + R.levelIndex * 77);
    const clouds = [];
    for (let k = 0; k < 5; k++) {
      const c = document.createElement('canvas');
      c.width = 520;
      c.height = 230;
      const g = c.getContext('2d');
      const puffs = 7 + ((rng() * 5) | 0);
      for (let i = 0; i < puffs; i++) {
        const px = 80 + rng() * 360;
        const py = 100 + rng() * 60;
        const rr = 38 + rng() * 66;
        const gr = g.createRadialGradient(px, py, rr * 0.1, px, py, rr);
        const a = 0.18 + rng() * 0.2;
        gr.addColorStop(0, rgba(pal.cloud, a));
        gr.addColorStop(0.55, rgba(pal.cloud, a * 0.55));
        gr.addColorStop(1, rgba(pal.cloud, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(px, py, rr, 0, TAU);
        g.fill();
      }
      clouds.push(c);
    }
    R.cloudSprites = clouds;
    const stars = [];
    if (R.level.id === 'urban' || R.level.id === 'canyon') {
      for (let i = 0; i < 70; i++) {
        stars.push({
          x: rng(),
          y: rng() * 0.5,
          r: 0.5 + rng() * 1.3,
          a: 0.15 + rng() * 0.5,
        });
      }
    }
    R._stars = stars;
    R._cloudSeed = rng() * 100;
    R._birdPhase = rng() * TAU;
  };

  /* ------------------------------------------------------------------ */
  /*  sky                                                               */
  /* ------------------------------------------------------------------ */
  Art.drawSky = function (R) {
    const ctx = R.ctx;
    const W = R.W;
    const H = R.H;
    const pal = R.pal;
    const time = R.time;
    const sun = pal.sun;
    const sx = W * sun.x;
    const sy = H * sun.y;
    const sr = W * sun.r;
    R.sunScreen = { x: sx, y: sy, r: sr };

    /* stars */
    if (R._stars && R._stars.length) {
      ctx.globalCompositeOperation = 'screen';
      for (const st of R._stars) {
        const tw = 0.55 + 0.45 * Math.sin(time * 1.3 + st.x * 40);
        ctx.globalAlpha = st.a * tw * 0.8;
        ctx.fillStyle = 'rgba(255,245,230,1)';
        ctx.beginPath();
        ctx.arc(st.x * W, st.y * H, st.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    /* sun halo */
    ctx.globalCompositeOperation = 'screen';
    let gr = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 9);
    gr.addColorStop(0, rgba(sun.glow, 0.22));
    gr.addColorStop(0.28, rgba(sun.glow, 0.075));
    gr.addColorStop(0.65, rgba(sun.glow, 0.022));
    gr.addColorStop(1, rgba(sun.glow, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);

    /* sun disc, slightly flattened by distance */
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, 0.92);
    const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
    disc.addColorStop(0, 'rgba(255,255,250,1)');
    disc.addColorStop(0.55, rgba(sun.color, 1));
    disc.addColorStop(0.92, rgba(sun.color, 0.72));
    disc.addColorStop(1, rgba(sun.color, 0));
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(0, 0, sr, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* horizontal flare */
    const flare = ctx.createLinearGradient(sx - sr * 13, 0, sx + sr * 13, 0);
    flare.addColorStop(0, rgba(sun.glow, 0));
    flare.addColorStop(0.46, rgba(sun.glow, 0.08));
    flare.addColorStop(0.5, rgba(sun.color, 0.3));
    flare.addColorStop(0.54, rgba(sun.glow, 0.08));
    flare.addColorStop(1, rgba(sun.glow, 0));
    ctx.fillStyle = flare;
    ctx.fillRect(sx - sr * 13, sy - sr * 0.06, sr * 26, sr * 0.12);
    ctx.globalCompositeOperation = 'source-over';

    /* clouds */
    if (R.cloudSprites) {
      const camOff = R.cam.x * 0.55 * R.cam.zoom;
      const base = [
        [-0.1, 0.1, 0.9, 0.34],
        [0.28, 0.06, 1.25, 0.28],
        [0.6, 0.16, 0.75, 0.3],
        [0.9, 0.09, 1.05, 0.22],
        [1.25, 0.19, 0.6, 0.26],
      ];
      for (let i = 0; i < base.length; i++) {
        const b = base[i];
        const cw = 520 * b[2];
        const ch = 230 * b[2];
        let x = b[0] * W - mod(camOff + time * (5 + i * 2.2), W + cw * 1.7) + cw * 0.4;
        if (x < -cw) x += W + cw * 1.7;
        const y = b[1] * H;
        ctx.globalAlpha = b[3];
        ctx.drawImage(R.cloudSprites[i % R.cloudSprites.length], x, y, cw, ch);
      }
      ctx.globalAlpha = 1;
    }

    if (R.level.id === 'country') {
      /* birds */
      ctx.strokeStyle = 'rgba(40,45,38,0.5)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        const bx = mod(time * (7 + i * 1.7) + i * 260, W + 300) - 150;
        const by = H * (0.16 + i * 0.035) + Math.sin(time * 1.1 + i) * 8;
        const s = 5 + i * 0.8;
        ctx.beginPath();
        ctx.moveTo(bx - s, by);
        ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.55, bx, by);
        ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.55, bx + s, by);
        ctx.stroke();
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  distant silhouettes                                               */
  /* ------------------------------------------------------------------ */
  Art.drawBackdrop = function (R) {
    const pal = R.pal;
    const fog = pal.fog;
    const style = pal.silhouette;
    const layers = [
      { p: 0.035, base: 0.575, cell: 40, s: 0.55, haze: 0.6, col: pal.layers[0] },
      { p: 0.07, base: 0.615, cell: 62, s: 0.8, haze: 0.35, col: pal.layers[1] },
      { p: 0.115, base: 0.645, cell: 96, s: 1.1, haze: 0.12, col: pal.layers[2] },
    ];
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      const col = mix(L.col, fog, L.haze);
      if (style === 'city') cityLayer(R, L, col, i);
      else if (style === 'hills') ridgeLayer(R, L, col, i, 'hills');
      else if (style === 'jungle') ridgeLayer(R, L, col, i, 'jungle');
      else mesaLayer(R, L, col, i);
    }
    if (style === 'city') urbanHorizon(R);
    /* atmospheric haze at the horizon */
    const ctx = R.ctx;
    const hy = R.H * 0.46;
    const hg = ctx.createLinearGradient(0, hy, 0, R.H * 0.82);
    hg.addColorStop(0, rgba(fog, 0));
    hg.addColorStop(0.45, rgba(fog, 0.17 * pal.fogAmount));
    hg.addColorStop(0.75, rgba(fog, 0.11 * pal.fogAmount));
    hg.addColorStop(1, rgba(fog, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, hy, R.W, R.H * 0.36);
    /* warm floor glow so the valley sits in the light */
    const warm = ctx.createLinearGradient(0, R.H * 0.5, 0, R.H * 0.76);
    const wa = pal.silhouette === 'city' ? 0.05 : 0.1;
    warm.addColorStop(0, rgba(pal.horizon, 0));
    warm.addColorStop(0.65, rgba(pal.horizon, wa));
    warm.addColorStop(1, rgba(pal.horizon, 0));
    ctx.fillStyle = warm;
    ctx.fillRect(0, R.H * 0.5, R.W, R.H * 0.26);
  };

  function cityLayer(R, L, col, idx) {
    const ctx = R.ctx;
    const W = R.W;
    const H = R.H;
    const s = R.scale();
    const off = R.cam.x * L.p * s;
    const cell = L.cell * (1 + idx * 0.18);
    const start = Math.floor((off - cell) / cell);
    const end = Math.ceil((off + W + cell) / cell);
    const baseline = H * L.base;
    const fog = R.pal.fog;

    for (let i = start; i <= end; i++) {
      const h = U.hash(i * 3.71 + idx * 19.3);
      if (h < 0.1) continue;
      const h2 = U.hash(i * 7.3 + 2);
      const bh = (26 + h * 118) * L.s * (1 + idx * 0.26);
      const bw = cell * (0.4 + h2 * 0.52);
      const x = i * cell - off + (cell - bw) * 0.28;
      const y = baseline - bh;

      /* body: warmer at the base where the sunset grazes it */
      const bodyGrad = ctx.createLinearGradient(0, y, 0, baseline);
      bodyGrad.addColorStop(0, rgba(U.mixColor(col, [8, 8, 14], 0.35), 0.97));
      bodyGrad.addColorStop(0.55, rgba(col, 0.97));
      bodyGrad.addColorStop(1, rgba(U.mixColor(col, fog, 0.28 + idx * 0.04), 0.96));
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(x, y, bw, bh);

      /* stepped crown + rooftop clutter */
      if (h > 0.42) {
        const tw = bw * (0.3 + h2 * 0.26);
        const th = bh * (0.06 + h * 0.13);
        const tx = x + bw * (0.1 + h2 * 0.2);
        ctx.fillStyle = rgba(U.mixColor(col, [8, 8, 14], 0.3), 0.97);
        ctx.fillRect(tx, y - th, tw, th);
        if (h > 0.66) {
          /* water tank / plant box */
          ctx.fillStyle = rgba(U.mixColor(col, [12, 10, 16], 0.4), 0.9);
          ctx.fillRect(tx + tw * 0.2, y - th - 3.5, tw * 0.4, 3.5);
        }
        if (h > 0.8) {
          ctx.strokeStyle = rgba(U.mixColor(col, [10, 10, 14], 0.4), 0.85);
          ctx.lineWidth = Math.max(1, 0.035 * s);
          ctx.beginPath();
          ctx.moveTo(tx + tw * 0.5, y - th);
          ctx.lineTo(tx + tw * 0.5, y - th - 14 - h * 20);
          ctx.stroke();
          /* beacon */
          ctx.fillStyle = 'rgba(255,120,96,0.75)';
          ctx.beginPath();
          ctx.arc(tx + tw * 0.5, y - th - 14 - h * 20, 1.6, 0, TAU);
          ctx.fill();
        }
      }

      /* windows: vertical slits, clustered into lit floors */
      if (idx > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, bw - 2, bh - 2);
        ctx.clip();
        const floorH = Math.max(4.5, (5 + idx * 1.6) * L.s);
        const rows = Math.floor(bh / floorH);
        const cols = Math.max(1, Math.floor(bw / (5 + idx * 2.2)));
        const cw = bw / (cols + 0.6);
        for (let r = 1; r < rows; r++) {
          const litFloor = U.hash2(i * 3 + r, idx * 7) > 0.7;
          for (let c = 0; c < cols; c++) {
            const q = U.hash2(i * 17 + c * 3, r * 5 + idx * 11);
            const lit = q > (litFloor ? 0.35 : 0.82);
            if (!lit) continue;
            const warm = q > 0.55;
            ctx.fillStyle = warm
              ? 'rgba(255,196,124,' + (0.26 + idx * 0.14) + ')'
              : 'rgba(158,224,226,' + (0.12 + idx * 0.08) + ')';
            ctx.fillRect(
              x + 2 + c * cw,
              y + r * floorH,
              Math.max(1.4, cw * 0.36),
              Math.max(1.2, floorH * 0.34)
            );
          }
        }
        /* faint vertical structure lines */
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = rgba(U.mixColor(col, fog, 0.5));
        ctx.lineWidth = 1;
        for (let c = 0; c <= cols; c++) {
          const cx = x + 2 + c * cw - cw * 0.16;
          ctx.beginPath();
          ctx.moveTo(cx, y);
          ctx.lineTo(cx, baseline);
          ctx.stroke();
        }
        ctx.restore();
      }

      /* sunset rim on the right edge */
      if (idx > 0 && h2 > 0.35) {
        ctx.fillStyle = 'rgba(255,178,120,' + (idx === 2 ? 0.16 : 0.09) + ')';
        ctx.fillRect(x + bw - 1.2, y, 1.2, bh);
      }
    }
  }

  /* the ghost of a second freeway crossing the horizon */
  function urbanHorizon(R) {
    const ctx = R.ctx;
    const W = R.W;
    const H = R.H;
    const s = R.scale();
    const pal = R.pal;
    const off = R.cam.x * 0.16 * s;
    const base = H * 0.6;
    const fogCol = U.mixColor(pal.layers[2], pal.fog, 0.42);
    const deckH = Math.max(7, 0.32 * s);

    ctx.fillStyle = rgba(fogCol, 0.4);
    for (let x = -200 - (off % 260); x < W + 200; x += 260) {
      const wave = Math.sin((x + off) * 0.004) * 2;
      const yTop = base - 26 + wave;
      /* deck */
      ctx.fillRect(x - 130, yTop, 260, deckH);
      /* twin column */
      ctx.fillStyle = rgba(fogCol, 0.32);
      ctx.fillRect(x - 8, yTop + deckH, 5, 22 + wave);
      ctx.fillRect(x + 3, yTop + deckH, 5, 22 + wave);
      ctx.fillStyle = rgba(fogCol, 0.4);
    }

    /* strings of sodium lamps */
    ctx.globalCompositeOperation = 'screen';
    for (let x = -200 - (off % 260); x < W + 200; x += 260) {
      const wave = Math.sin((x + off) * 0.004) * 2;
      const gx = x + 110;
      const gy = base - 26 + wave + deckH * 0.5;
      const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 22);
      gr.addColorStop(0, 'rgba(255,196,120,0.4)');
      gr.addColorStop(1, 'rgba(255,180,110,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(gx, gy, 22, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function ridgeFn(R, L, mode) {
    return function (wx) {
      const s = 1 / 95;
      let y =
        Math.sin(wx * s + L.p * 40) * 0.45 +
        Math.sin(wx * s * 2.7 + 1.4) * 0.22 +
        Math.sin(wx * s * 6.3 + 4.1) * 0.08;
      if (mode === 'jungle') y += Math.sin(wx * 0.021 + 0.7) * 0.16;
      return y;
    };
  }

  function ridgeLayer(R, L, col, idx, mode) {
    const ctx = R.ctx;
    const W = R.W;
    const H = R.H;
    const s = R.scale();
    const off = R.cam.x * L.p * s;
    const base = H * L.base;
    const amp = (mode === 'jungle' ? 44 : 30) * L.s * (idx + 1) * 0.8;
    const fn = ridgeFn(R, L, mode);
    const step = 10;
    ctx.beginPath();
    ctx.moveTo(-20, H + 20);
    const ys = [];
    for (let x = -20; x <= W + 20; x += step) {
      const wx = x + off;
      const y = base - (fn(wx) * 0.7 + 0.55) * amp;
      ys.push([x, y]);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 20, H + 20);
    ctx.closePath();
    const gTop = base - amp * 1.5;
    const gBody = ctx.createLinearGradient(0, gTop, 0, H * 0.86);
    gBody.addColorStop(0, rgba(col, idx === 0 ? 0.72 : 0.9));
    gBody.addColorStop(0.55, rgba(mix(col, R.pal.fog, 0.16), idx === 0 ? 0.7 : 0.86));
    gBody.addColorStop(1, rgba(mix(col, R.pal.fog, 0.46 + idx * 0.06), idx === 0 ? 0.6 : 0.72));
    ctx.fillStyle = gBody;
    ctx.fill();

    /* valley fields, far hedgerows and mist bands */
    if (mode === 'hills') {
      /* sunlit field bands receding to the track */
      for (let k = 0; k < 4; k++) {
        const h = (26 + idx * 8) * L.s;
        const y0 = base + (6 + k * (30 + idx * 9)) * L.s;
        if (y0 > H * 0.86) break;
        const light = k % 2 === 0;
        const cA = light
          ? mix(col, R.pal.horizon, 0.18)
          : mix(col, R.pal.fog, 0.34);
        const band = ctx.createLinearGradient(0, y0 - h * 0.5, 0, y0 + h);
        band.addColorStop(0, rgba(cA, 0));
        band.addColorStop(0.5, rgba(cA, 0.2 + idx * 0.05));
        band.addColorStop(1, rgba(cA, 0));
        ctx.fillStyle = band;
        ctx.fillRect(-20, y0 - h * 0.5, W + 40, h * 1.5);
      }
      const lines = 2 + idx;
      for (let k = 0; k < lines; k++) {
        const yy = base + (16 + k * (20 + idx * 8)) * L.s + idx * 6;
        const period = 160 + k * 70;
        const wob = 3 + k * 2.5;
        ctx.globalAlpha = 0.2 + k * 0.06;
        ctx.strokeStyle = rgba(mix(col, R.pal.fog, 0.4));
        ctx.lineWidth = Math.max(1, (1.2 + k * 0.9) * L.s);
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 14) {
          const y = yy + Math.sin((x + off * 0.7) / period + k * 2.3) * wob;
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        /* stubble / low crop texture above the line */
        ctx.globalAlpha = 0.07 + k * 0.03;
        ctx.lineWidth = Math.max(1, 0.7 * L.s);
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 13) {
          const y = yy + Math.sin((x + off * 0.7) / period + k * 2.3) * wob;
          ctx.moveTo(x, y);
          ctx.lineTo(x + 1.5, y - (2 + (Math.abs(x) % 3)) * L.s);
        }
        ctx.stroke();
      }
      /* a hedgerow bordering the fields at the foot of the hills */
      const hedgeSpacing = 12;
      const hexStart = Math.floor((off - 40) / hedgeSpacing);
      const hexEnd = Math.ceil((off + W + 40) / hedgeSpacing);
      const hedgeCol = mix(col, R.pal.ground.deep, 0.5);
      const hedgeY = base + (15 + idx * 7) * L.s;
      if (hedgeY < H * 0.92) {
        /* one path so the overlapping blobs union into a solid hedge line */
        ctx.beginPath();
        for (let i = hexStart; i <= hexEnd; i++) {
          const hq = U.hash(i * 3.17 + idx * 9);
          if (hq < 0.1) continue;
          const x = i * hedgeSpacing - off + (hq - 0.5) * 7;
          const r = (5 + hq * 4.5) * L.s;
          const cy = hedgeY - r * 0.45 + (U.hash2(i, idx) - 0.5) * 4 * L.s;
          ctx.moveTo(x + r * 1.35, cy);
          ctx.ellipse(x, cy, r * 1.35, r * 0.95, 0, 0, TAU);
        }
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = rgba(hedgeCol);
        ctx.fill();
      }
    } else {
      for (let k = 0; k < 2; k++) {
        const yy = base + (34 + k * 54 + idx * 18) * L.s;
        const band = ctx.createLinearGradient(0, yy - 26, 0, yy + 26);
        band.addColorStop(0, rgba(R.pal.fog, 0));
        band.addColorStop(0.5, rgba(R.pal.fog, 0.14 + idx * 0.03));
        band.addColorStop(1, rgba(R.pal.fog, 0));
        ctx.fillStyle = band;
        ctx.fillRect(-20, yy - 26, W + 40, 52);
      }
    }

    /* tree clumps and palms riding the ridgeline */
    ctx.globalAlpha = 1;
    const spacing = mode === 'jungle' ? 30 : 42;
    const start = Math.floor((off - 60) / spacing);
    const end = Math.ceil((off + W + 60) / spacing);
    const crownCol = mix(col, R.pal.rimLight, idx === 2 ? 0.1 : 0.05);
    const bodyCol = mix(col, R.pal.fog, idx === 0 ? 0.16 : 0.02);
    const ridgeAt = (x) => {
      const k = Math.round((x + 20) / step);
      if (ys[k]) return ys[k][1];
      const wx = x + off;
      return base - (fn(wx) * 0.7 + 0.55) * amp;
    };

    for (let i = start; i <= end; i++) {
      const h = U.hash(i * 5.13 + idx * 13);
      if (h < 0.26) continue;
      const h2 = U.hash(i * 2.71 + idx * 5);
      const x = i * spacing - off + (h - 0.5) * 14;
      const baseY = ridgeAt(x);
      const size = (0.75 + h * 0.8) * L.s;

      if (mode === 'jungle' && h > 0.74) {
        /* tall palm: curved trunk, six drooping fronds */
        const lean = (h2 - 0.5) * 10 * size;
        const tall = (24 + h2 * 26) * size;
        const tipX = x + lean;
        const tipY = baseY - tall;
        ctx.strokeStyle = rgba(bodyCol, 0.95);
        ctx.lineWidth = Math.max(1, 1.5 * size);
        ctx.beginPath();
        ctx.moveTo(x, baseY + 3);
        ctx.quadraticCurveTo(x + lean * 0.35, baseY - tall * 0.55, tipX, tipY);
        ctx.stroke();
        for (let f = 0; f < 6; f++) {
          const a = -2.5 + f * 0.62;
          const len = (11 + U.hash2(i + f, idx) * 9) * size;
          const dx = Math.cos(a) * len;
          const dy = Math.sin(a) * len * 0.55;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.quadraticCurveTo(
            tipX + dx * 0.55,
            tipY + dy * 0.4 - 4 * size,
            tipX + dx,
            tipY + dy + 3 * size
          );
          ctx.stroke();
        }
      } else if (h > 0.62) {
        /* hedge / broadleaf clump: overlapping crowns, no trunk */
        const blobs = 2 + Math.floor(h2 * 3);
        for (let b = 0; b < blobs; b++) {
          const q = U.hash2(i * 7 + b * 3, idx * 11);
          const bx = x + (b - (blobs - 1) * 0.5) * (6 + q * 5) * size;
          const br = (5 + q * 6) * size;
          ctx.fillStyle = rgba(b % 2 ? bodyCol : col, 0.96);
          ctx.beginPath();
          ctx.ellipse(
            bx,
            baseY - br * (0.35 + q * 0.45),
            br * 1.25,
            br * (0.85 + q * 0.4),
            (q - 0.5) * 0.8,
            0,
            TAU
          );
          ctx.fill();
        }
        if (h > 0.86) {
          /* leader crown catching the light */
          ctx.fillStyle = rgba(crownCol, 0.5);
          ctx.beginPath();
          ctx.ellipse(
            x + 1,
            baseY - (10 + h2 * 10) * size,
            4.2 * size,
            3.2 * size,
            0,
            0,
            TAU
          );
          ctx.fill();
        }
      } else {
        /* low shrub hugging the ridge */
        ctx.fillStyle = rgba(bodyCol, 0.9);
        ctx.beginPath();
        ctx.ellipse(
          x,
          baseY - 2.2 * size,
          (5 + h2 * 6) * size,
          (2.4 + h2 * 2) * size,
          0,
          0,
          TAU
        );
        ctx.fill();
      }
    }

    /* soft rim along the ridgeline itself */
    ctx.strokeStyle = rgba(crownCol, idx === 2 ? 0.22 : 0.14);
    ctx.lineWidth = Math.max(1, 0.9 * L.s);
    ctx.beginPath();
    for (let k = 0; k < ys.length; k++) {
      if (k === 0) ctx.moveTo(ys[k][0], ys[k][1]);
      else ctx.lineTo(ys[k][0], ys[k][1]);
    }
    ctx.stroke();
  }

  function mesaLayer(R, L, col, idx) {
    const ctx = R.ctx;
    const W = R.W;
    const H = R.H;
    const s = R.scale();
    const off = R.cam.x * L.p * s;
    const cell = (230 + idx * 80) * L.s;
    const start = Math.floor((off - cell) / cell);
    const end = Math.ceil((off + W + cell) / cell);
    const baseline = H * L.base + 20;
    const fog = R.pal.fog;
    const rim = R.pal.rimLight;

    for (let i = start; i <= end; i++) {
      const h = U.hash(i * 9.17 + idx * 31);
      if (h < 0.2) continue;
      const h2 = U.hash(i * 4.31 + idx * 7);
      const x = i * cell - off;
      const w = cell * (0.48 + h * 0.52);
      const top = baseline - (64 + h * 156) * L.s;
      const tal = w * (0.13 + h2 * 0.15);
      const baseY = baseline;
      const body = mix(col, fog, idx === 0 ? 0.16 : 0.02 + h2 * 0.05);

      /* eroded outline: stepped shoulders + notched crest */
      const lx = x + tal;
      const rx = x + w - tal;
      const crest = top + 8;
      const notches = 6;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.04, baseY);
      ctx.lineTo(lx - w * 0.05, top + (baseY - top) * 0.4);
      ctx.lineTo(lx - 2, crest + 10);
      ctx.lineTo(lx + 5, crest);
      for (let k = 0; k < notches; k++) {
        const px = lx + 5 + ((rx - lx - 5) * (k + 0.5)) / notches;
        const q = U.hash2(i * 13 + k, idx * 7);
        const py = crest - q * 5 + Math.sin(k * 1.9 + h * 6) * 2;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(rx - 5, crest);
      ctx.lineTo(rx + 2, crest + 12);
      ctx.lineTo(rx + w * 0.04, top + (baseY - top) * 0.36);
      ctx.lineTo(x + w + w * 0.03, baseY);
      ctx.closePath();

      const bodyGrad = ctx.createLinearGradient(0, top, 0, baseY);
      bodyGrad.addColorStop(0, rgba(mix(body, rim, 0.05), idx === 0 ? 0.68 : 0.92));
      bodyGrad.addColorStop(0.55, rgba(body, idx === 0 ? 0.68 : 0.92));
      bodyGrad.addColorStop(1, rgba(mix(body, fog, 0.32), idx === 0 ? 0.55 : 0.8));
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      /* horizontal strata, slightly bowed */
      ctx.save();
      ctx.clip();
      const strata = mix(body, R.pal.ground.strata, 0.3);
      for (let k = 1; k < 5; k++) {
        const yy = top + ((baseY - top) * k) / 5.2;
        const bow = 2 + (k % 2) * 2;
        ctx.globalAlpha = 0.2 - k * 0.02;
        ctx.strokeStyle = rgba(strata);
        ctx.lineWidth = Math.max(1, 0.7 * L.s);
        ctx.beginPath();
        ctx.moveTo(x - 6, yy);
        ctx.quadraticCurveTo(x + w * 0.5, yy + bow, x + w + 6, yy - bow * 0.5);
        ctx.stroke();
      }
      /* sunward rim on the right slope */
      ctx.globalAlpha = idx === 0 ? 0.1 : 0.18;
      ctx.strokeStyle = rgba(rim);
      ctx.lineWidth = Math.max(1.2, L.s * 1.1);
      ctx.beginPath();
      ctx.moveTo(rx + 1, crest + 6);
      ctx.lineTo(rx + w * 0.04, top + (baseY - top) * 0.42);
      ctx.lineTo(x + w + w * 0.02, baseY - 4);
      ctx.stroke();
      /* talus shadow at the foot */
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = rgba(mix(body, [18, 10, 12], 0.5));
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, baseY, w * 0.56, Math.max(4, 10 * L.s), 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  midground props                                                   */
  /* ------------------------------------------------------------------ */
  Art.drawMidProps = function (R) {
    const tr = R.track;
    if (!tr) return;
    const ctx = R.ctx;
    const pal = R.pal;
    const s = R.scale();
    const W = R.W;
    const left = R.worldLeft() - 40;
    const right = R.worldRight() + 40;
    const theme = R.level.id;
    const spacing = theme === 'urban' ? 105 : theme === 'country' ? 120 : theme === 'jungle' ? 125 : 110;
    const start = Math.floor(left / spacing) * spacing;
    const fog = pal.fog;

    for (let wx = start; wx < right; wx += spacing) {
      const h = U.hash(wx * 0.137 + 7);
      if (h < 0.3) continue;
      const x = R.sx(wx);
      const gy = R.sy(tr.heightAt(wx)) + Math.max(6, s * 0.2);
      if (x < -220 || x > W + 220) continue;
      const tint = mix(pal.layers[2], fog, 0.12);
      ctx.save();
      ctx.globalAlpha = 0.92;
      if (theme === 'urban') {
        const kind = h < 0.6 ? 'lamp' : h < 0.8 ? 'sign' : 'pylon';
        drawUrbanProp(ctx, x, gy, s, kind, tint, pal, h, R.time);
      } else if (theme === 'country') {
        const kind = h < 0.42 ? 'tree' : h < 0.66 ? 'fence' : h < 0.86 ? 'barn' : 'windmill';
        drawCountryProp(ctx, x, gy, s, kind, tint, pal, h, R.time);
      } else if (theme === 'jungle') {
        const kind = h < 0.45 ? 'tree' : h < 0.72 ? 'temple' : 'fern';
        drawJungleProp(ctx, x, gy, s, kind, tint, pal, h, R.time);
      } else {
        const kind = h < 0.45 ? 'hoodoo' : h < 0.7 ? 'arch' : h < 0.9 ? 'cactus' : 'rock';
        drawCanyonProp(ctx, x, gy, s, kind, tint, pal, h);
      }
      ctx.restore();
    }
  };

  function drawUrbanProp(ctx, x, gy, s, kind, tint, pal, h, time) {
    if (kind === 'lamp') {
      const H = 8.2 * s;
      ctx.strokeStyle = rgba(tint);
      ctx.lineWidth = Math.max(1.5, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy - H);
      ctx.quadraticCurveTo(x, gy - H - 10, x + 9 * s * 0.6, gy - H - 12);
      ctx.lineTo(x + 18 * s * 0.45, gy - H - 10);
      ctx.stroke();
      const lx = x + 18 * s * 0.45;
      const ly = gy - H - 10;
      ctx.fillStyle = 'rgba(255,214,150,0.95)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 2.4, 1.5, 0, 0, TAU);
      ctx.fill();
      const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 46);
      g.addColorStop(0, 'rgba(255,205,140,0.28)');
      g.addColorStop(0.4, 'rgba(255,180,110,0.10)');
      g.addColorStop(1, 'rgba(255,160,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly, 46, 0, TAU);
      ctx.fill();
      /* light cone */
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,196,130,0.045)';
      ctx.beginPath();
      ctx.moveTo(lx - 3, ly);
      ctx.lineTo(lx - 22, gy + 4);
      ctx.lineTo(lx + 22, gy + 4);
      ctx.lineTo(lx + 3, ly);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (kind === 'sign') {
      const H = 4.4 * s;
      ctx.strokeStyle = rgba(tint);
      ctx.lineWidth = Math.max(1.2, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy - H);
      ctx.stroke();
      ctx.fillStyle = 'rgba(16,22,30,0.9)';
      ctx.fillRect(x - 0.9 * s, gy - H - 30, 2.4 * s, 24);
      ctx.fillStyle = 'rgba(255,196,120,0.55)';
      ctx.fillRect(x - 0.55 * s, gy - H - 25, 1.7 * s, 3);
      ctx.fillRect(x - 0.55 * s, gy - H - 18, 1.2 * s, 2);
    } else {
      const w = 2.4 * s;
      ctx.fillStyle = rgba(mix(tint, [30, 24, 34], 0.4), 0.9);
      ctx.fillRect(x - w * 0.5, gy - 34 * s, w, 34 * s);
      ctx.fillRect(x - w * 0.8, gy - 8 * s, w * 1.6, 8 * s);
      ctx.strokeStyle = 'rgba(255,120,90,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, gy - 34 * s);
      ctx.lineTo(x, gy - 40 * s);
      ctx.stroke();
    }
  }

  function drawCountryProp(ctx, x, gy, s, kind, tint, pal, h, time) {
    if (kind === 'tree') {
      const H = (6 + h * 4) * s;
      ctx.strokeStyle = rgba(mix(tint, [42, 32, 22], 0.5));
      ctx.lineWidth = Math.max(2, 0.16 * s);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.quadraticCurveTo(x + 2, gy - H * 0.55, x - 1, gy - H * 0.8);
      ctx.stroke();
      const crown = mix(tint, [54, 62, 34], 0.45);
      ctx.fillStyle = rgba(crown, 0.95);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + h * 2;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(a) * H * 0.15,
          gy - H * 0.82 + Math.sin(a) * H * 0.09,
          H * (0.19 + U.hash(i + h * 9) * 0.1),
          0,
          TAU
        );
        ctx.fill();
      }
    } else if (kind === 'fence') {
      ctx.strokeStyle = 'rgba(72,58,40,0.55)';
      ctx.lineWidth = Math.max(1, 0.05 * s);
      for (let i = 0; i < 5; i++) {
        const fx = x + i * 2.4 * s;
        ctx.beginPath();
        ctx.moveTo(fx, gy);
        ctx.lineTo(fx, gy - 1.15 * s);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x, gy - 0.85 * s);
      ctx.lineTo(x + 9.6 * s, gy - 0.85 * s);
      ctx.moveTo(x, gy - 0.5 * s);
      ctx.lineTo(x + 9.6 * s, gy - 0.5 * s);
      ctx.stroke();
    } else if (kind === 'barn') {
      const w = 5.4 * s;
      const hh = 3.2 * s;
      ctx.fillStyle = rgba(mix(tint, [92, 48, 34], 0.55), 0.95);
      ctx.fillRect(x - w * 0.5, gy - hh, w, hh);
      ctx.fillStyle = rgba(mix(tint, [58, 34, 26], 0.5), 0.98);
      ctx.beginPath();
      ctx.moveTo(x - w * 0.58, gy - hh);
      ctx.lineTo(x, gy - hh - 1.6 * s);
      ctx.lineTo(x + w * 0.58, gy - hh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,150,0.25)';
      ctx.fillRect(x - w * 0.09, gy - hh * 0.66, w * 0.18, hh * 0.66);
    } else {
      const H = 8.5 * s;
      const ang = time * 0.55 + h * 6;
      ctx.strokeStyle = rgba(mix(tint, [60, 52, 40], 0.45));
      ctx.lineWidth = Math.max(1.5, 0.1 * s);
      ctx.beginPath();
      ctx.moveTo(x - 2.2 * s, gy);
      ctx.lineTo(x - 0.5 * s, gy - H);
      ctx.moveTo(x + 2.2 * s, gy);
      ctx.lineTo(x + 0.5 * s, gy - H);
      ctx.stroke();
      ctx.save();
      ctx.translate(x, gy - H);
      ctx.rotate(ang);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(3.6 * s, 0);
        ctx.lineTo(2.6 * s, -0.3 * s);
        ctx.closePath();
        ctx.fillStyle = 'rgba(58,50,38,0.5)';
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawJungleProp(ctx, x, gy, s, kind, tint, pal, h, time) {
    if (kind === 'tree') {
      const H = (8 + h * 6) * s;
      const trunk = mix(tint, [30, 32, 22], 0.4);
      ctx.strokeStyle = rgba(trunk);
      ctx.lineWidth = Math.max(2, 0.22 * s);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.quadraticCurveTo(x - 3 * s, gy - H * 0.5, x + 1 * s, gy - H);
      ctx.stroke();
      const crown = mix(tint, [32, 70, 38], 0.5);
      ctx.fillStyle = rgba(crown, 0.95);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + h * 3;
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(a) * 2.4 * s,
          gy - H + Math.sin(a) * 1.3 * s,
          (1.8 + U.hash(i * 4 + h) * 1.4) * s,
          1.1 * s,
          a,
          0,
          TAU
        );
        ctx.fill();
      }
      /* hanging liana */
      ctx.strokeStyle = 'rgba(52,92,58,0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + (i ? 5 : -5), gy - H + 6);
        ctx.quadraticCurveTo(x + (i ? 8 : -8), gy - H + 30, x + (i ? 6 : -6), gy - H + 54);
        ctx.stroke();
      }
    } else if (kind === 'temple') {
      const w = 5.5 * s;
      const H = 4.6 * s;
      ctx.fillStyle = rgba(mix(tint, [128, 118, 88], 0.45), 0.9);
      ctx.fillRect(x - w * 0.5, gy - H, 1.1 * s, H);
      ctx.fillRect(x + w * 0.5 - 1.1 * s, gy - H, 1.1 * s, H);
      ctx.fillRect(x - w * 0.6, gy - H - 0.9 * s, w * 1.2, 0.9 * s);
      ctx.fillRect(x - w * 0.52, gy - H - 1.3 * s, w * 1.04, 0.35 * s);
      ctx.strokeStyle = 'rgba(45,100,52,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.3, gy);
      ctx.quadraticCurveTo(x - w * 0.1, gy - H * 0.5, x - w * 0.24, gy - H - 4);
      ctx.stroke();
    } else {
      /* big fern */
      ctx.strokeStyle = rgba(mix(tint, [44, 96, 48], 0.45), 0.85);
      ctx.lineWidth = Math.max(1, 0.05 * s);
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI * 0.9 + (i / (n - 1)) * Math.PI * 0.8;
        const len = (1.3 + U.hash(i * 3 + h) * 0.9) * s;
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.quadraticCurveTo(
          x + Math.cos(a) * len * 0.55,
          gy - Math.sin(a) * len * 0.9,
          x + Math.cos(a) * len,
          gy - Math.sin(a) * len * 1.3
        );
        ctx.stroke();
      }
    }
  }

  function drawCanyonProp(ctx, x, gy, s, kind, tint, pal, h) {
    const stone = mix(tint, [150, 72, 48], 0.45);
    if (kind === 'hoodoo') {
      const H = (6 + h * 5) * s;
      ctx.fillStyle = rgba(stone, 0.95);
      let y = gy;
      for (let i = 0; i < 4; i++) {
        const w = (1.9 - i * 0.35) * s;
        const hh = H * 0.22;
        ctx.beginPath();
        ctx.ellipse(x, y - hh * 0.5, w, hh * 0.65, 0, 0, TAU);
        ctx.fill();
        y -= hh * 0.9;
      }
      ctx.fillRect(x - 0.18 * s, y - H * 0.12, 0.36 * s, H * 0.16);
    } else if (kind === 'arch') {
      const w = 7.2 * s;
      const H = 5.4 * s;
      ctx.strokeStyle = rgba(stone, 0.95);
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.5, gy);
      ctx.quadraticCurveTo(x - w * 0.5, gy - H, x, gy - H);
      ctx.quadraticCurveTo(x + w * 0.5, gy - H, x + w * 0.5, gy);
      ctx.stroke();
    } else if (kind === 'cactus') {
      const H = (3.4 + h * 2.2) * s;
      ctx.strokeStyle = rgba(mix(tint, [50, 84, 44], 0.4), 0.95);
      ctx.lineWidth = Math.max(2, 0.24 * s);
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy - H);
      ctx.moveTo(x, gy - H * 0.55);
      ctx.lineTo(x - 0.9 * s, gy - H * 0.55);
      ctx.lineTo(x - 0.9 * s, gy - H * 0.78);
      ctx.moveTo(x, gy - H * 0.38);
      ctx.lineTo(x + 0.85 * s, gy - H * 0.38);
      ctx.lineTo(x + 0.85 * s, gy - H * 0.6);
      ctx.stroke();
    } else {
      ctx.fillStyle = rgba(stone, 0.85);
      ctx.beginPath();
      ctx.ellipse(x, gy - 0.5 * s, 1.6 * s, 0.75 * s, 0, 0, TAU);
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  ground decoration                                                 */
  /* ------------------------------------------------------------------ */
  Art.drawGroundDecor = function (R) {
    const tr = R.track;
    if (!tr) return;
    const ctx = R.ctx;
    const s = R.scale();
    const pal = R.pal;
    const left = R.worldLeft() - 2;
    const right = R.worldRight() + 2;
    const theme = R.level.id;
    const baseY = (wx) => R.sy(tr.heightAt(wx)) - Math.max(2, R._bandH * 0.28);

    if (theme === 'urban') {
      const sp = 7;
      for (let wx = Math.floor(left / sp) * sp; wx < right; wx += sp) {
        const x = R.sx(wx);
        const y = baseY(wx);
        /* guard rail */
        ctx.strokeStyle = 'rgba(26,24,30,0.8)';
        ctx.lineWidth = Math.max(1, 0.055 * s);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 0.75 * s);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(170,148,140,0.5)';
        ctx.lineWidth = Math.max(1, 0.045 * s);
        ctx.beginPath();
        ctx.moveTo(x, y - 0.66 * s);
        ctx.lineTo(x + sp * s, y - 0.66 * s);
        ctx.stroke();
        /* reflector */
        if (U.hash(wx) > 0.7) {
          ctx.fillStyle = 'rgba(255,196,120,0.55)';
          ctx.fillRect(x - 1, y - 0.6 * s, 1.5, 3);
        }
      }
      for (let wx = Math.floor(left / 9) * 9; wx < right; wx += 9) {
        const h = U.hash(wx * 0.77);
        if (h > 0.4) continue;
        const x = R.sx(wx);
        const y = R.sy(tr.heightAt(wx));
        ctx.fillStyle = 'rgba(40,32,40,0.6)';
        ctx.beginPath();
        ctx.ellipse(x, y - 3, 6 + h * 9, 2.5 + h * 3, 0, 0, TAU);
        ctx.fill();
      }
    } else if (theme === 'country') {
      const sp = 2.3;
      for (let wx = Math.floor(left / sp) * sp; wx < right; wx += sp) {
        const h = U.hash(wx * 0.31);
        if (h < 0.24) continue;
        const x = R.sx(wx);
        const y = R.sy(tr.heightAt(wx)) - 2;
        const col = h > 0.82 ? [246, 228, 150] : h > 0.6 ? [184, 176, 96] : [110, 116, 58];
        ctx.strokeStyle = rgba(col, 0.7);
        ctx.lineWidth = Math.max(0.8, 0.026 * s);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = -1.2 + i * 0.5 + h;
          ctx.moveTo(x + i * 2, y);
          ctx.quadraticCurveTo(
            x + i * 2 + Math.cos(a) * 5,
            y - 0.16 * s,
            x + i * 2 + Math.cos(a) * 9,
            y - 0.3 * s
          );
        }
        ctx.stroke();
        if (h > 0.82) {
          ctx.fillStyle = 'rgba(255,238,164,0.9)';
          ctx.beginPath();
          ctx.arc(x + 4, y - 0.32 * s, 2, 0, TAU);
          ctx.fill();
        }
      }
      /* fence line */
      const fsp = 9;
      for (let wx = Math.floor(left / fsp) * fsp; wx < right; wx += fsp) {
        const x = R.sx(wx);
        const y = R.sy(tr.heightAt(wx)) - 4;
        ctx.strokeStyle = 'rgba(74,58,38,0.65)';
        ctx.lineWidth = Math.max(1, 0.05 * s);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 1.1 * s);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(84,68,46,0.4)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y - 0.9 * s);
        ctx.lineTo(x + fsp * s, y - 0.9 * s);
        ctx.moveTo(x, y - 0.56 * s);
        ctx.lineTo(x + fsp * s, y - 0.56 * s);
        ctx.stroke();
      }
    } else if (theme === 'jungle') {
      const sp = 4.2;
      for (let wx = Math.floor(left / sp) * sp; wx < right; wx += sp) {
        const h = U.hash(wx * 0.41);
        if (h < 0.3) continue;
        const x = R.sx(wx);
        const y = R.sy(tr.heightAt(wx)) - 3;
        ctx.strokeStyle = rgba(h > 0.65 ? [96, 144, 84] : [58, 100, 58], 0.72);
        ctx.lineWidth = Math.max(1, 0.035 * s);
        for (let i = 0; i < 5; i++) {
          const a = -2.4 + i * 0.55;
          const len = (0.8 + h * 0.9) * s;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(
            x + Math.cos(a) * len * 0.5,
            y - Math.sin(a) * len * 0.6,
            x + Math.cos(a) * len,
            y - Math.sin(a) * len * 0.8
          );
          ctx.stroke();
        }
        if (h > 0.82) {
          ctx.fillStyle = 'rgba(255,120,90,0.65)';
          ctx.beginPath();
          ctx.arc(x + 3, y - 0.4 * s, 2.2, 0, TAU);
          ctx.fill();
        }
      }
    } else {
      const sp = 4.8;
      for (let wx = Math.floor(left / sp) * sp; wx < right; wx += sp) {
        const h = U.hash(wx * 0.53);
        if (h < 0.42) continue;
        const x = R.sx(wx);
        const y = R.sy(tr.heightAt(wx)) - 2;
        if (h > 0.75) {
          ctx.strokeStyle = 'rgba(72,80,52,0.6)';
          ctx.lineWidth = 1.1;
          for (let i = 0; i < 4; i++) {
            const a = -2.2 + i * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * 8, y - Math.sin(a) * 9);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = 'rgba(92,52,38,0.55)';
          ctx.beginPath();
          ctx.ellipse(x, y - 2, 3 + h * 6, 1.6 + h * 2.4, 0, 0, TAU);
          ctx.fill();
        }
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  foreground                                                        */
  /* ------------------------------------------------------------------ */
  Art.drawForeground = function (R) {
    const ctx = R.ctx;
    const W = R.W;
    const H = R.H;
    const s = R.scale();
    const pal = R.pal;
    const theme = R.level.id;
    const off = R.cam.x * 0.95 * s;
    const ink = mix(pal.ground.deep, [0, 0, 0], 0.25);
    const time = R.time;

    ctx.save();
    ctx.globalAlpha = 0.82;

    if (theme === 'country') {
      for (let side = 0; side < 2; side++) {
        const bx = side ? W + 40 : -40;
        const dir = side ? -1 : 1;
        const sway = Math.sin(time * 0.9 + side) * 4;
        ctx.strokeStyle = rgba(ink, 0.9);
        for (let i = 0; i < 9; i++) {
          const x = bx + dir * (8 + i * 9) + mod(off * 0.01, 20);
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(x, H + 4);
          ctx.quadraticCurveTo(x + sway + i * 2, H - 70 - i * 12, x + sway * 2 - 10, H - 120 - i * 16);
          ctx.stroke();
        }
      }
    } else if (theme === 'jungle') {
      /* broad tropical leaves crowding the frame */
      const bigLeaf = (x, y, ang, len, wid, col, alpha) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillStyle = rgba(col, alpha);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.3, -wid, len * 0.7, -wid * 0.58);
        ctx.quadraticCurveTo(len * 0.9, -wid * 0.32, len, 0);
        ctx.quadraticCurveTo(len * 0.9, wid * 0.34, len * 0.68, wid * 0.6);
        ctx.quadraticCurveTo(len * 0.32, wid * 0.96, 0, 0);
        ctx.fill();
        /* midrib + a few leaf cuts so it reads as a leaf, not a blob */
        ctx.strokeStyle = rgba(mix(col, [0, 0, 0], 0.35), alpha * 0.75);
        ctx.lineWidth = Math.max(1.4, len * 0.011);
        ctx.beginPath();
        ctx.moveTo(len * 0.04, 0);
        ctx.quadraticCurveTo(len * 0.5, -wid * 0.1, len * 0.95, 0);
        ctx.stroke();
        for (let k = 1; k <= 4; k++) {
          const t = k / 5;
          ctx.beginPath();
          ctx.moveTo(len * t, -wid * (0.55 - t * 0.3));
          ctx.lineTo(len * (t + 0.05), -wid * (0.12 - t * 0.06));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(len * t, wid * (0.58 - t * 0.28));
          ctx.lineTo(len * (t + 0.05), wid * (0.14 - t * 0.05));
          ctx.stroke();
        }
        ctx.restore();
      };
      const sway = Math.sin(time * 0.7) * 0.05;
      const leafCol = mix(ink, [18, 46, 26], 0.4);
      for (let side = 0; side < 2; side++) {
        const bx = side ? W + 60 : -60;
        const dir = side ? -1 : 1;
        for (let i = 0; i < 4; i++) {
          bigLeaf(
            bx,
            H + 40 - i * 26,
            -Math.PI / 2 + dir * (0.1 + i * 0.16) + sway * dir,
            250 + i * 40,
            58 + i * 8,
            i === 0 ? mix(ink, [30, 62, 34], 0.5) : leafCol,
            0.85
          );
        }
      }
      /* hanging leaf clusters at the top corners */
      for (let side = 0; side < 2; side++) {
        const x = side ? W * 0.93 : W * 0.07;
        const y = -16;
        ctx.strokeStyle = rgba(ink, 0.5);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (side ? -18 : 18), 60, x + (side ? -6 : 6), 120);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          bigLeaf(
            x + (side ? -6 : 6),
            18 + i * 42,
            Math.PI / 2 - (side ? -1 : 1) * (0.35 + i * 0.2),
            120 + i * 26,
            30 + i * 4,
            ink,
            0.6
          );
        }
      }
    } else if (theme === 'canyon') {
      for (let side = 0; side < 2; side++) {
        const bx = side ? W + 30 : -30;
        const dir = side ? -1 : 1;
        /* two stacked slabs so the rocks read as depth */
        ctx.fillStyle = rgba(mix(ink, pal.ground.face, 0.18), 0.92);
        ctx.beginPath();
        ctx.moveTo(bx, H + 10);
        ctx.lineTo(bx + dir * 220, H + 10);
        ctx.lineTo(bx + dir * 168, H - 54);
        ctx.lineTo(bx + dir * 104, H - 88);
        ctx.lineTo(bx + dir * 40, H - 72);
        ctx.lineTo(bx, H - 34);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba(ink, 0.94);
        ctx.beginPath();
        ctx.moveTo(bx, H + 10);
        ctx.lineTo(bx + dir * 140, H + 10);
        ctx.lineTo(bx + dir * 96, H - 46);
        ctx.lineTo(bx + dir * 44, H - 66);
        ctx.lineTo(bx, H - 20);
        ctx.closePath();
        ctx.fill();
        /* sunlit rim */
        ctx.strokeStyle = rgba(pal.rimLight, 0.16);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + dir * 168, H - 54);
        ctx.lineTo(bx + dir * 104, H - 88);
        ctx.lineTo(bx + dir * 40, H - 72);
        ctx.stroke();
      }
    } else {
      /* low railing / concrete shards in the foreground */
      for (let side = 0; side < 2; side++) {
        const bx = side ? W + 20 : -20;
        const dir = side ? -1 : 1;
        ctx.strokeStyle = rgba(ink, 0.9);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx, H - 60);
        ctx.lineTo(bx + dir * 120, H - 76);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(bx + dir * (20 + i * 34), H - 60 - i * 4);
          ctx.lineTo(bx + dir * (20 + i * 34), H + 10);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    /* speed streaks */
    if (R.mode === 'playing' && R.bike) {
      const sp = Math.hypot(R.bike.vx, R.bike.vy);
      if (sp > 13) {
        const a = U.clamp01((sp - 13) / 18);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = 'rgba(255,244,220,' + (0.05 + a * 0.12) + ')';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
          const t = (time * 2.4 + i * 0.37) % 1;
          const y = H * (0.2 + U.hash(i * 3.1) * 0.6);
          const x = t * W;
          const len = 50 + a * 150;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - len, y + (i % 2 ? 2 : -2));
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  post                                                              */
  /* ------------------------------------------------------------------ */
  Art.drawPost = function (R) {
    const ctx = R.ctx;
    const W = R.W;
    const H = R.H;
    const pal = R.pal;

    /* god rays from the sun */
    if (R.sunScreen) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const sun = R.sunScreen;
      for (let i = 0; i < 3; i++) {
        const spread = (i + 1) * 0.05;
        ctx.fillStyle = 'rgba(255,214,150,' + (0.014 + i * 0.007) + ')';
        ctx.beginPath();
        ctx.moveTo(sun.x, sun.y);
        ctx.lineTo(-W * 0.2, H * (0.25 + spread));
        ctx.lineTo(-W * 0.2, H * (0.55 + spread));
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sun.x, sun.y);
        ctx.lineTo(W * 1.2, H * (0.3 + spread));
        ctx.lineTo(W * 1.2, H * (0.6 + spread));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /* colour grade */
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const grade = ctx.createLinearGradient(0, 0, 0, H);
    grade.addColorStop(0, rgba(pal.accent, 0.18));
    grade.addColorStop(0.55, 'rgba(255,255,255,0)');
    grade.addColorStop(1, rgba(pal.fog, 0.26));
    ctx.globalAlpha = 0.36;
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    /* vignette */
    if (R.vignette) {
      ctx.drawImage(R.vignette, 0, 0, W, H);
    }

    /* ocean of light at the very bottom */
    const bg = ctx.createLinearGradient(0, H * 0.82, 0, H);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, H * 0.82, W, H * 0.18);

    if (R.fade > 0.001) {
      ctx.fillStyle = 'rgba(4,7,12,' + U.clamp01(R.fade) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (R.flashA > 0.001) {
      ctx.fillStyle = R.flashColor || 'rgba(255,220,170,' + U.clamp01(R.flashA * 0.5) + ')';
      ctx.globalAlpha = U.clamp01(R.flashA);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  the motorcycle                                                    */
  /* ------------------------------------------------------------------ */
  function wheelLocal(bike, i) {
    const a = bike.anchors[i];
    const dist = bike.restLen - bike.wheels[i].comp;
    return {
      x: a.x + a.ax * dist,
      y: a.y + a.ay * dist,
      spin: bike.wheels[i].spin,
    };
  }

  function wheel(ctx, x, y, r, spin, rimCol, inkCol) {
    ctx.save();
    ctx.translate(x, y);
    /* tire */
    ctx.fillStyle = rgba(inkCol);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,8,10,0.9)';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.arc(0, 0, r - r * 0.06, 0, TAU);
    ctx.stroke();
    ctx.save();
    ctx.rotate(-spin);
    ctx.strokeStyle = rgba(mix(rimCol, [12, 12, 16], 0.55), 0.9);
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.arc(0, 0, r - r * 0.15, 0, TAU);
    ctx.stroke();
    /* tread knobs */
    ctx.fillStyle = 'rgba(10,10,12,0.9)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-r * 0.055, -r - r * 0.035, r * 0.11, r * 0.17);
      ctx.restore();
    }
    /* spokes */
    ctx.strokeStyle = rgba(mix(rimCol, [190, 192, 200], 0.35), 0.85);
    ctx.lineWidth = r * 0.025;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12);
      ctx.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = rgba(mix(rimCol, [230, 232, 238], 0.4));
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function limb(ctx, pts, w, col) {
    ctx.strokeStyle = rgba(col);
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) * 0.5;
      const my = (pts[i][1] + pts[i + 1][1]) * 0.5;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
  }

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  Art.drawBike = function (R, bike) {
    if (!bike || !R.track) return;
    const ctx = R.ctx;
    const pal = R.pal;
    const s = R.scale();
    const px = R.sx(bike.x);
    const py = R.sy(bike.y);

    /* long soft shadow on the trail */
    const gy = R.track.heightAt(bike.x);
    const gap = Math.max(0, bike.y - 0.76 - gy);
    if (gap < 7) {
      const a = 0.3 * U.clamp01(1 - gap / 7);
      const shx = R.sx(bike.x + 0.06);
      const shy = R.sy(gy) + 1;
      const slope = Math.atan(R.track.slopeAt(bike.x));
      ctx.save();
      ctx.translate(shx, shy);
      ctx.rotate(-slope);
      ctx.scale(1, 0.26);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.55 * s);
      g.addColorStop(0, 'rgba(4,5,9,' + a + ')');
      g.addColorStop(0.55, 'rgba(4,5,9,' + a * 0.62 + ')');
      g.addColorStop(1, 'rgba(4,5,9,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.75 * s, 1.55 * s, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const rear = wheelLocal(bike, 0);
    const front = wheelLocal(bike, 1);
    const lean = bike.lean || 0;
    const thr = bike.throttle || 0;

    const ink = [15, 15, 19];
    const steel = mix(pal.rimLight, [126, 128, 138], 0.62);
    const steelDark = mix(pal.layers[2], [38, 38, 46], 0.4);
    const paint = pal.accent;
    const paintDark = mix(pal.accent, [26, 20, 26], 0.62);
    const cream = mix(pal.rimLight, [242, 232, 210], 0.45);
    const jacket = mix(pal.accent, [64, 26, 30], 0.52);
    const jacketDark = mix(jacket, [10, 10, 14], 0.42);
    const pants = mix(pal.layers[2], [26, 24, 32], 0.55);
    const rimCol = pal.rimLight;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-bike.angle);
    ctx.scale(s, -s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    /* ---------------- rear end ---------------- */
    wheel(ctx, rear.x, rear.y, bike.wheelRadius, rear.spin, rimCol, ink);

    /* swingarm */
    ctx.strokeStyle = rgba(steelDark, 0.95);
    ctx.lineWidth = 0.085;
    ctx.beginPath();
    ctx.moveTo(-0.16, -0.08);
    ctx.lineTo(rear.x, rear.y);
    ctx.stroke();
    ctx.strokeStyle = rgba(steel, 0.35);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(-0.14, -0.045);
    ctx.lineTo(rear.x + 0.02, rear.y + 0.03);
    ctx.stroke();

    /* chain */
    ctx.strokeStyle = 'rgba(20,20,24,0.8)';
    ctx.lineWidth = 0.018;
    ctx.setLineDash([0.03, 0.02]);
    ctx.beginPath();
    ctx.moveTo(0.0, -0.26);
    ctx.lineTo(rear.x, rear.y + 0.02);
    ctx.stroke();
    ctx.setLineDash([]);

    /* shock with spring */
    ctx.strokeStyle = rgba(paintDark, 0.95);
    ctx.lineWidth = 0.034;
    ctx.beginPath();
    ctx.moveTo(-0.22, -0.02);
    ctx.lineTo(-0.44, -0.33);
    ctx.stroke();
    ctx.strokeStyle = rgba(rimCol, 0.75);
    ctx.lineWidth = 0.016;
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      const bx = -0.22 - t * 0.22;
      const by = -0.02 - t * 0.31;
      ctx.beginPath();
      ctx.moveTo(bx - 0.028, by - 0.012);
      ctx.lineTo(bx + 0.028, by + 0.014);
      ctx.stroke();
    }

    /* exhaust: header curve into a long muffler */
    ctx.strokeStyle = rgba(steelDark, 0.95);
    ctx.lineWidth = 0.075;
    ctx.beginPath();
    ctx.moveTo(0.18, -0.24);
    ctx.bezierCurveTo(0.08, -0.4, -0.16, -0.42, -0.36, -0.36);
    ctx.stroke();
    ctx.strokeStyle = rgba(steel, 0.85);
    ctx.lineWidth = 0.055;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.345);
    ctx.lineTo(-0.68, -0.32);
    ctx.stroke();
    ctx.strokeStyle = rgba(ink, 0.85);
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.315);
    ctx.lineTo(-0.68, -0.29);
    ctx.stroke();
    /* muffler tip */
    ctx.fillStyle = rgba(steelDark, 0.9);
    ctx.beginPath();
    ctx.ellipse(-0.685, -0.318, 0.022, 0.034, -0.06, 0, TAU);
    ctx.fill();

    /* ---------------- engine + frame ---------------- */
    ctx.fillStyle = rgba(mix(steelDark, [12, 12, 16], 0.3));
    ctx.beginPath();
    ctx.moveTo(-0.13, -0.3);
    ctx.lineTo(0.17, -0.27);
    ctx.lineTo(0.2, -0.02);
    ctx.lineTo(0.04, 0.05);
    ctx.lineTo(-0.2, 0.0);
    ctx.closePath();
    ctx.fill();
    /* cooling fins */
    ctx.strokeStyle = rgba(steel, 0.28);
    ctx.lineWidth = 0.014;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-0.11, -0.24 + i * 0.05);
      ctx.lineTo(0.16, -0.22 + i * 0.05);
      ctx.stroke();
    }
    /* skid plate */
    ctx.fillStyle = rgba(steel, 0.36);
    rr(ctx, -0.16, -0.36, 0.36, 0.05, 0.02);
    ctx.fill();

    /* frame tubes */
    ctx.strokeStyle = rgba(paintDark, 0.98);
    ctx.lineWidth = 0.052;
    ctx.beginPath();
    ctx.moveTo(0.4, 0.1);
    ctx.lineTo(0.02, 0.14);
    ctx.lineTo(-0.18, 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.38, 0.04);
    ctx.lineTo(0.16, -0.16);
    ctx.stroke();
    ctx.strokeStyle = rgba(steel, 0.35);
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.moveTo(0.4, 0.13);
    ctx.lineTo(0.03, 0.17);
    ctx.stroke();

    /* ---------------- bodywork ---------------- */
    /* rear fender hugging the tire */
    ctx.strokeStyle = rgba(paintDark, 0.97);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.arc(rear.x, rear.y, 0.39, Math.PI * 0.1, Math.PI * 0.76);
    ctx.stroke();
    ctx.strokeStyle = rgba(cream, 0.45);
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.arc(rear.x, rear.y, 0.415, Math.PI * 0.14, Math.PI * 0.72);
    ctx.stroke();

    /* seat */
    ctx.fillStyle = rgba(mix(ink, [46, 40, 44], 0.35));
    ctx.beginPath();
    ctx.moveTo(-0.7, 0.14);
    ctx.quadraticCurveTo(-0.6, 0.24, -0.34, 0.23);
    ctx.lineTo(-0.08, 0.2);
    ctx.lineTo(-0.06, 0.14);
    ctx.quadraticCurveTo(-0.4, 0.15, -0.7, 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(rimCol, 0.35);
    ctx.lineWidth = 0.014;
    ctx.beginPath();
    ctx.moveTo(-0.66, 0.19);
    ctx.quadraticCurveTo(-0.45, 0.235, -0.12, 0.2);
    ctx.stroke();

    /* tank */
    const tank = ctx.createLinearGradient(0.0, 0.16, 0.06, 0.36);
    tank.addColorStop(0, rgba(U.lighten(paint, 0.08)));
    tank.addColorStop(0.5, rgba(paint));
    tank.addColorStop(1, rgba(paintDark));
    ctx.fillStyle = tank;
    ctx.beginPath();
    ctx.moveTo(0.04, 0.16);
    ctx.quadraticCurveTo(0.06, 0.31, 0.2, 0.335);
    ctx.quadraticCurveTo(0.34, 0.34, 0.385, 0.25);
    ctx.quadraticCurveTo(0.36, 0.17, 0.24, 0.155);
    ctx.closePath();
    ctx.fill();
    /* cream flash along the tank */
    ctx.fillStyle = rgba(cream, 0.95);
    ctx.beginPath();
    ctx.moveTo(0.09, 0.2);
    ctx.quadraticCurveTo(0.2, 0.275, 0.35, 0.262);
    ctx.lineTo(0.36, 0.235);
    ctx.quadraticCurveTo(0.2, 0.238, 0.1, 0.178);
    ctx.closePath();
    ctx.fill();
    /* rim light along tank top */
    ctx.strokeStyle = rgba(rimCol, 0.85);
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(0.07, 0.29);
    ctx.quadraticCurveTo(0.2, 0.35, 0.37, 0.26);
    ctx.stroke();

    /* side panel */
    ctx.fillStyle = rgba(paintDark, 0.98);
    ctx.beginPath();
    ctx.moveTo(-0.54, 0.07);
    ctx.lineTo(-0.14, 0.09);
    ctx.lineTo(-0.12, 0.2);
    ctx.lineTo(-0.5, 0.17);
    ctx.closePath();
    ctx.fill();
    /* little number plate on the panel */
    ctx.fillStyle = rgba(cream, 0.92);
    ctx.beginPath();
    ctx.moveTo(-0.44, 0.1);
    ctx.lineTo(-0.3, 0.105);
    ctx.lineTo(-0.29, 0.175);
    ctx.lineTo(-0.42, 0.168);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(paint, 0.9);
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(-0.39, 0.12);
    ctx.lineTo(-0.33, 0.16);
    ctx.moveTo(-0.33, 0.12);
    ctx.lineTo(-0.39, 0.16);
    ctx.stroke();

    /* ---------------- front end ---------------- */
    const steer = [0.4, 0.12];
    /* fork tubes */
    ctx.strokeStyle = rgba(steel, 0.95);
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(steer[0] - 0.02, steer[1]);
    ctx.lineTo(front.x - 0.035, front.y + 0.02);
    ctx.stroke();
    ctx.strokeStyle = rgba(paint, 0.9);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(steer[0], steer[1] + 0.02);
    ctx.lineTo(steer[0] + 0.09, steer[1] - 0.14);
    ctx.stroke();
    /* fork guard */
    ctx.strokeStyle = rgba(paintDark, 0.95);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(0.52, -0.02);
    ctx.lineTo(front.x + 0.05, front.y + 0.14);
    ctx.stroke();

    /* front fender, tight to the tire with a small flap */
    ctx.strokeStyle = rgba(paintDark, 0.97);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.arc(front.x, front.y, 0.39, Math.PI * 0.3, Math.PI * 0.78);
    ctx.stroke();
    ctx.strokeStyle = rgba(cream, 0.6);
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.arc(front.x, front.y, 0.415, Math.PI * 0.34, Math.PI * 0.74);
    ctx.stroke();
    ctx.strokeStyle = rgba(paintDark, 0.9);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(front.x - 0.305, front.y + 0.24);
    ctx.lineTo(front.x - 0.34, front.y + 0.1);
    ctx.stroke();

    wheel(ctx, front.x, front.y, bike.wheelRadius, front.spin, rimCol, ink);

    /* handlebar */
    ctx.strokeStyle = rgba(steel, 0.9);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(steer[0], steer[1] + 0.02);
    ctx.lineTo(steer[0] + 0.03, steer[1] + 0.18);
    ctx.lineTo(steer[0] + 0.16, steer[1] + 0.21);
    ctx.stroke();
    ctx.strokeStyle = rgba(ink, 0.95);
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(steer[0] + 0.11, steer[1] + 0.2);
    ctx.lineTo(steer[0] + 0.18, steer[1] + 0.215);
    ctx.stroke();

    /* headlight */
    const hx = steer[0] + 0.06;
    const hy = steer[1] + 0.1;
    ctx.fillStyle = 'rgba(255,246,214,0.95)';
    ctx.beginPath();
    ctx.arc(hx, hy, 0.045, 0, TAU);
    ctx.fill();
    const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, 0.4);
    hl.addColorStop(0, 'rgba(255,238,190,0.3)');
    hl.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(hx, hy, 0.4, 0, TAU);
    ctx.fill();

    /* ---------------- rider ---------------- */
    const hip = [-0.19, 0.3];
    const shoulder = [0.13 + lean * 0.05 - thr * 0.035, 0.66];
    const head = [shoulder[0] + 0.12, shoulder[1] + 0.15];

    /* far leg peeking behind the frame */
    limb(ctx, [[hip[0] - 0.02, hip[1]], [-0.13, 0.19], [-0.31, 0.055]], 0.16, mix(pants, [10, 10, 14], 0.3));
    ctx.fillStyle = rgba(ink);
    ctx.beginPath();
    ctx.ellipse(-0.32, 0.045, 0.1, 0.05, 0.08, 0, TAU);
    ctx.fill();

    /* torso / jacket */
    limb(ctx, [[hip[0], hip[1] + 0.02], [hip[0] + 0.12, 0.49], shoulder], 0.28, jacket);
    limb(ctx, [[hip[0] + 0.03, hip[1]], [hip[0] + 0.06, 0.5], [shoulder[0] - 0.03, shoulder[1] - 0.02]], 0.2, jacketDark);
    /* shoulder pad */
    ctx.fillStyle = rgba(jacket, 1);
    ctx.beginPath();
    ctx.ellipse(shoulder[0] - 0.01, shoulder[1] - 0.01, 0.1, 0.082, -0.28, 0, TAU);
    ctx.fill();
    /* cream stripe across the back */
    ctx.strokeStyle = rgba(cream, 0.55);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(hip[0] + 0.055, 0.44);
    ctx.quadraticCurveTo(hip[0] + 0.09, 0.51, shoulder[0] - 0.055, shoulder[1] - 0.04);
    ctx.stroke();
    /* collar */
    ctx.fillStyle = rgba(jacketDark, 1);
    ctx.beginPath();
    ctx.ellipse(shoulder[0] + 0.005, shoulder[1] + 0.045, 0.07, 0.045, -0.4, 0, TAU);
    ctx.fill();

    /* near leg */
    limb(ctx, [[hip[0] + 0.06, hip[1] - 0.01], [-0.05, 0.22], [-0.24, 0.055]], 0.175, pants);
    ctx.fillStyle = rgba(ink);
    ctx.beginPath();
    ctx.ellipse(-0.25, 0.045, 0.105, 0.055, 0.08, 0, TAU);
    ctx.fill();
    /* knee pad */
    ctx.fillStyle = rgba(paintDark, 0.9);
    ctx.beginPath();
    ctx.ellipse(-0.07, 0.2, 0.065, 0.055, 0.5, 0, TAU);
    ctx.fill();

    /* arm to the bars */
    limb(ctx, [[shoulder[0] + 0.01, shoulder[1] - 0.03], [0.35, 0.5], [0.55, 0.33]], 0.11, jacket);
    ctx.fillStyle = rgba(ink, 0.95);
    ctx.beginPath();
    ctx.arc(0.55, 0.33, 0.048, 0, TAU);
    ctx.fill();

    /* helmet */
    ctx.fillStyle = rgba(cream);
    ctx.beginPath();
    ctx.arc(head[0], head[1], 0.135, 0, TAU);
    ctx.fill();
    /* visor */
    ctx.fillStyle = 'rgba(22,28,38,0.92)';
    ctx.beginPath();
    ctx.ellipse(head[0] + 0.052, head[1] + 0.012, 0.078, 0.05, -0.12, 0, TAU);
    ctx.fill();
    /* visor glint */
    ctx.strokeStyle = 'rgba(180,235,236,0.55)';
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.arc(head[0] + 0.045, head[1] + 0.02, 0.05, Math.PI * 0.15, Math.PI * 0.62);
    ctx.stroke();
    /* accent band over the helmet */
    ctx.strokeStyle = rgba(paint, 0.9);
    ctx.lineWidth = 0.026;
    ctx.beginPath();
    ctx.arc(head[0], head[1], 0.132, Math.PI * 0.62, Math.PI * 1.05);
    ctx.stroke();
    ctx.strokeStyle = rgba(rimCol, 0.85);
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.arc(head[0], head[1], 0.137, Math.PI * 0.95, Math.PI * 1.45);
    ctx.stroke();

    ctx.restore();
  };

  LTT.RenderArt = Art;
})();

