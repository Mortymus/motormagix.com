/* LANG TUNG TING — keyboard, touch and smoothed analog input */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = LTT.util;

  const keys = Object.create(null);
  const touchActs = Object.create(null);
  let resetQueued = false;
  let pauseQueued = false;
  let anyInput = false;
  let firstInputCb = null;
  let soundCb = null;

  const Input = {
    throttle: 0,
    brake: 0,
    lean: 0,
    rawThrottle: 0,
    rawBrake: 0,
    rawLean: 0,
    anyInput: false,

    init() {
      window.addEventListener('keydown', onKeyDown, { passive: false });
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', clearKeys);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearKeys();
      });
      bindTouch();
      detectTouch();
    },

    setFirstInput(fn) {
      firstInputCb = fn;
    },
    setSoundToggle(fn) {
      soundCb = fn;
    },

    update(dt) {
      const k = keys;
      let th = k['w'] || k['arrowup'] || touchActs.throttle ? 1 : 0;
      let br = k['s'] || k['arrowdown'] || touchActs.brake ? 1 : 0;
      let ln =
        (k['a'] || k['arrowleft'] || touchActs.leanLeft ? 1 : 0) -
        (k['d'] || k['arrowright'] || touchActs.leanRight ? 1 : 0);

      this.rawThrottle = th;
      this.rawBrake = br;
      this.rawLean = ln;

      /* deliberately soft: the bike is heavy, inputs arrive with a beat of lag */
      this.throttle = U.damp(this.throttle, th, 13, dt);
      this.brake = U.damp(this.brake, br, 16, dt);
      this.lean = U.damp(this.lean, ln, 10, dt);
      if (Math.abs(this.throttle) < 0.002) this.throttle = th;
      if (Math.abs(this.brake) < 0.002) this.brake = br;
      if (Math.abs(this.lean) < 0.002) this.lean = 0;
      this.anyInput = th + br + Math.abs(ln) > 0;
    },

    consumeReset() {
      const v = resetQueued;
      resetQueued = false;
      return v;
    },
    consumePause() {
      const v = pauseQueued;
      pauseQueued = false;
      return v;
    },
    release() {
      this.throttle = 0;
      this.brake = 0;
      this.lean = 0;
      clearKeys();
    },
  };

  function noteInput() {
    if (!anyInput) {
      anyInput = true;
      if (firstInputCb) firstInputCb();
    }
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (
      k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' ||
      k === 'arrowright' || k === ' '
    ) {
      e.preventDefault();
    }
    if (e.repeat) {
      keys[k] = true;
      return;
    }
    keys[k] = true;
    noteInput();
    if (k === 'r') resetQueued = true;
    if (k === 'escape' || k === 'p') pauseQueued = true;
    if (k === 'm' && soundCb) soundCb();
  }

  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }

  function clearKeys() {
    for (const k in keys) keys[k] = false;
    for (const a in touchActs) touchActs[a] = false;
    document.querySelectorAll('.tbtn.pressed').forEach((b) => b.classList.remove('pressed'));
  }

  function bindTouch() {
    const buttons = document.querySelectorAll('[data-act]');
    const activePointers = new Map();

    buttons.forEach((btn) => {
      const act = btn.dataset.act;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        noteInput();
        activePointers.set(e.pointerId, act);
        if (act === 'reset') {
          resetQueued = true;
        } else if (act === 'pause') {
          pauseQueued = true;
        } else {
          touchActs[act] = true;
        }
        btn.classList.add('pressed');
      });
      const release = (e) => {
        const a = activePointers.get(e.pointerId);
        if (!a) return;
        activePointers.delete(e.pointerId);
        if (a !== 'reset' && a !== 'pause') touchActs[a] = false;
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  function detectTouch() {
    const query = new URLSearchParams(location.search);
    const force = query.get('touch');
    const isTouch =
      force === '1' ||
      (force !== '0' &&
        (('ontouchstart' in window && navigator.maxTouchPoints > 0) ||
          window.matchMedia('(pointer: coarse)').matches));
    if (isTouch) document.getElementById('app').classList.add('touch-on');
  }

  LTT.Input = Input;
})();
