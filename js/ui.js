/* Motor Magix — screens, HUD, saves */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = LTT.util;
  const KEY = 'ltt.progress.v1';

  const UI = {
    progress: {
      best: {},
      bestSplits: {},
      medals: {},
      completed: {},
      muted: false,
    },
    state: 'title',
    cards: [],
    _toastTimer: null,
    _airTimer: null,
    _ticksFor: -1,
    _lastTimer: '',
    _lastPct: -1,
    _lastSpeed: -1,
  };

  const $ = (id) => document.getElementById(id);

  UI.init = function (game) {
    this.game = game;
    this.loadProgress();
    this.el = {
      app: $('app'),
      hud: $('hud'),
      hudLevel: $('hud-level'),
      hudTime: $('hud-time'),
      hudDelta: $('hud-delta'),
      hudBest: $('hud-best'),
      progressFill: $('progress-fill'),
      progressBike: $('progress-bike'),
      progressPct: $('progress-pct'),
      progressTicks: $('progress-ticks'),
      speedNum: $('speed-num'),
      speedFill: $('speed-fill'),
      airTotal: $('air-total'),
      airBest: $('air-best'),
      countdown: $('countdown'),
      airPop: $('air-pop'),
      toast: $('toast'),
      levelCards: $('level-cards'),
      selectTotal: $('select-total'),
      titleBest: $('title-best'),
      soundBtn: $('btn-sound'),
      debug: $('debug'),
      screenTitle: $('screen-title'),
      screenSelect: $('screen-select'),
      screenPause: $('screen-pause'),
      screenResults: $('screen-results'),
      screenRotate: $('screen-rotate'),
    };

    this.buildCards();
    this.bind();
    this.setMuted(this.progress.muted, true);
    this.refreshMeta();
    this.setState('title');
    this.orientation();
    window.addEventListener('resize', () => this.orientation());
    window.addEventListener('orientationchange', () => this.orientation());
  };

  UI.loadProgress = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          this.progress.best = p.best || {};
          this.progress.bestSplits = p.bestSplits || {};
          this.progress.medals = p.medals || {};
          this.progress.completed = p.completed || {};
          this.progress.muted = !!p.muted;
        }
      }
    } catch (e) {
      /* private mode — run without saves */
    }
  };

  UI.saveProgress = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.progress));
    } catch (e) {}
  };

  UI.bestOverall = function () {
    let best = null;
    for (const k in this.progress.best) {
      const v = this.progress.best[k];
      if (v && (best == null || v < best)) best = v;
    }
    return best;
  };

  UI.isUnlocked = function (index) {
    if (index < 3) return true;
    return !!(this.progress.completed[0] && this.progress.completed[1] && this.progress.completed[2]);
  };

  UI.refreshMeta = function () {
    if (!this.el) return;
    const best = this.bestOverall();
    this.el.titleBest.textContent = U.fmtTime(best);
    let total = 0;
    let any = false;
    for (let i = 0; i < LTT.LEVELS.length; i++) {
      const b = this.progress.best[LTT.LEVELS[i].id];
      if (b) {
        total += b;
        any = true;
      }
    }
    this.el.selectTotal.textContent = any ? U.fmtShort(total) : '--:--';
    this.updateCards();
  };

  function medalColor(rank) {
    return rank === 3
      ? '#ffcf6e'
      : rank === 2
      ? '#cfd9e4'
      : rank === 1
      ? '#d08a55'
      : 'rgba(255,255,255,.08)';
  }

  UI.buildCards = function () {
    const wrap = this.el.levelCards;
    wrap.innerHTML = '';
    this.cards = [];
    LTT.LEVELS.forEach((lv, i) => {
      const pal = lv.palette;
      const card = document.createElement('button');
      card.className = 'card';
      card.setAttribute('data-level', i);
      const sky = 'linear-gradient(180deg, rgb(' + pal.sky[0].join(',') + ') 0%, rgb(' + pal.sky[1].join(',') + ') 52%, rgb(' + pal.sky[2].join(',') + ') 100%)';
      const land = 'rgb(' + pal.layers[2].join(',') + ')';
      const landBack = 'rgb(' + pal.layers[1].join(',') + ')';
      const glow = 'rgba(' + pal.sun.glow.join(',') + ',.45)';
      const sun = 'rgb(' + pal.sun.color.join(',') + ')';
      const haze = 'rgba(' + pal.horizon.join(',') + ',.55)';
      card.style.setProperty('--sky', sky);
      card.style.setProperty('--land', land);
      card.style.setProperty('--land-back', landBack);
      card.style.setProperty('--glow', glow);
      card.style.setProperty('--sun', sun);
      card.style.setProperty('--haze', haze);
      card.innerHTML =
        '<div class="card-art">' +
        '<div class="ridge back"></div><div class="sun"></div><div class="ridge"></div><div class="haze"></div>' +
        '</div>' +
        '<div class="card-body">' +
        '<div class="card-no">ROAD ' + lv.no + '</div>' +
        '<h3>' + lv.name + '</h3>' +
        '<div class="card-place">' + lv.place + '</div>' +
        '<div class="card-blurb">' + lv.blurb + '</div>' +
        '<div class="card-foot">' +
        '<span class="card-best" data-best>UNRIDDEN</span>' +
        '<span class="medal" data-medal></span>' +
        '</div></div>';
      card.addEventListener('click', () => {
        if (!this.isUnlocked(i)) {
          this.toast('Ride all three roads to unlock <b>' + lv.name + '</b>');
          return;
        }
        if (this.game) this.game.startRun(i);
      });
      card.addEventListener('mouseenter', () => {
        if (this.game) this.game.previewLevel(i);
      });
      wrap.appendChild(card);
      this.cards.push(card);
    });
  };

  UI.updateCards = function () {
    if (!this.cards.length) return;
    LTT.LEVELS.forEach((lv, i) => {
      const card = this.cards[i];
      if (!card) return;
      const b = this.progress.best[lv.id];
      const m = this.progress.medals[lv.id] || 0;
      const bestEl = card.querySelector('[data-best]');
      if (bestEl) bestEl.textContent = b ? U.fmtTime(b) : 'UNRIDDEN';
      const medEl = card.querySelector('[data-medal]');
      if (medEl) medEl.style.setProperty('--medal', medalColor(m));
      card.classList.toggle('locked', !this.isUnlocked(i));
    });
  };

  UI.setState = function (state) {
    this.state = state;
    const app = this.el.app;
    const states = ['title', 'select', 'countdown', 'playing', 'paused', 'results'];
    states.forEach((s) => app.classList.toggle('state-' + s, s === state));
    this.el.screenTitle.classList.toggle('active', state === 'title');
    this.el.screenSelect.classList.toggle('active', state === 'select');
    this.el.screenPause.classList.toggle('active', state === 'paused');
    this.el.screenResults.classList.toggle('active', state === 'results');
    if (state !== 'results') {
      /* keep the fade from blocking UI */
    }
    if (state === 'playing' || state === 'countdown') {
      this.el.screenPause.classList.remove('active');
      this.el.screenResults.classList.remove('active');
      this.el.screenTitle.classList.remove('active');
      this.el.screenSelect.classList.remove('active');
    }
    const touch = document.getElementById('touch');
    if (touch) touch.style.pointerEvents = state === 'playing' || state === 'countdown' ? 'auto' : 'none';
  };

  UI.bind = function () {
    $('btn-ride').addEventListener('click', () => {
      if (this.game) this.game.toSelect();
    });
    $('btn-back-title').addEventListener('click', () => {
      if (this.game) this.game.toTitle();
    });
    $('btn-resume').addEventListener('click', () => {
      if (this.game) this.game.resume();
    });
    $('btn-restart').addEventListener('click', () => {
      if (this.game) this.game.restart();
    });
    $('btn-quit').addEventListener('click', () => {
      if (this.game) this.game.toSelect();
    });
    $('btn-retry').addEventListener('click', () => {
      if (this.game) this.game.restart();
    });
    $('btn-next').addEventListener('click', () => {
      if (this.game) this.game.nextLevel();
    });
    $('btn-results-quit').addEventListener('click', () => {
      if (this.game) this.game.toSelect();
    });
    $('btn-pause').addEventListener('click', () => {
      if (this.game) this.game.pause();
    });
    this.el.soundBtn.addEventListener('click', () => {
      if (this.game) this.game.toggleMute();
    });
    $('btn-rotate-dismiss').addEventListener('click', () => {
      this.el.app.classList.remove('nudge');
    });
  };

  UI.orientation = function () {
    const portrait = window.innerHeight > window.innerWidth;
    this.el.app.classList.toggle('portrait', portrait);
  };

  UI.setMuted = function (muted, silent) {
    this.progress.muted = !!muted;
    const txt = muted ? 'SOUND OFF' : 'SOUND ON';
    if (this.el.soundBtn) this.el.soundBtn.textContent = txt;
    if (!silent) {
      this.saveProgress();
      if (this.game) this.game.applyMute();
    }
  };

  UI.setLevel = function (index) {
    const lv = LTT.LEVELS[index];
    this.el.hudLevel.textContent = lv.name;
    this.el.hudLevel.style.color = 'rgb(' + lv.palette.accent.join(',') + ')';
    const best = this.progress.best[lv.id];
    this.el.hudBest.textContent = U.fmtTime(best);
    this.el.hudTime.textContent = '00:00.00';
    this.el.hudDelta.textContent = '';
    this.el.hudDelta.className = 'hud-delta';
    this._lastTimer = '';
    this._lastPct = -1;
    this._lastSpeed = -1;
    this.el.airTotal.textContent = '0.0s';
    this.el.airBest.textContent = '0.0s';
    this.el.speedNum.textContent = '0';
    this.el.speedFill.style.width = '0%';
    this.el.progressFill.style.width = '0%';
    this.el.progressBike.style.left = '0%';
    this.el.progressPct.textContent = '0%';
    this.el.countdown.textContent = '';
    this.el.countdown.className = 'countdown';
    this.el.airPop.classList.remove('show');
    this.buildTicks(index);
  };

  UI.buildTicks = function (index) {
    if (this._ticksFor === index) {
      /* reset hit states */
      const nodes = this.el.progressTicks.querySelectorAll('i');
      nodes.forEach((n) => n.classList.remove('hit'));
      return;
    }
    this._ticksFor = index;
    const lv = LTT.LEVELS[index];
    const track = this.game && this.game.tracks ? this.game.tracks[index] : null;
    this.el.progressTicks.innerHTML = '';
    if (!track) return;
    track.checkpoints.forEach((cp) => {
      const i = document.createElement('i');
      i.style.left = U.clamp01((cp - track.startX) / (track.finishX - track.startX)) * 100 + '%';
      this.el.progressTicks.appendChild(i);
    });
  };

  UI.hitCheckpoint = function (index) {
    const nodes = this.el.progressTicks.querySelectorAll('i');
    if (nodes[index]) nodes[index].classList.add('hit');
  };

  UI.updateHUD = function (data) {
    const e = this.el;
    const timer = U.fmtTime(data.time);
    if (timer !== this._lastTimer) {
      e.hudTime.textContent = timer;
      this._lastTimer = timer;
    }
    const pct = Math.round(U.clamp01(data.progress) * 100);
    if (pct !== this._lastPct) {
      e.progressFill.style.width = pct + '%';
      e.progressBike.style.left = pct + '%';
      e.progressPct.textContent = pct + '%';
      this._lastPct = pct;
    }
    const kmh = Math.round(data.speed * 3.6);
    if (kmh !== this._lastSpeed) {
      e.speedNum.textContent = String(kmh);
      e.speedFill.style.width = U.clamp01(kmh / 130) * 100 + '%';
      this._lastSpeed = kmh;
    }
    e.airTotal.textContent = data.airTotal.toFixed(1) + 's';
    e.airBest.textContent = data.biggestAir.toFixed(1) + 's';
  };

  UI.airLive = function (airTime) {
    const e = this.el.airPop;
    if (airTime > 0.5) {
      e.innerHTML = 'AIR<span class="sub">' + airTime.toFixed(2) + 's</span>';
      e.classList.add('live');
      e.style.opacity = '';
    } else if (e.classList.contains('live')) {
      e.classList.remove('live');
    }
  };

  UI.airPop = function (seconds) {
    if (seconds < 0.55) return;
    const e = this.el.airPop;
    e.classList.remove('live');
    e.innerHTML =
      (seconds > 2 ? 'MASSIVE AIR' : seconds > 1.3 ? 'BIG AIR' : 'AIR') +
      '<span class="sub">' +
      seconds.toFixed(2) +
      's</span>';
    e.classList.remove('show');
    void e.offsetWidth;
    e.classList.add('show');
    e.style.opacity = '';
    if (this._airTimer) clearTimeout(this._airTimer);
    this._airTimer = setTimeout(() => {
      e.classList.remove('show');
    }, 1700);
  };

  UI.delta = function (d) {
    const el = this.el.hudDelta;
    if (d == null) {
      el.textContent = '';
      el.className = 'hud-delta';
      return;
    }
    el.textContent = (d < 0 ? 'FASTER ' : 'SLOWER ') + U.fmtDelta(d);
    el.className = 'hud-delta ' + (d < 0 ? 'good' : 'bad');
  };

  UI.toast = function (html, ms) {
    const el = this.el.toast;
    el.innerHTML = html;
    el.classList.add('show');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2300);
  };

  UI.countdown = function (text, go) {
    const el = this.el.countdown;
    el.textContent = text;
    el.classList.remove('tick', 'go');
    void el.offsetWidth;
    el.classList.add('tick');
    if (go) el.classList.add('go');
  };

  UI.clearCountdown = function () {
    this.el.countdown.className = 'countdown';
    this.el.countdown.textContent = '';
  };

  UI.pauseInfo = function (time, levelIndex) {
    $('pause-time').textContent = U.fmtTime(time);
    $('pause-level').textContent = LTT.LEVELS[levelIndex].name;
  };

  UI.showResults = function (data) {
    const lv = LTT.LEVELS[data.levelIndex];
    const medal = data.medal; // 0..3
    const medalNames = ['FINISHED', 'BRONZE', 'SILVER', 'GOLD'];
    const wrap = this.el.screenResults.querySelector('.results-medal');
    wrap.className = 'results-medal ' + ['none', 'bronze', 'silver', 'gold'][medal];
    wrap.querySelector('.medal-label').textContent = medalNames[medal];
    $('results-kicker').textContent = data.isPB ? 'NEW PERSONAL BEST' : 'RIDE COMPLETE';
    $('results-title').textContent = lv.name;
    $('results-time').textContent = U.fmtTime(data.time);
    const note = $('results-note');
    if (data.isPB) {
      note.textContent = data.previousBest
        ? 'PERSONAL BEST BY ' + U.fmtDelta(data.previousBest - data.time).replace(/^[+-]/, '')
        : 'THE FIRST OF MANY';
      note.className = 'results-note';
    } else {
      note.textContent = 'BEST ' + U.fmtTime(data.best) + ' · ' + U.fmtDelta(data.time - data.best);
      note.className = 'results-note dim';
    }
    $('res-best').textContent = U.fmtTime(data.best);
    $('res-air').textContent = data.airTotal.toFixed(1) + 's';
    $('res-bigair').textContent = data.biggestAir.toFixed(1) + 's';
    $('res-speed').textContent = Math.round(data.topSpeed * 3.6) + ' km/h';

    const next = data.levelIndex + 1;
    const hasNext = next < LTT.LEVELS.length && this.isUnlocked(next);
    const btn = $('btn-next');
    btn.style.display = hasNext ? '' : 'none';
    if (hasNext) btn.textContent = 'NEXT · ' + LTT.LEVELS[next].name;
    this.setState('results');
  };

  UI.recordResult = function (levelIndex, time, splits, stats) {
    const lv = LTT.LEVELS[levelIndex];
    const prev = this.progress.best[lv.id] || null;
    const isPB = prev == null || time < prev;
    if (isPB) {
      this.progress.best[lv.id] = time;
      this.progress.bestSplits[lv.id] = splits.slice();
    }
    this.progress.completed[levelIndex] = true;
    let rank = 0;
    if (time <= lv.targets.gold) rank = 3;
    else if (time <= lv.targets.silver) rank = 2;
    else if (time <= lv.targets.bronze) rank = 1;
    if (rank > (this.progress.medals[lv.id] || 0)) this.progress.medals[lv.id] = rank;
    this.saveProgress();
    this.refreshMeta();
    return {
      isPB: isPB,
      previousBest: prev,
      best: this.progress.best[lv.id],
      medal: rank || this.progress.medals[lv.id] || 0,
      splits: splits,
    };
  };

  UI.splitDelta = function (levelIndex, cpIndex, time) {
    const lv = LTT.LEVELS[levelIndex];
    const bestS = this.progress.bestSplits[lv.id];
    if (!bestS || bestS[cpIndex] == null) return null;
    return time - bestS[cpIndex];
  };

  UI.debug = function (txt) {
    if (this.el.debug) this.el.debug.textContent = txt;
  };

  LTT.UI = UI;
})();
