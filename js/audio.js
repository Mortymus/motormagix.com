/* Motor Magix — procedural 80s/90s-flavoured music and ride sound */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = LTT.util;

  const A = {
    ctx: null,
    ready: false,
    disabled: false,
    muted: false,
    active: false,
    level: 0,
    intensity: 0,
    engineOn: false,
    playing: false,
    step: 0,
    nextTime: 0,
    timer: null,
    config: null,
  };

  let master, musicBus, padBus, padDuck, sfxBus, reverb, delay, noiseBuf;
  let engineGain, engineOsc1, engineOsc2, engineFilter;
  let windGain, windFilter, windSrc, rollGain, rollFilter, rollSrc;

  const CHORDS = {
    maj: [0, 4, 7],
    min: [0, 3, 7],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    dom7: [0, 4, 7, 10],
    sus2: [0, 2, 7],
  };
  const PENTA = {
    synthwave: [0, 3, 5, 7, 10, 12, 15],
    funk: [0, 2, 4, 7, 9, 12, 14],
    jungle: [0, 2, 3, 7, 9, 10, 12],
    cinematic: [0, 2, 3, 7, 8, 12, 15],
  };
  const MIDI = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (A.disabled) return;
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (A.ctx = new Ctx());
    A.ready = true;

    master = ctx.createGain();
    master.gain.value = A.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 26;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.006;
    comp.release.value = 0.28;
    master.connect(comp);
    comp.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.62;
    musicBus.connect(master);

    padDuck = ctx.createGain();
    padDuck.gain.value = 1;
    padBus = ctx.createGain();
    padBus.gain.value = 0.85;
    padBus.connect(padDuck);
    padDuck.connect(musicBus);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);

    /* lush generated plate-ish reverb */
    reverb = ctx.createConvolver();
    const seconds = 2.6;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const ir = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (1 - Math.exp(-i / 400));
      }
    }
    reverb.buffer = ir;
    const revSend = ctx.createGain();
    revSend.gain.value = 0.5;
    revSend.connect(reverb);
    reverb.connect(musicBus);

    delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dFilter = ctx.createBiquadFilter();
    dFilter.type = 'lowpass';
    dFilter.frequency.value = 2400;
    delay.connect(dFilter);
    dFilter.connect(fb);
    fb.connect(delay);
    const dOut = ctx.createGain();
    dOut.gain.value = 0.42;
    dFilter.connect(dOut);
    dOut.connect(musicBus);
    A.revSend = revSend;
    A.delaySend = delay;

    noiseBuf = ctx.createBuffer(1, rate * 2, rate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    buildEngine();
    buildWind();
  }

  /* ------------------------------------------------------------------ */
  /*  synthesis helpers                                                 */
  /* ------------------------------------------------------------------ */
  function gainEnv(node, t, attack, decay, peak) {
    const g = node.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function osc(type, freq, t, dur, peak, dest, opts) {
    const ctx = A.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts && opts.glide) {
      o.frequency.exponentialRampToValueAtTime(opts.glide, t + dur);
    }
    const g = ctx.createGain();
    gainEnv(g, t, (opts && opts.a) || 0.005, dur, peak);
    let node = o;
    if (opts && opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = opts.filter.type || 'lowpass';
      f.frequency.setValueAtTime(opts.filter.from || 1200, t);
      f.frequency.exponentialRampToValueAtTime(
        opts.filter.to || 800,
        t + (opts.filter.time || dur)
      );
      f.Q.value = opts.filter.q || 0.7;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest);
    if (opts && opts.rev) {
      const s = ctx.createGain();
      s.gain.value = opts.rev;
      g.connect(s);
      s.connect(A.revSend);
    }
    if (opts && opts.delay) {
      const s = ctx.createGain();
      s.gain.value = opts.delay;
      g.connect(s);
      s.connect(A.delaySend);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  function noise(t, dur, peak, filterOpts, dest) {
    const ctx = A.ctx;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = (filterOpts && filterOpts.type) || 'highpass';
    f.frequency.setValueAtTime((filterOpts && filterOpts.from) || 4000, t);
    if (filterOpts && filterOpts.to) {
      f.frequency.exponentialRampToValueAtTime(filterOpts.to, t + dur);
    }
    f.Q.value = (filterOpts && filterOpts.q) || 0.8;
    const g = ctx.createGain();
    gainEnv(g, t, 0.002, dur, peak);
    src.connect(f);
    f.connect(g);
    g.connect(dest || sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  function kick(t, soft) {
    const ctx = A.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(soft ? 110 : 145, t);
    o.frequency.exponentialRampToValueAtTime(soft ? 42 : 36, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(soft ? 0.34 : 0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + 0.45);
    noise(t, 0.04, soft ? 0.08 : 0.16, { type: 'lowpass', from: 3000 }, musicBus);
    /* sidechain the pads */
    if (padDuck) {
      padDuck.gain.setTargetAtTime(0.66, t, 0.012);
      padDuck.gain.setTargetAtTime(1, t + 0.11, 0.12);
    }
  }

  function snare(t, soft, electronic) {
    noise(t, soft ? 0.13 : 0.2, soft ? 0.14 : 0.24, {
      type: 'bandpass',
      from: electronic ? 2400 : 1700,
      q: 0.9,
    }, musicBus);
    const o = A.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(210, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(soft ? 0.06 : 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + 0.12);
  }

  function hat(t, open, vel) {
    noise(t, open ? 0.2 : 0.035, (open ? 0.09 : 0.05) * (vel || 1), {
      type: 'highpass',
      from: 7600,
    }, musicBus);
  }

  function clap(t) {
    for (let i = 0; i < 3; i++) {
      noise(t + i * 0.011, 0.06, 0.1, { type: 'bandpass', from: 2100, q: 1.4 }, musicBus);
    }
  }

  function bassNote(t, midi, dur, flavour) {
    const f = MIDI(midi);
    const isFunk = flavour === 'funk';
    osc('sawtooth', f, t, dur, isFunk ? 0.14 : 0.155, musicBus, {
      filter: {
        type: 'lowpass',
        from: isFunk ? 900 : 640,
        to: isFunk ? 260 : 190,
        time: dur,
        q: 5,
      },
      rev: 0.04,
    });
    osc('square', f / 2, t, dur, 0.08, musicBus, { a: 0.01 });
  }

  function padChord(t, midi, type, dur, flavour) {
    const ints = CHORDS[type] || CHORDS.min;
    const bright = flavour === 'synthwave' || flavour === 'cinematic';
    for (let i = 0; i < ints.length; i++) {
      const f = MIDI(midi + ints[i]);
      for (let d = -1; d <= 1; d += 2) {
        const det = 1 + d * 0.0035;
        osc('sawtooth', f * det, t, dur, 0.026, padBus, {
          a: 0.5,
          filter: {
            type: 'lowpass',
            from: bright ? 1500 : 950,
            to: bright ? 700 : 520,
            time: dur,
            q: 0.6,
          },
          rev: 0.22,
        });
      }
    }
    /* a soft sub-octave pillow */
    osc('sine', MIDI(midi - 12), t, dur, 0.05, padBus, { a: 0.7 });
  }

  function pluck(t, midi, dur, flavour) {
    const f = MIDI(midi);
    if (flavour === 'country' || flavour === 'funk') {
      osc('triangle', f, t, dur, 0.11, musicBus, {
        rev: 0.13,
        delay: 0.16,
        filter: { type: 'lowpass', from: 5200, to: 1200, time: dur, q: 1 },
      });
      osc('sine', f * 2, t, dur * 0.6, 0.035, musicBus, {});
    } else if (flavour === 'jungle') {
      osc('sine', f * 2, t, dur, 0.11, musicBus, { rev: 0.22, delay: 0.2 });
      osc('sine', f * 5.02, t, dur * 0.35, 0.035, musicBus, {});
    } else {
      osc('square', f, t, dur, 0.05, musicBus, {
        filter: { type: 'lowpass', from: 2600, to: 900, time: dur, q: 2 },
        delay: 0.28,
        rev: 0.14,
      });
    }
  }

  function tom(t, freq) {
    osc('sine', freq, t, 0.16, 0.14, musicBus, { glide: freq * 0.55 });
    noise(t, 0.08, 0.05, { type: 'bandpass', from: 900, q: 1.2 }, musicBus);
  }

  /* ------------------------------------------------------------------ */
  /*  sequencer                                                         */
  /* ------------------------------------------------------------------ */
  const PATTERNS = {
    synthwave: {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
      bass: [0, -1, 12, 0, 0, -1, 12, 0, 0, -1, 12, 0, 7, -1, 12, 0],
      arp: [0, 7, 12, 15, 19, 15, 12, 7, 0, 7, 12, 15, 19, 22, 19, 15],
    },
    funk: {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
      bass: [0, 0, -1, 12, 0, -1, 7, 0, 0, 10, 0, 12, -1, 0, 7, 0],
      arp: [0, 4, 7, 11, 14, 11, 7, 4, 0, 4, 7, 11, 16, 14, 11, 7],
    },
    jungle: {
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
      bass: [0, 0, 12, -1, 0, 7, 0, 0, 12, 0, 0, -1, 7, 0, 12, 0],
      arp: [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 12, 15, 12, 7, 3],
    },
    cinematic: {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      bass: [0, -1, -1, -1, 12, -1, -1, -1, 7, -1, -1, -1, 10, -1, -1, -1],
      arp: [0, 7, 12, 19, 24, 19, 12, 7, 0, 7, 12, 19, 22, 19, 12, 7],
    },
  };

  function scheduleStep(step, t) {
    const cfg = A.config;
    if (!cfg) return;
    const fl = cfg.flavour;
    const pat = PATTERNS[fl] || PATTERNS.synthwave;
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const chord = cfg.prog[bar % cfg.prog.length];
    const chordRoot = cfg.root + chord.r;
    const chordType = chord.t;
    const beat = 60 / cfg.tempo / 4;
    const intensity = A.intensity;

    if (pat.kick[s]) kick(t, fl === 'country');
    if (pat.snare[s]) {
      if (fl === 'jungle' && (s === 7 || s === 15)) clap(t);
      snare(t, fl === 'country', fl !== 'country');
    }
    if (pat.hat[s]) hat(t, s === 14, s % 4 === 0 ? 1 : 0.65);

    /* kick/clap flams for grit */
    if (fl === 'jungle' && (s === 3 || s === 11)) tom(t, 140 + (s % 2) * 60);

    if (s === 0) {
      padChord(t, chordRoot + 12, chordType, beat * 15.4, fl);
    }

    const b = pat.bass[s];
    if (b >= 0) {
      bassNote(t, chordRoot - 12 + b, beat * (fl === 'funk' ? 0.8 : 1.6), fl);
    }

    /* arp appears as the ride heats up */
    if ((s % 2 === 0 && intensity > 0.25) || s % 4 === 0) {
      if (fl !== 'country' || s % 4 === 0) {
        const notes = CHORDS[chordType] || CHORDS.min;
        const idx = pat.arp[s] % 3;
        const oct = Math.floor(pat.arp[s] / 3);
        const n = chordRoot + 12 + notes[Math.min(notes.length - 1, idx)] + oct * 12;
        pluck(t, n, beat * 0.9, fl);
      }
    }

    /* little fills every fourth bar */
    if (bar === 3 && s >= 12) {
      snare(t, false, false);
      if (s === 15) tom(t, 190);
    }
    if (intensity > 0.6 && s === 10 && fl !== 'cinematic') {
      const sc = PENTA[fl] || PENTA.synthwave;
      pluck(t, chordRoot + 24 + sc[(step * 3) % sc.length], beat * 0.5, fl);
    }
  }

  function scheduler() {
    if (!A.ready || !A.playing || !A.ctx) return;
    const now = A.ctx.currentTime;
    if (A.nextTime < now) A.nextTime = now + 0.03;
    const horizon = now + 0.22;
    const stepDur = 60 / A.config.tempo / 4;
    while (A.nextTime < horizon) {
      scheduleStep(A.step, A.nextTime);
      A.step++;
      A.nextTime += stepDur;
    }
  }

  function startMusic(levelIndex) {
    if (A.disabled) return;
    init();
    if (!A.ready) return;
    A.config = LTT.LEVELS[levelIndex].music;
    A.level = levelIndex;
    A.step = 0;
    A.playing = true;
    A.nextTime = A.ctx.currentTime + 0.08;
    musicBus.gain.cancelScheduledValues(A.ctx.currentTime);
    musicBus.gain.setValueAtTime(0.0001, A.ctx.currentTime);
    musicBus.gain.exponentialRampToValueAtTime(0.62, A.ctx.currentTime + 1.4);
    if (A.timer) clearInterval(A.timer);
    A.timer = setInterval(scheduler, 25);
    scheduler();
  }

  function stopMusic(fade) {
    if (!A.ready) return;
    A.playing = false;
    if (A.timer) {
      clearInterval(A.timer);
      A.timer = null;
    }
    const t = A.ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 0.8));
  }

  /* ------------------------------------------------------------------ */
  /*  ride sound                                                        */
  /* ------------------------------------------------------------------ */
  function buildEngine() {
    const ctx = A.ctx;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineFilter.Q.value = 3.5;
    engineOsc1 = ctx.createOscillator();
    engineOsc1.type = 'sawtooth';
    engineOsc1.frequency.value = 48;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 24;
    const sub = ctx.createGain();
    sub.gain.value = 0.55;
    engineOsc1.connect(engineFilter);
    engineOsc2.connect(sub);
    sub.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(sfxBus);
    engineOsc1.start();
    engineOsc2.start();
  }

  function buildWind() {
    const ctx = A.ctx;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.5;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(sfxBus);
    windSrc.start();

    rollSrc = ctx.createBufferSource();
    rollSrc.buffer = noiseBuf;
    rollSrc.loop = true;
    rollFilter = ctx.createBiquadFilter();
    rollFilter.type = 'lowpass';
    rollFilter.frequency.value = 900;
    rollGain = ctx.createGain();
    rollGain.gain.value = 0;
    rollSrc.connect(rollFilter);
    rollFilter.connect(rollGain);
    rollGain.connect(sfxBus);
    rollSrc.start();
  }

  A.updateRide = function (speed, throttle, grounded, active) {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    const kmh = speed * 3.6;
    if (!active) {
      engineGain.gain.setTargetAtTime(0, t, 0.08);
      windGain.gain.setTargetAtTime(0, t, 0.2);
      rollGain.gain.setTargetAtTime(0, t, 0.1);
      return;
    }
    const eFreq = 38 + speed * 2.7 + throttle * 11;
    engineOsc1.frequency.setTargetAtTime(eFreq, t, 0.06);
    engineOsc2.frequency.setTargetAtTime(eFreq * 0.502, t, 0.06);
    engineFilter.frequency.setTargetAtTime(220 + speed * 21 + throttle * 160, t, 0.08);
    const eGain = 0.02 + throttle * 0.035 + Math.min(0.02, speed * 0.0008);
    engineGain.gain.setTargetAtTime(A.muted ? 0 : eGain, t, 0.06);

    windFilter.frequency.setTargetAtTime(420 + speed * 26, t, 0.2);
    windGain.gain.setTargetAtTime(Math.min(0.055, (speed * speed) * 0.00007), t, 0.2);
    rollGain.gain.setTargetAtTime(
      grounded ? Math.min(0.025, speed * 0.0012) : 0.001,
      t,
      0.08
    );
  };

  A.thump = function (strength) {
    if (!A.ready) return;
    init();
    const t = A.ctx.currentTime + 0.005;
    const s = U.clamp(strength, 0, 1);
    osc('sine', 92, t, 0.22 + s * 0.16, 0.14 + s * 0.3, sfxBus, {
      glide: 42,
      a: 0.003,
      rev: 0.12,
    });
    noise(t, 0.16 + s * 0.2, 0.05 + s * 0.16, {
      type: 'lowpass',
      from: 1400,
      to: 260,
    }, sfxBus);
  };

  A.whoosh = function (strength) {
    if (!A.ready) return;
    init();
    const t = A.ctx.currentTime + 0.005;
    noise(t, 0.5 + strength * 0.4, 0.05 + strength * 0.11, {
      type: 'bandpass',
      from: 500,
      to: 2400,
      q: 1.4,
    }, sfxBus);
  };

  A.chime = function () {
    if (!A.ready) return;
    const t = A.ctx.currentTime + 0.01;
    const notes = [88, 95];
    notes.forEach((n, i) => {
      osc('sine', MIDI(n), t + i * 0.09, 0.7, 0.09, sfxBus, { rev: 0.5, delay: 0.25 });
      osc('triangle', MIDI(n) * 2, t + i * 0.09, 0.4, 0.03, sfxBus, { rev: 0.3 });
    });
  };

  A.tick = function () {
    if (!A.ready) return;
    const t = A.ctx.currentTime + 0.005;
    osc('square', 880, t, 0.05, 0.025, sfxBus, {});
  };

  A.finish = function () {
    if (!A.ready) return;
    const t = A.ctx.currentTime + 0.02;
    [0, 4, 7, 12, 16].forEach((n, i) => {
      osc('triangle', MIDI(60 + n), t + i * 0.1, 1.6, 0.1, sfxBus, {
        rev: 0.6,
        delay: 0.3,
      });
    });
  };

  A.crash = function () {
    if (!A.ready) return;
    const t = A.ctx.currentTime + 0.01;
    noise(t, 0.55, 0.22, { type: 'lowpass', from: 1800, to: 220 }, sfxBus);
    osc('sine', 70, t, 0.5, 0.28, sfxBus, { glide: 32 });
  };

  A.setIntensity = function (v) {
    A.intensity = U.clamp(v, 0, 1);
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (A.ready) {
      const t = A.ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(m ? 0 : 0.9, t, 0.05);
      engineGain.gain.setTargetAtTime(0, t, 0.05);
    }
  };

  A.pause = function () {
    if (!A.ready) return;
    stopMusic(0.3);
    if (A.ctx.state === 'running') A.ctx.suspend();
  };

  A.resume = function (levelIndex) {
    if (!A.ready) return;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    if (!A.playing && levelIndex != null) startMusic(levelIndex);
  };

  A.startMusic = startMusic;
  A.stopMusic = stopMusic;
  A.init = init;
  LTT.Audio = A;
})();
