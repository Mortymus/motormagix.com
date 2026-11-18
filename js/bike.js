/* LANG TUNG TING — rigid chassis + spring/damper suspension + tires */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const U = LTT.util;

  const RAD = Math.PI / 180;

  class Bike {
    constructor(track) {
      this.track = track;

      /* --- chassis --- */
      this.mass = 205;
      this.inertia = 96;
      this.gravity = 9.81;
      this.dragCoef = 0.40;

      /* --- suspension --- */
      this.restLen = 0.34;
      this.travel = 0.215;
      this.wheelRadius = 0.33;
      this.springK = 14200;
      this.dampComp = 1320;
      this.dampReb = 980;
      this.bumpK = 90000;

      this.anchors = [
        { x: -0.66, y: -0.16, ax: 0, ay: -1, rear: true },
        { x: 0.68, y: -0.16, ax: Math.sin(0.30), ay: -Math.cos(0.30), rear: false },
      ];

      this.wheels = [
        { comp: 0.07, contact: null, spin: 0, spinVel: 0, load: 0, slip: 0 },
        { comp: 0.07, contact: null, spin: 0, spinVel: 0, load: 0, slip: 0 },
      ];

      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.angVel = 0;
      this.prevX = 0;
      this.prevY = 0;
      this.prevAngle = 0;

      this.contactCount = 0;
      this.airborne = false;
      this.airTime = 0;
      this.lastAir = 0;
      this.airTotal = 0;
      this.biggestAir = 0;
      this.justLanded = false;
      this.landImpact = 0;
      this.topSpeed = 0;
      this.distance = 0;
      this.crashed = false;
      this.crashTimer = 0;
      this.bodyTouch = false;
      this.slipping = false;
      this.lean = 0;
      this.throttle = 0;
      this.frozen = false;
    }

    resetAt(x) {
      const tr = this.track;
      x = U.clamp(x, 10, tr.length - 10);
      const h = tr.heightAt(x);
      const ang = tr.avgAngleAt(x);
      this.x = x;
      this.y = h + 0.80;
      this.vx = 0;
      this.vy = 0;
      this.angle = ang;
      this.angVel = 0;
      this.prevX = this.x;
      this.prevY = this.y;
      this.prevAngle = ang;
      this.contactCount = 0;
      this.airborne = false;
      this.airTime = 0;
      this.crashed = false;
      this.crashTimer = 0;
      this.airTotal = 0;
      this.biggestAir = 0;
      this.lastAir = 0;
      this.topSpeed = 0;
      this.distance = 0;
      this.justLanded = false;
      this.landImpact = 0;
      this.throttle = 0;
      this.lean = 0;
      this.frozen = false;
      this.wheels.forEach((w) => {
        w.comp = 0.07;
        w.contact = null;
        w.load = 0;
        w.slip = 0;
        w.spin = 0;
        w.spinVel = 0;
      });
      this.settle(1.2);
    }

    settle(seconds) {
      const dt = 1 / 200;
      const n = Math.round(seconds / dt);
      const zero = { throttle: 0, brake: 0, lean: 0 };
      for (let i = 0; i < n; i++) this.step(dt, zero);
    }

    localToWorld(lx, ly) {
      const c = Math.cos(this.angle);
      const s = Math.sin(this.angle);
      return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c };
    }

    localDirToWorld(dx, dy) {
      const c = Math.cos(this.angle);
      const s = Math.sin(this.angle);
      return { x: dx * c - dy * s, y: dx * s + dy * c };
    }

    pointVel(rx, ry) {
      return { x: this.vx - this.angVel * ry, y: this.vy + this.angVel * rx };
    }

    update(dt, input) {
      this.prevX = this.x;
      this.prevY = this.y;
      this.prevAngle = this.angle;
      this.justLanded = false;
      if (this.frozen) return;

      const steps = 3;
      const h = dt / steps;
      for (let i = 0; i < steps; i++) this.step(h, input);

      const speed = Math.hypot(this.vx, this.vy);
      if (speed > this.topSpeed) this.topSpeed = speed;
      this.distance = this.x;

      if (this.airborne && !this.crashed) {
        this.airTime += dt;
      }
      if (this.crashed) {
        this.crashTimer += dt;
      }
      if (this.contactCount === 0) {
        if (!this.airborne) {
          this.airborne = true;
          this.airTime = 0;
        }
      } else if (this.airborne) {
        this.airborne = false;
        if (this.airTime > 0.25) {
          this.lastAir = this.airTime;
          this.airTotal += this.airTime;
          if (this.airTime > this.biggestAir) this.biggestAir = this.airTime;
          this.justLanded = true;
        }
        this.airTime = 0;
      }
    }

    step(dt, input) {
      const tr = this.track;
      const M = this.mass;
      let fx = 0;
      let fy = -M * this.gravity;
      let torque = 0;

      const throttle = input.throttle || 0;
      const brake = input.brake || 0;
      const lean = input.lean || 0;
      this.throttle = throttle;
      this.lean = lean;

      /* ---------------- wheels ---------------- */
      this.contactCount = 0;
      this.slipping = false;
      let airGap = 0;
      let lowest = Infinity;

      for (let i = 0; i < 2; i++) {
        const w = this.wheels[i];
        const a = this.anchors[i];
        const anchor = this.localToWorld(a.x, a.y);
        const dir = this.localDirToWorld(a.ax, a.ay);
        const ground = this.findGround(anchor.x, anchor.y, dir.x, dir.y);

        if (!ground) {
          w.contact = null;
          w.load = 0;
          w.slip = 0;
          w.comp = U.damp(w.comp, 0, 16, dt);
          /* wheels slowly spin up/down in the air */
          const targetSpin = i === 0 ? throttle * 26 : w.spinVel * 0.99;
          w.spinVel = U.damp(w.spinVel, targetSpin, i === 0 ? 2.4 : 0.7, dt);
          w.spin += w.spinVel * dt;
          const wc = {
            x: anchor.x + dir.x * this.restLen,
            y: anchor.y + dir.y * this.restLen,
          };
          w.world = wc;
          lowest = Math.min(lowest, wc.y - tr.heightAt(wc.x) - this.wheelRadius);
          continue;
        }

        this.contactCount++;
        const t = ground.t;
        let comp = this.restLen - t;
        const wheelX = anchor.x + dir.x * t;
        const wheelY = anchor.y + dir.y * t;
        w.world = { x: wheelX, y: wheelY };

        if (comp <= 0.001) {
          w.contact = null;
          w.load = 0;
          w.comp = 0;
          continue;
        }

        comp = U.clamp(comp, 0, this.travel + 0.05);
        w.comp = comp;

        const rx = wheelX - this.x;
        const ry = wheelY - this.y;
        const pv = this.pointVel(rx, ry);
        const compVel = U.clamp(pv.x * dir.x + pv.y * dir.y, -9, 9);

        let spring = this.springK * comp;
        if (comp > this.travel * 0.9) {
          const over = comp - this.travel * 0.9;
          spring += this.bumpK * over * over;
        }
        const damp = compVel > 0 ? this.dampComp : this.dampReb;
        spring += damp * compVel;
        spring = U.clamp(spring, 0, 42000);

        const sfx = -dir.x * spring;
        const sfy = -dir.y * spring;
        fx += sfx;
        fy += sfy;
        torque += rx * sfy - ry * sfx;

        /* tire */
        const n = tr.normalAt(wheelX);
        const tan = tr.tangentAt(wheelX);
        const cx = wheelX - n.x * this.wheelRadius;
        const cy = wheelY - n.y * this.wheelRadius;
        const crx = cx - this.x;
        const cry = cy - this.y;
        const cpv = this.pointVel(crx, cry);
        const vT = cpv.x * tan.x + cpv.y * tan.y;
        w.load = spring * Math.max(0.2, -(dir.x * n.x + dir.y * n.y));
        const grip = w.load * 1.22;

        let demand = 0;
        if (a.rear) {
          demand += throttle * this.engineForce(Math.max(vT, 0));
        }
        if (brake > 0.02) {
          const bf = brake * 1750;
          if (Math.abs(vT) > 0.8) demand += -Math.sign(vT) * bf;
          else demand += -vT * bf;
        }
        /* rolling resistance / static hold */
        demand += -vT * 3.2;
        if (Math.abs(vT) < 3 && throttle < 0.05 && brake < 0.05) {
          demand += -vT * 95;
        }

        const demandMag = Math.abs(demand);
        if (demandMag > grip) {
          w.slip = U.clamp(demandMag / Math.max(grip, 1) - 1, 0, 2);
          this.slipping = true;
        } else {
          w.slip = U.damp(w.slip, 0, 8, dt);
        }
        const applied = U.clamp(demand, -grip, grip);

        fx += tan.x * applied;
        fy += tan.y * applied;
        torque += crx * (tan.y * applied) - cry * (tan.x * applied);

        /* spin for the renderer */
        const targetSpin = vT / this.wheelRadius + (w.slip > 0.1 ? Math.sign(applied) * 9 * w.slip : 0);
        w.spinVel = U.damp(w.spinVel, targetSpin, 14, dt);
        w.spin += w.spinVel * dt;

        w.contact = { x: cx, y: cy, nx: n.x, ny: n.y, tx: tan.x, ty: tan.y, vT: vT };
        lowest = Math.min(lowest, cy - tr.heightAt(cx));
      }

      airGap = Math.min(lowest === Infinity ? 6 : lowest, 6);

      /* ---------------- rider inputs ---------------- */
      const grounded = this.contactCount > 0;
      if (grounded) {
        torque += lean * 220;
        /* rider balance: the bike settles toward the slope instead of looping */
        const gAng = tr.angleAt(this.x);
        const diff = U.angleDelta(gAng, this.angle);
        if (Math.abs(diff) < 1.35) {
          const frontDown = this.wheels[1].contact ? 1 : 1.9;
          torque += diff * 1000 * frontDown - this.angVel * 155;
        }
        this.angVel *= Math.exp(-0.5 * dt);
      } else {
        torque += lean * 470;
        const velAngle = U.clamp(
          Math.atan2(this.vy, Math.max(6, Math.abs(this.vx))),
          -1.15,
          1.15
        );
        if (Math.abs(lean) < 0.25) {
          const d = U.angleDelta(velAngle, this.angle);
          torque += d * 620 - this.angVel * 135;
        } else {
          this.angVel *= Math.exp(-0.12 * dt);
        }
        /* landing assist: if close to the ground and roughly level, ease toward the surface */
        if (airGap < 3.4 && Math.abs(this.angVel) < 5.5) {
          const target = tr.angleAt(
            this.x + this.vx * Math.max(0.05, airGap / Math.max(4, -this.vy + 0.1))
          );
          let diff = U.angleDelta(target, this.angle);
          if (Math.abs(diff) < 1.0) {
            torque += diff * 300 - this.angVel * 60;
          }
        }
      }
      this.angVel = U.clamp(this.angVel, -6.2, 6.2);

      /* aero drag */
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 0.01) {
        const drag = this.dragCoef * sp;
        fx += -this.vx * drag;
        fy += -this.vy * drag;
      }

      /* ---------------- integrate ---------------- */
      this.vx += (fx / M) * dt;
      this.vy += (fy / M) * dt;
      this.angVel += (torque / this.inertia) * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.angle += this.angVel * dt;

      /* stand still when parked */
      if (grounded && sp < 1.2 && throttle < 0.05) {
        const k2 = Math.exp(-9 * dt);
        this.vx *= k2;
        this.vy *= k2;
      }

      this.checkBody(dt);
    }

    engineForce(v) {
      return (
        1350 * Math.max(0, 1 - v / 35) +
        205 * Math.max(0, 1 - v / 38)
      );
    }

    findGround(ax, ay, dx, dy) {
      const tr = this.track;
      const steps = 7;
      let prevT = 0;
      let prevClear = null;
      for (let i = 0; i <= steps; i++) {
        const t = (this.restLen * i) / steps;
        const px = ax + dx * t;
        const py = ay + dy * t;
        const n = tr.normalAt(px);
        const rr = this.wheelRadius / Math.max(0.42, n.y);
        const clear = py - tr.heightAt(px) - rr;
        if (clear <= 0) {
          let lo = prevT;
          let hi = t;
          for (let k = 0; k < 5; k++) {
            const mid = (lo + hi) * 0.5;
            const mx = ax + dx * mid;
            const my = ay + dy * mid;
            const mn = tr.normalAt(mx);
            const mr = this.wheelRadius / Math.max(0.42, mn.y);
            if (my - tr.heightAt(mx) - mr <= 0) hi = mid;
            else lo = mid;
          }
          const tt = (lo + hi) * 0.5;
          return { t: tt, x: ax + dx * tt, y: ay + dy * tt };
        }
        prevT = t;
        prevClear = clear;
      }
      return null;
    }

    checkBody(dt) {
      const tr = this.track;
      const pts = [
        { x: 0.1, y: -0.48 },
        { x: 0.58, y: -0.24 },
        { x: -0.52, y: -0.30 },
        { x: 0.8, y: 0.06 },
      ];
      for (const p of pts) {
        const wp = this.localToWorld(p.x, p.y);
        const ground = tr.heightAt(wp.x);
        if (wp.y < ground + 0.04) {
          /* never snag on the sheer faces of a gap — those are meant to be flown over */
          if (Math.abs(tr.slopeAt(wp.x)) > 1.25) continue;
          this.bodyTouch = true;
          const pen = ground + 0.04 - wp.y;
          this.y += pen * 0.9;
          const n = tr.normalAt(wp.x);
          const vn = this.vx * n.x + this.vy * n.y;
          if (vn < 0) {
            this.vx -= vn * n.x * 0.7;
            this.vy -= vn * n.y * 0.7;
          }
          this.angVel *= 0.7;
          break;
        }
      }
      if (this.y < tr.heightAt(this.x) + 0.08) {
        this.crashed = true;
      }
      /* a loop or a bars-first landing is a wipeout; everything else is a scrape */
      if (!this.crashed && this.contactCount > 0) {
        if (Math.cos(this.angle) < -0.28) {
          this.angVel = 0;
          this.crashed = true;
        }
      }
    }
  }

  LTT.Bike = Bike;
})();
