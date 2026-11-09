// RealityMargin · Japan sim page: one worker runs a block of wars and sends the counts back. Each war's dice depend only on the seed and its number, so the order of the blocks can't change the answer.
// The builder writes the model's fingerprinted address in place of MODEL_URL, so a saved old copy of the page can't mix with a new model.
importScripts('model/sim_web.js?v=d81f811301');
const makeH = s => s.q ? realUntil(s.q, s.x) : { ...s.x };
onmessage = e => {
  const { id, P, spec, econ, seed, from, to } = e.data, c = {}, ev = {}, yr = {}, was = {}, bump = (o, k) => { o[k] = (o[k] || 0) + 1; }; let fought = 0, dead = 0, ends = 0;
  for (const k in econ || {}) { was[k] = ECONOMY[k]; ECONOMY[k] = econ[k]; }   /* a what-if that changes the economy (the film's "one factory in eight") */
  try {
    const H = makeH(spec);
    for (let i = from; i < to; i++) {
      const r = war(P, rng(warSeed(seed, i)), H);
      bump(c, r.outcome); for (const k of r.ev) bump(ev, k); bump(yr, Math.floor(r.y));
      if (r.outcome !== O_NOWAR) { fought++; dead += r.dead; ends += r.y; }
    }
  } finally { Object.assign(ECONOMY, was); }
  postMessage({ id, n: to - from, c, ev, yr, fought, dead, ends });
};
