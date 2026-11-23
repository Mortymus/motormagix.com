/* Motor Magix — game loop, run state, timing */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = LTT.util;
  const STEP = 1 / 120;
  const TIME_SCALE = 0.86;

  const Game = {
    state: 'title',
    levelIndex: 0,
    track: null,
    tracks: [],
    bike: null,
    time: 0,
    acc: 0,
    countdownT: 0,
    countdownStage: null,
    runSplits: [],
    nextCP: 0,
    bestAtStart: null,
    crashTimer: 0,
    crashAnnounced: false,
    stuckTimer: 0,
    autoDrive: false,
    prevState: 'playing',
    fps: 60,
    frameCount: 0,
    debug: false,
    lastLanded: 0,
  };

  const $ = (id) => document.getElementById(id);

  /* surface any runtime failure in headless tests and the debug overlay */
  window.LTT_ERRORS = [];
  window.addEventListener('error', (e) => {
    const msg = (e.message || 'error') + ' @ ' + (e.filename || '?') + ':' + (e.lineno || 0);
    window.LTT_ERRORS.push(msg);
    document.title = 'ERROR ' + msg;
    const dbg = document.getElementById('debug');
    if (dbg) {
      dbg.textContent = 'ERROR\n' + window.LTT_ERRORS.join('\n');
      document.getElementById('app').classList.add('debug-on');
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = 'promise: ' + (e.reason && e.reason.message ? e.reason.message : e.reason);
    window.LTT_ERRORS.push(msg);
    document.title = 'ERROR ' + msg;
  });

  Game.init = function () {
    this.canvas = $('scene');
    LTT.Render.init(this.canvas);

    /* build every road up-front so the roadbook can preview them */
    this.tracks = LTT.LEVELS.map((lv, i) => LTT.createTrack(i));
    this.levelIndex = 0;
    this.track = this.tracks[0];
    LTT.Render.setLevel(0, this.track);
    LTT.Render.setMode('title');

    LTT.UI.init(this);
    LTT.Input.init();
    LTT.Input.setFirstInput(() => this.ensureAudio());
    LTT.Input.setSoundToggle(() => this.toggleMute());

    this.parseQuery();
    /* dev hook: ?screen=select|title|pause|results opens a screen directly */
    const scr = this.q.get('screen');
    if (scr === 'select') this.toSelect();
    else if (scr === 'title') this.toTitle();
    else if (scr === 'pause') {
      LTT.UI.pauseInfo(84.2, 0);
      LTT.UI.setState('paused');
    } else if (scr === 'results') {
      LTT.UI.showResults({
        levelIndex: 0, medal: 3, isPB: true, previousBest: 173.2,
        time: 168.4, best: 168.4, airTotal: 47.7, biggestAir: 2.53, topSpeed: 22.5,
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (this.state === 'playing' || this.state === 'countdown')) {
        this.pause();
      }
    });

    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  };

  Game.parseQuery = function () {
    const q = new URLSearchParams(location.search);
    this.q = q;
    LTT.Audio.disabled = q.get('audio') === '0';
    const debug = q.get('debug') === '1';
    this.maxFrames = parseInt(q.get('frames') || '0', 10) || 0;
    if (debug) {
      this.debug = true;
      $('app').classList.add('debug-on');
    }
    /* dev hook: ?unlock=1 opens the bonus track for testing */
    if (q.get('unlock') === '1') {
      LTT.UI.progress.completed[0] = true;
      LTT.UI.progress.completed[1] = true;
      LTT.UI.progress.completed[2] = true;
    }
    const lvlParam = parseInt(q.get('level'), 10);
    if (lvlParam >= 0 && lvlParam < LTT.LEVELS.length) {
      this.levelIndex = lvlParam;
      this.track = this.tracks[lvlParam];
      LTT.Render.setLevel(lvlParam, this.track);
    }
    const xParam = q.get('pose');
    const vxParam = q.get('vx');
    if (q.get('auto') === '1') {
      const lv = lvlParam >= 0 && lvlParam < LTT.LEVELS.length ? lvlParam : 0;
      this.startRun(lv, true);
      this.autoDrive = true;
      if (xParam != null) {
        const x = parseFloat(xParam);
        this.bike.resetAt(x);
        this.bike.vx = vxParam != null ? parseFloat(vxParam) : 18;
        this.bike.vy = 0;
        this.bike.frozen = false;
        LTT.Render.snapCamera(this.bike);
        LTT.Render.cam.zoom = 0.95;
      }
      const fast = parseFloat(q.get('fast') || '0');
      if (fast > 0) this.fastForward(fast);
    }
  };

  Game.ensureAudio = function () {
    LTT.Audio.init();
    if (LTT.Audio.ready) LTT.Audio.setMuted(LTT.UI.progress.muted);
  };

  Game.applyMute = function () {
    if (LTT.Audio.ready) LTT.Audio.setMuted(LTT.UI.progress.muted);
  };

  Game.toggleMute = function () {
    this.ensureAudio();
    LTT.UI.setMuted(!LTT.UI.progress.muted);
    if (!LTT.UI.progress.muted) LTT.Audio.tick();
  };

  Game.toTitle = function () {
    this.state = 'title';
    this.bike = null;
    this.time = 0;
    this.countdownT = 0;
    LTT.UI.setState('title');
    LTT.UI.refreshMeta();
    LTT.UI.clearCountdown();
    LTT.Render.setMode('title');
    LTT.Render.bike = null;
    LTT.Render.setLevel(0, this.tracks[0]);
    this.track = this.tracks[0];
    LTT.Render.attractT = 0;
    LTT.Audio.stopMusic(0.4);
    LTT.Audio.updateRide(0, 0, false, false);
  };

  Game.toSelect = function () {
    this.state = 'select';
    this.bike = null;
    this.time = 0;
    LTT.UI.setState('select');
    LTT.UI.refreshMeta();
    LTT.UI.clearCountdown();
    LTT.Render.setMode('select');
    LTT.Render.bike = null;
    LTT.Render.attractT = 0;
    if (this.track) LTT.Render.setLevel(this.levelIndex, this.track);
    LTT.Audio.stopMusic(0.5);
    LTT.Audio.updateRide(0, 0, false, false);
  };

  Game.previewLevel = function (index) {
    if (this.state !== 'select') return;
    this.levelIndex = index;
    this.track = this.tracks[index];
    LTT.Render.setLevel(index, this.track);
    LTT.Render.attractT = 0;
  };

  Game.startRun = function (index, instant) {
    index = index == null ? this.levelIndex : index;
    if (!LTT.UI.isUnlocked(index)) return;
    this.ensureAudio();
    this.levelIndex = index;
    this.track = this.tracks[index];
    LTT.Render.setLevel(index, this.track);
    LTT.Render.bike = null;
    LTT.UI.setLevel(index);

    this.bike = new LTT.Bike(this.track);
    this.bike.resetAt(this.track.startX + 6);
    this.time = 0;
    this.acc = 0;
    this.runSplits = [];
    this.nextCP = 0;
    this.bestAtStart = LTT.UI.progress.best[LTT.LEVELS[index].id] || null;
    this.crashTimer = 0;
    this.crashAnnounced = false;
    this.stuckTimer = 0;
    this.countdownT = 3.0;
    this.countdownStage = null;
    this.prevState = 'playing';
    this.lastLanded = 0;
    LTT.Render.snapCamera(this.bike);
    LTT.Render.flashA = 0;
    LTT.Render.fade = 0;
    LTT.Audio.startMusic(index);
    LTT.Audio.setIntensity(0.2);

    if (instant) {
      this.state = 'playing';
      this.bike.frozen = false;
      LTT.UI.setState('playing');
      LTT.Render.setMode('playing');
      LTT.UI.clearCountdown();
      this.countdownT = 0;
    } else {
      this.state = 'countdown';
      this.bike.frozen = true;
      LTT.UI.setState('countdown');
      LTT.Render.setMode('countdown');
      LTT.UI.countdown('3', false);
      this.countdownStage = 3;
      if (LTT.Audio.ready) LTT.Audio.tick();
    }
    LTT.UI.debug('');
  };

  Game.beginRun = function () {
    this.state = 'playing';
    this.bike.frozen = false;
    LTT.UI.setState('playing');
    LTT.UI.clearCountdown();
    LTT.Render.setMode('playing');
    LTT.Audio.setIntensity(0.3);
    if (LTT.Audio.ready) LTT.Audio.chime();
  };

  Game.respawn = function (auto) {
    if (!this.bike) return;
    const cps = this.track.checkpoints;
    let x = this.track.startX + 6;
    if (this.nextCP > 0) x = cps[this.nextCP - 1] + 2.5;
    this.bike.resetAt(x);
    this.bike.frozen = false;
    this.crashTimer = 0;
    this.crashAnnounced = false;
    this.stuckTimer = 0;
    LTT.Render.snapCamera(this.bike);
    LTT.Render.cam.zoom = 0.95;
    const pop = document.getElementById('air-pop');
    if (pop) pop.classList.remove('live', 'show');
    LTT.UI.toast(auto ? 'BACK ON THE ROAD' : 'RESET TO LAST GATE', 1300);
    if (LTT.Audio.ready) LTT.Audio.tick();
  };

  Game.pause = function () {
    if (this.state !== 'playing' && this.state !== 'countdown') return;
    this.prevState = this.state;
    this.state = 'paused';
    LTT.UI.setState('paused');
    LTT.UI.pauseInfo(this.time, this.levelIndex);
    LTT.Render.setMode('paused');
    LTT.Audio.pause();
    LTT.Audio.updateRide(0, 0, false, false);
  };

  Game.resume = function () {
    if (this.state !== 'paused') return;
    this.state = this.prevState;
    LTT.UI.setState(this.state);
    LTT.Render.setMode(this.state);
    this.ensureAudio();
    LTT.Audio.resume(this.levelIndex);
    this.last = performance.now();
  };

  Game.restart = function () {
    LTT.Audio.stopMusic(0.25);
    this.startRun(this.levelIndex, false);
  };

  Game.nextLevel = function () {
    let n = this.levelIndex + 1;
    if (n >= LTT.LEVELS.length || !LTT.UI.isUnlocked(n)) {
      this.toSelect();
      return;
    }
    this.startRun(n, false);
  };

  Game.finishRun = function () {
    if (this.state !== 'playing') return;
    this.state = 'results';
    this.bike.frozen = true;
    this.time = Math.max(this.time, 1);
    const splits = this.runSplits.concat([this.time]);
    const result = LTT.UI.recordResult(this.levelIndex, this.time, splits, {});
    this.lastResult = result;
    LTT.UI.showResults({
      levelIndex: this.levelIndex,
      time: this.time,
      isPB: result.isPB,
      previousBest: result.previousBest,
      best: result.best,
      medal: result.medal,
      airTotal: this.bike.airTotal,
      biggestAir: this.bike.biggestAir,
      topSpeed: this.bike.topSpeed,
    });
    LTT.Render.setMode('results');
    LTT.UI.airLive(0);
    LTT.Audio.stopMusic(2.2);
    LTT.Audio.finish();
    LTT.Audio.updateRide(0, 0, false, false);
  };

  Game.fastForward = function (seconds) {
    if (!this.bike) return;
    this.autoDrive = true;
    const steps = Math.min(120 * 240, Math.round(seconds * 120));
    for (let i = 0; i < steps; i++) {
      if (this.state !== 'playing') break;
      this.stepSim(1, 0, 0);
      if (this.bike.crashed) {
        this.respawn(true);
      }
    }
    LTT.Render.snapCamera(this.bike);
    const sp = Math.hypot(this.bike.vx, this.bike.vy);
    LTT.Render.cam.zoom = U.clamp(1.02 - sp * 0.011, 0.72, 1.05);
  };

  Game.stepSim = function (throttle, brake, lean) {
    const bike = this.bike;
    if (!bike) return;
    bike.update(STEP, {
      throttle: throttle,
      brake: brake,
      lean: lean,
    });
    this.time += STEP;

    if (bike.justLanded) {
      this.lastLanded = bike.lastAir;
      if (bike.lastAir > 0.55) {
        LTT.UI.airPop(bike.lastAir);
        LTT.Audio.thump(Math.min(1, bike.lastAir / 2.6));
        LTT.Render.shake = Math.min(0.75, 0.15 + bike.lastAir * 0.24);
      }
    }

    /* checkpoints */
    const cps = this.track.checkpoints;
    while (this.nextCP < cps.length && bike.x > cps[this.nextCP]) {
      this.runSplits.push(this.time);
      const d = LTT.UI.splitDelta(this.levelIndex, this.nextCP, this.time);
      LTT.UI.hitCheckpoint(this.nextCP);
      let html = 'GATE ' + (this.nextCP + 1) + ' / ' + cps.length;
      if (d != null) {
        html += ' &nbsp;<span class="' + (d < 0 ? 'good' : 'bad') + '">' + U.fmtDelta(d) + '</span>';
        LTT.UI.delta(d);
      }
      LTT.UI.toast(html, 2200);
      if (LTT.Audio.ready) LTT.Audio.chime();
      this.nextCP++;
    }

    if (bike.x > this.track.finishX) {
      this.finishRun();
      return;
    }

    if (bike.crashed) {
      this.crashTimer += STEP;
      if (!this.crashAnnounced) {
        this.crashAnnounced = true;
        LTT.Audio.crash();
        LTT.Render.flashA = 0.5;
        LTT.Render.flashColor = 'rgb(255,116,74)';
        LTT.UI.toast('WIPEOUT — HOLDING FOR THE RESET', 1800);
      }
      if (this.crashTimer > 1.25) this.respawn(false);
    } else {
      const sp = Math.hypot(bike.vx, bike.vy);
      if (sp < 1.6 && !bike.airborne && throttle > 0.2) {
        this.stuckTimer += STEP;
      } else {
        this.stuckTimer = 0;
      }
      if (this.stuckTimer > 3.2) {
        this.respawn(true);
      }
    }
  };

  Game.loop = function (now) {
    if (this.maxFrames && this.frameCount >= this.maxFrames) {
      if (!this._held) {
        this._held = true;
        const R = LTT.Render;
        document.title =
          'DONE ' + this.state + ' frames=' + this.frameCount +
          ' x=' + (this.bike ? this.bike.x.toFixed(1) : '-') +
          ' y=' + (this.bike ? this.bike.y.toFixed(1) : '-') +
          ' cam=' + R.cam.x.toFixed(1) + ',' + R.cam.y.toFixed(1) + ',' + R.cam.zoom.toFixed(2) +
          ' canvas=' + R.canvas.width + 'x' + R.canvas.height +
          ' pal=' + (R.pal ? 'yes' : 'no') +
          ' W=' + R.W +
          ' fps=' + this.fps.toFixed(1) +
          ' stage=' + R._stage;
        try {
          const c = R.ctx.getImageData(
            Math.floor(R.canvas.width * 0.5),
            Math.floor(R.canvas.height * 0.4),
            1, 1
          ).data;
          document.title += ' px=' + c[0] + ',' + c[1] + ',' + c[2];
        } catch (e) {
          document.title += ' pxErr';
        }
      }
      /* keep presenting the last frame so headless screenshots capture it */
      LTT.Render.update(0, this.bike, null);
      LTT.Render.draw();
      requestAnimationFrame(this.loop);
      return;
    }
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.fps = this.fps * 0.94 + (1 / Math.max(0.001, raw)) * 0.06;
    this.frameCount++;
    this.frame(raw);
    requestAnimationFrame(this.loop);
  };

  Game.frame = function (raw) {
    const R = LTT.Render;
    LTT.Input.update(raw);
    if (!this.autoDrive) {
      if (LTT.Input.consumePause()) {
        if (this.state === 'paused') this.resume();
        else if (this.state === 'playing' || this.state === 'countdown') this.pause();
      }
    }

    if (this.state === 'title' || this.state === 'select') {
      R.update(raw, null, null);
      R.draw();
      this.updateDebug();
      return;
    }

    if (this.state === 'countdown') {
      this.countdownT -= raw;
      const stage = Math.ceil(this.countdownT);
      if (stage !== this.countdownStage) {
        this.countdownStage = stage;
        if (stage > 0) {
          LTT.UI.countdown(String(stage), false);
          if (LTT.Audio.ready) LTT.Audio.tick();
        } else if (stage === 0) {
          LTT.UI.countdown('GO', true);
          if (LTT.Audio.ready) LTT.Audio.chime();
        }
      }
      if (this.countdownT <= -0.65) this.beginRun();
      R.update(raw, this.bike, LTT.Input);
      R.draw();
      LTT.UI.updateHUD({
        time: 0,
        progress: 0,
        speed: 0,
        airTotal: 0,
        biggestAir: 0,
      });
      this.updateDebug();
      return;
    }

    if (this.state === 'paused') {
      R.update(raw, this.bike, LTT.Input);
      R.draw();
      LTT.Audio.updateRide(0, 0, false, false);
      this.updateDebug();
      return;
    }

    if (this.state === 'results') {
      R.update(raw, this.bike, LTT.Input);
      R.draw();
      LTT.Audio.updateRide(0, 0, false, false);
      this.updateDebug();
      return;
    }

    /* playing */
    if (LTT.Input.consumeReset()) {
      this.respawn(false);
    }

    const simDt = raw * TIME_SCALE;
    this.acc += simDt;
    let maxSteps = 6;
    const th = this.autoDrive ? 1 : LTT.Input.throttle;
    const br = this.autoDrive ? 0 : LTT.Input.brake;
    const ln = this.autoDrive ? 0 : LTT.Input.lean;
    while (this.acc >= STEP && maxSteps-- > 0 && this.state === 'playing') {
      this.acc -= STEP;
      this.stepSim(th, br, ln);
    }
    if (this.acc > STEP * 6) this.acc = STEP * 6;

    R.update(raw, this.bike, LTT.Input);
    R.draw();

    if (this.bike) {
      const bike = this.bike;
      const prog = (bike.x - this.track.startX) / (this.track.finishX - this.track.startX);
      LTT.UI.updateHUD({
        time: this.time,
        progress: prog,
        speed: Math.hypot(bike.vx, bike.vy),
        airTotal: bike.airTotal,
        biggestAir: bike.biggestAir,
        airborne: bike.airborne,
        airTime: bike.airTime,
      });
      LTT.UI.airLive(bike.airborne ? bike.airTime : 0);
      const app = document.getElementById('app');
      app.classList.toggle('riding-fast', Math.hypot(bike.vx, bike.vy) > 16);
      LTT.Audio.setIntensity(U.clamp01(Math.hypot(bike.vx, bike.vy) / 22 + (bike.airborne ? 0.2 : 0)));
      LTT.Audio.updateRide(
        Math.hypot(bike.vx, bike.vy),
        LTT.Input.throttle,
        bike.contactCount > 0,
        this.state === 'playing' && !bike.frozen
      );
    }
    this.updateDebug();
  };

  Game.updateDebug = function () {
    if (!this.debug) return;
    if (this.frameCount % 6 !== 0) return;
    const b = this.bike;
    let txt = 'fps ' + this.fps.toFixed(0) + '  state ' + this.state + '  level ' + this.levelIndex;
    if (b) {
      txt +=
        '\nx ' + b.x.toFixed(1) + '  kmh ' + (Math.hypot(b.vx, b.vy) * 3.6).toFixed(0) +
        '\nair ' + b.airTime.toFixed(2) + '  total ' + b.airTotal.toFixed(1) +
        '\ncontacts ' + b.contactCount + '  comp ' + b.wheels.map((w) => w.comp.toFixed(2)).join('/') +
        '\nangle ' + ((b.angle * 180) / Math.PI).toFixed(0) + '  grounded ' + (b.contactCount > 0) +
        '\nairborne ' + b.airborne + '  crash ' + b.crashed;
    }
    txt += '\ntime ' + LTT.util.fmtTime(this.time);
    LTT.UI.debug(txt);
  };

  LTT.Game = Game;
  window.addEventListener('DOMContentLoaded', () => Game.init());
})();
