/* LANG TUNG TING â€” four roads, four skies */
(function () {
  'use strict';
  const LTT = (window.LTT = window.LTT || {});
  const M = LTT.trackTools;

  const LEVELS = [
    {
      id: 'urban',
      no: '01',
      name: 'NEON OVERPASS',
      place: 'DUSK DISTRICT',
      blurb: 'Dead freeways, sodium haze and a skyline burning out behind you.',
      length: 2500,
      seed: 1207,
      startY: 46,
      trend: 0.002,
      sines: [
        { a: 2.4, w: 220, p: 0.4 },
        { a: 1.15, w: 96, p: 2.4 },
        { a: 0.55, w: 43, p: 4.1 },
      ],
      plan: {
        intro: 155,
        outro: 175,
        flow: [58, 96],
        whoopsChance: 0.3,
        gaps: [
          { rampLen: 10, h: 2.1, width: 12, depth: 7.5, landLen: 19, landDrop: 2.4 },
          { rampLen: 12.5, h: 3.0, width: 17, depth: 9.5, landLen: 23, landDrop: 3.2 },
          { rampLen: 9.5, h: 1.9, width: 10.5, depth: 7, landLen: 16, landDrop: 1.8 },
          { rampLen: 13, h: 3.4, width: 20, depth: 10.5, landLen: 25, landDrop: 4 },
        ],
      },
      targets: { gold: 0, silver: 0, bronze: 0, speeds: [14.8, 12.8, 10.9] },
      palette: {
        sky: [[18, 12, 38], [94, 42, 88], [245, 132, 88]],
        horizon: [255, 207, 145],
        sun: { x: 0.7, y: 0.24, r: 0.042, color: [255, 225, 170], glow: [255, 148, 82] },
        cloud: [255, 156, 118],
        fog: [118, 75, 96],
        layers: [[62, 44, 80], [40, 33, 62], [22, 20, 38]],
        ground: {
          top: [122, 99, 101],
          face: [58, 44, 54],
          deep: [20, 16, 27],
          dirt: [98, 74, 70],
          rim: [255, 200, 146],
          strata: [96, 70, 74],
        },
        accent: [255, 180, 87],
        rimLight: [255, 214, 165],
        particle: 'dust',
        silhouette: 'city',
        fogAmount: 0.65,
      },
      music: {
        root: 45, tempo: 112, flavour: 'synthwave',
        prog: [
          { r: 0, t: 'min' }, { r: -4, t: 'maj' }, { r: 3, t: 'maj' }, { r: -2, t: 'maj' },
        ],
      },
    },

    {
      id: 'country',
      no: '02',
      name: 'GOLDEN MEADOWS',
      place: 'THE LONG VALLEY',
      blurb: 'Warm grass, long shadows and fences running out to the horizon.',
      length: 2700,
      seed: 3311,
      startY: 52,
      trend: -0.004,
      sines: [
        { a: 3.1, w: 260, p: 1.1 },
        { a: 1.5, w: 118, p: 3.4 },
        { a: 0.5, w: 51, p: 0.2 },
      ],
      plan: {
        intro: 160,
        outro: 190,
        flow: [74, 122],
        whoopsChance: 0.22,
        gaps: [
          { rampLen: 11, h: 2.3, width: 14, depth: 7, landLen: 22, landDrop: 2.2 },
          { rampLen: 14, h: 3.2, width: 19, depth: 9, landLen: 28, landDrop: 3 },
          { rampLen: 12, h: 2.6, width: 16, depth: 8, landLen: 24, landDrop: 2.6 },
          { rampLen: 15, h: 3.6, width: 23, depth: 10.5, landLen: 30, landDrop: 3.6 },
        ],
      },
      targets: { gold: 0, silver: 0, bronze: 0, speeds: [15.4, 13.2, 11.3] },
      palette: {
        sky: [[70, 122, 158], [176, 208, 194], [255, 214, 152]],
        horizon: [255, 235, 183],
        sun: { x: 0.77, y: 0.3, r: 0.038, color: [255, 245, 205], glow: [255, 190, 110] },
        cloud: [255, 228, 184],
        fog: [214, 214, 178],
        layers: [[170, 166, 108], [132, 126, 76], [84, 80, 46]],
        ground: {
          top: [166, 148, 76],
          face: [105, 87, 50],
          deep: [42, 35, 21],
          dirt: [138, 106, 62],
          rim: [255, 240, 189],
          strata: [120, 94, 54],
        },
        accent: [255, 207, 110],
        rimLight: [255, 244, 196],
        particle: 'pollen',
        silhouette: 'hills',
        fogAmount: 0.5,
      },
      music: {
        root: 50, tempo: 102, flavour: 'funk',
        prog: [
          { r: 0, t: 'maj7' }, { r: -3, t: 'min7' }, { r: 5, t: 'maj7' }, { r: 7, t: 'dom7' },
        ],
      },
    },

    {
      id: 'jungle',
      no: '03',
      name: 'MONSOON RUINS',
      place: 'TIERRA VERDE',
      blurb: 'Wet stone, giant leaves and light falling through the canopy.',
      length: 2800,
      seed: 8821,
      startY: 40,
      trend: 0.001,
      sines: [
        { a: 2.7, w: 205, p: 2.2 },
        { a: 1.75, w: 88, p: 5.1 },
        { a: 0.6, w: 39, p: 1.7 },
      ],
      plan: {
        intro: 165,
        outro: 195,
        flow: [52, 92],
        whoopsChance: 0.52,
        gaps: [
          { rampLen: 10, h: 2.4, width: 12, depth: 9, landLen: 18, landDrop: 2.6 },
          { rampLen: 13, h: 3.3, width: 19, depth: 12, landLen: 23, landDrop: 3.6 },
          { rampLen: 9, h: 2.0, width: 10, depth: 8, landLen: 15, landDrop: 2 },
          { rampLen: 14.5, h: 3.7, width: 22, depth: 13, landLen: 26, landDrop: 4.2 },
        ],
      },
      targets: { gold: 0, silver: 0, bronze: 0, speeds: [14.4, 12.2, 10.4] },
      palette: {
        sky: [[12, 42, 43], [27, 89, 76], [171, 212, 160]],
        horizon: [222, 238, 189],
        sun: { x: 0.63, y: 0.19, r: 0.04, color: [246, 255, 214], glow: [150, 255, 196] },
        cloud: [201, 230, 196],
        fog: [126, 166, 140],
        layers: [[48, 91, 76], [27, 62, 52], [12, 32, 27]],
        ground: {
          top: [63, 106, 57],
          face: [57, 56, 30],
          deep: [14, 20, 12],
          dirt: [84, 68, 38],
          rim: [214, 255, 205],
          strata: [73, 60, 34],
        },
        accent: [126, 240, 210],
        rimLight: [213, 255, 224],
        particle: 'fireflies',
        silhouette: 'jungle',
        fogAmount: 0.72,
      },
      music: {
        root: 54, tempo: 96, flavour: 'jungle',
        prog: [
          { r: 0, t: 'min' }, { r: -4, t: 'maj7' }, { r: 3, t: 'maj' }, { r: -2, t: 'min7' },
        ],
      },
    },

    {
      id: 'canyon',
      no: '04',
      name: 'CANYON MIRAGE',
      place: 'RED ROCK PASS',
      blurb: 'A locked road beyond the valley. Mesas, arches and one long fall of light.',
      length: 2900,
      seed: 5540,
      startY: 58,
      trend: -0.005,
      sines: [
        { a: 3.4, w: 280, p: 0.7 },
        { a: 1.5, w: 104, p: 4.2 },
        { a: 0.55, w: 46, p: 2.9 },
      ],
      plan: {
        intro: 170,
        outro: 205,
        flow: [82, 132],
        whoopsChance: 0.2,
        gaps: [
          { rampLen: 12, h: 2.7, width: 16, depth: 10, landLen: 24, landDrop: 3 },
          { rampLen: 16, h: 4.0, width: 24, depth: 14, landLen: 34, landDrop: 4.5 },
          { rampLen: 13, h: 3.1, width: 18, depth: 11, landLen: 26, landDrop: 3.4 },
          { rampLen: 17, h: 4.3, width: 27, depth: 15, landLen: 36, landDrop: 5 },
        ],
      },
      targets: { gold: 0, silver: 0, bronze: 0, speeds: [15.8, 13.4, 11] },
      palette: {
        sky: [[41, 22, 55], [138, 63, 82], [255, 169, 110]],
        horizon: [255, 217, 160],
        sun: { x: 0.74, y: 0.28, r: 0.045, color: [255, 232, 180], glow: [255, 136, 77] },
        cloud: [255, 164, 116],
        fog: [178, 110, 96],
        layers: [[122, 63, 74], [90, 47, 56], [42, 22, 28]],
        ground: {
          top: [180, 100, 63],
          face: [110, 52, 39],
          deep: [44, 20, 15],
          dirt: [142, 78, 50],
          rim: [255, 210, 160],
          strata: [198, 126, 82],
        },
        accent: [255, 180, 87],
        rimLight: [255, 210, 160],
        particle: 'heat',
        silhouette: 'mesa',
        fogAmount: 0.55,
      },
      music: {
        root: 40, tempo: 104, flavour: 'cinematic',
        prog: [
          { r: 0, t: 'min' }, { r: -4, t: 'maj7' }, { r: 3, t: 'maj' }, { r: -3, t: 'min7' },
        ],
      },
    },
  ];

  LEVELS.forEach((lv) => {
    const [g, s, b] = lv.targets.speeds;
    lv.targets.gold = lv.length / g;
    lv.targets.silver = lv.length / s;
    lv.targets.bronze = lv.length / b;
  });

  function createTrack(index) {
    const lv = LEVELS[index];
    const plan = M.makePlan(lv.plan, lv.seed, lv.length);
    const track = new LTT.Track({
      length: lv.length,
      startY: lv.startY,
      trend: lv.trend,
      sines: lv.sines,
      features: plan.features,
      startX: 26,
      finishX: lv.length - 46,
    });

    /* checkpoints snap to the safe zones between features */
    const safe = plan.safe.filter((x) => x > 120 && x < lv.length - 90).sort((a, b) => a - b);
    const checkpoints = [];
    for (let i = 1; i <= 4; i++) {
      const target = (lv.length * i) / 5;
      let best = target;
      let bd = Infinity;
      for (const s of safe) {
        const d = Math.abs(s - target);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (!checkpoints.length || best - checkpoints[checkpoints.length - 1] > 80) {
        checkpoints.push(best);
      }
    }
    track.checkpoints = checkpoints;
    track.level = lv;
    return track;
  }

  LTT.LEVELS = LEVELS;
  LTT.createTrack = createTrack;
})();


