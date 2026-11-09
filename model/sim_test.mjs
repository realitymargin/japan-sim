// Tests for the Pacific model (v5).   node sim_test.mjs      Every test prints PASS or FAIL with the number it checked.
// v4 adds the tests code review r2 asked for: each would have caught a bug that got through the earlier suites.
import fs from 'node:fs';
import { war, batch, rng, warSeed, oddsFor, BATTLES, OUTCOMES, O_WIN, O_SURR, O_INV, O_NOWAR, O_EMPIRE, O_NORTH, ECONOMY, MECH, yearOf } from './sim.mjs';
import { realUntil } from './real_path.mjs';
let fails = 0; const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!cond) fails++; };
const P = oddsFor('mid'), N = 20000, pct = x => (100 * x).toFixed(2) + '%', W = { strikeNorth: false, backDown: false, modusVivendi: false, southOnly: false, philNoPearl: false };
const SRC = fs.readFileSync(new URL('./sim.mjs', import.meta.url), 'utf8');

// 1. Determinism and common random numbers
{ const a = war(P, rng(warSeed(1, 7))), b = war(P, rng(warSeed(1, 7))); ok('same seed, same war', JSON.stringify(a.path) === JSON.stringify(b.path) && a.outcome === b.outcome); }
{ let same = 0, n = 0; for (let i = 0; i < 600; i++) { const a = war(P, rng(warSeed(2, i)), W); if (!a.btl.midway || a.btl.midway === 'none') continue; const b = war(P, rng(warSeed(2, i)), { ...W, win_midway: a.btl.midway === 'J' ? 'U' : 'J' }); n++; const before = r => r.path.filter(l => +l.slice(0, 4) < 1942).join('|'); if (before(a) === before(b) && a.btl.coral === b.btl.coral && a.rolls.pilotPipeline === b.rolls.pilotPipeline) same++; } ok('flipping Midway leaves everything before it unchanged (1941, the Coral Sea, the spring choices)', n > 50 && same === n, same + '/' + n); }
{ let same = 0, n = 0; for (let i = 0; i < 600; i++) { const a = war(P, rng(warSeed(3, i)), W); if (a.rolls.convoyEarly !== false) continue; const b = war(P, rng(warSeed(3, i)), { ...W, convoyEarly: false }); n++; if (a.outcome === b.outcome && a.y === b.y && JSON.stringify(a.path) === JSON.stringify(b.path)) same++; } ok('pinning a decision to what already happened changes nothing', n > 100 && same === n, same + '/' + n); }
{ const ONE = ['codebreak', 'codebreak2', 'yorktownReady', 'scoutLate', 'splitForces', 'usFleetSails', 'hawaiiHold']; let kept = 0, n = 0;   // code review r2 M1: one-shots keep their dice when an earlier event moves their quarter
  for (let i = 0; i < 2000; i++) { const a = war(P, rng(warSeed(30, i)), W); if (!('conquestFast' in a.rolls)) continue; const b = war(P, rng(warSeed(30, i)), { ...W, conquestFast: !a.rolls.conquestFast }); for (const k of ONE) if (k in a.rolls && k in b.rolls) { n++; if (a.rolls[k] === b.rolls[k]) kept++; } }
  ok('one-off dice survive a change in when they are rolled (conquestFast flipped)', n > 500 && kept / n > 0.97, kept + '/' + n); }

// 2. Real history
{ const b = batch('mid', N, 3, realUntil(99)); ok('real history replayed in full: Japan surrenders, in 1945, every time', (b.outcomes[O_SURR] || 0) === N && (b.endYear[1945] || 0) === N, JSON.stringify(b.outcomes)); }
{ const b = batch('mid', N, 3, realUntil(11)); ok('real history to the Marshalls, then free: Japan wins in under 0.1% of wars', b.win / N < 0.001, pct(b.win / N)); }
{ const f = []; for (let i = 0; i < 6000; i++) { const r = war(P, rng(warSeed(31, i)), W); if (r.btl.pearl && r.init1) f.push(r.init1); } f.sort((a, b) => a - b); ok('"run wild for six months": the first US offensive after Pearl Harbor at the median is Jul-Sep 1942', f[f.length >> 1] === 1942.5, f[f.length >> 1]); }

// 3. Sizes that must hold
const free = batch('mid', 100000, 6), e = free.events, n6 = 100000;
ok('America out-builds Japan: by mid-1944 the US has more carriers in nearly every war still running (99%)', (() => { let bad = 0, n = 0; for (let i = 0; i < 3000; i++) { const r = war(P, rng(warSeed(13, i)), { ...W, __trace: true }); const t = r.trace.find(x => x[0] >= 1944.5 && x[0] < 1944.75); if (!t) continue; n++; if (t[4] <= t[5]) bad++; } return n > 1000 && bad / n < 0.01; })());
ok('Hawaii is taken in under 1% of wars', (e['Hawaii taken'] || 0) / n6 < 0.01, pct((e['Hawaii taken'] || 0) / n6));
ok('Japan backs down in about 3% of wars (NO WAR)', Math.abs((free.outcomes[O_NOWAR] || 0) / n6 - 0.03) < 0.012, pct((free.outcomes[O_NOWAR] || 0) / n6));
ok('after Pearl Harbor, Washington negotiates in under 2% of wars', (() => { const b = batch('mid', N, 7, W); return (b.events['America negotiates'] || 0) / N < 0.02; })());
ok('after Pearl Harbor at least 70% of wars end in 1945', (() => { const b = batch('mid', N, 15, W); return (b.endYear[1945] || 0) / N > 0.7; })());
ok('the US wins the Philippine Sea in at least 80% of the wars that reach it (891 v 430 carrier planes; Morison)', (e['the Philippine Sea: the US wins'] || 0) / ((e['the Philippine Sea: the US wins'] || 0) + (e['the Philippine Sea: Japan wins'] || 0) + (e['the Philippine Sea: a draw'] || 0)) > 0.8);
{ const at = {}; for (let i = 0; i < 4000; i++) { const r = war(P, rng(warSeed(9, i)), { ...W, __trace: true }); for (const t of r.trace) (at[t[0].toFixed(2)] = at[t[0].toFixed(2)] || []).push(t); } const md = (k, j) => { const a = (at[k] || []).map(x => x[j]).sort((x, y) => x - y); return a[a.length >> 1]; };
  ok('oil near the real 6.4M barrels at the end of 1944 (USSBS), within 2', Math.abs(md('1945.00', 1) - 6.4) <= 2, md('1945.00', 1));
  ok('shipping near the real 2.85M tons at the end of 1944 (USSBS), within 0.6', Math.abs(md('1945.00', 3) - 2.85) <= 0.6, md('1945.00', 3));
  ok('shipping near the real 4.95M tons at the start of 1944, within 0.6', Math.abs(md('1944.00', 3) - 4.95) <= 0.6, md('1944.00', 3)); }

// 4. The fixes of code review r2
{ let back = 0, left = 0; for (let i = 0; i < 4000; i++) { const r = war(P, rng(warSeed(40, i)), { ...W, southOnly: true, usEntersNow: true, usTalks: true, jointPeace: false }); if (!r.ev.includes('America leaves the war')) continue; left++; const k = r.path.findIndex(l => /makes its own peace/.test(l)); if (r.path.slice(k + 1).some(l => /America goes to war/.test(l))) back++; } ok('America that leaves never comes back', left > 100 && back === 0, back + '/' + left); }
{ const b = batch('mid', 30000, 41, { ...W, invadeChoice: true, surrender: false, blockadeSurrender: false }); ok('Olympic can land in Oct-Dec 1945: some invaded wars end in 1945', (b.outcomes[O_INV] || 0) > 0 && (() => { for (let i = 0; i < 30000; i++) { const r = war(P, rng(warSeed(41, i)), { ...W, invadeChoice: true, surrender: false, blockadeSurrender: false }); if (r.outcome === O_INV && r.y < 1946) return true; } return false; })(), JSON.stringify(b.endYear)); }
{ let bad = 0, n = 0; for (let i = 0; i < 3000; i++) { const r = war(P, rng(warSeed(18, i)), { ...W, win_philsea: 'J', __trace: true }); if (r.btl.philsea !== 'J') continue; n++; const t = r.trace.find(x => Math.abs(x[0] - (yearOf(r.bq.philsea) + 0.25)) < 1e-6); if (t && t[2] >= 4) bad++; } ok('a Japanese win at the Philippine Sea holds the Marianas that quarter', n > 100 && bad === 0, bad + '/' + n); }
{ let bad = 0, n = 0; for (let i = 0; i < 3000; i++) { const r = war(P, rng(warSeed(19, i)), { ...W, win_leyte: 'J', __trace: true }); if (r.btl.leyte !== 'J') continue; n++; const t = r.trace.find(x => Math.abs(x[0] - (yearOf(r.bq.leyte) + 0.25)) < 1e-6); if (t && t[2] >= 5) bad++; } ok('a Japanese win at Leyte stops the Philippines that quarter', n > 50 && bad === 0, bad + '/' + n); }
{ let bad = 0, n = 0; for (let i = 0; i < 4000; i++) { const r = war(P, rng(warSeed(20, i)), { ...W, thirdStrike: true, tanksHit: true }); if (!r.init1) continue; n++; if (r.init1 < 1943.25) bad++; } ok('a burnt tank farm holds back the first US offensive to 1943 or later', n > 1000 && bad === 0, bad + '/' + n); }
{ const a = batch('mid', N, 21, { ...W, modusVivendi: true }), b = batch('mid', N, 21, { ...W }); ok('the modus vivendi does not make Midway easier for Japan', (a.events['Midway: Japan wins'] || 0) <= (b.events['Midway: Japan wins'] || 0) * 1.08, (a.events['Midway: Japan wins'] || 0) + ' v ' + (b.events['Midway: Japan wins'] || 0)); }
{ let bad = 0, n = 0; for (let i = 0; i < 3000; i++) { const r = war(P, rng(warSeed(22, i)), { strikeNorth: true, northEmbargo: true, sovietCounter: false, europeLost: false }); if (!r.ev.includes('south, a year late')) continue; n++; if (!('pilotPipeline' in r.rolls) || !r.ev.includes('the south taken')) bad++; } ok("the late southern war rolls Japan's choices and takes the south", n > 100 && bad === 0, bad + '/' + n); }
{ let n = 0, grew = 0; for (let i = 0; i < 3000; i++) { const r = war(P, rng(warSeed(23, i)), { ...W, southOnly: true, usEntersNow: false, usEntersLater: false, indianOcean: true, win_ceylon: 'J', __trace: true }); if (r.btl.ceylon !== 'J') continue; n++; const t0 = r.trace[0], t1 = r.trace[r.trace.length - 1]; if (t1[4] >= t0[4]) grew++; } ok('a Japanese win at Ceylon does not cost a neutral America carriers (its carrier count only grows)', n > 100 && grew === n, grew + '/' + n); }
// every ECONOMY and MECH field moves something (code review r2 test 5)
{ const sc = (v, f) => Array.isArray(v) ? v.map(x => x * f) : typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, b * f])) : v * f;
  const moved = (obj, k) => { const was = obj[k], sig = () => { let s = ''; for (let i = 0; i < 1500; i++) { const r = war(P, rng(warSeed(25, i)), { __trace: true }); s += r.outcome + r.y + (r.trace ? r.trace.map(t => t.join()).join() : ''); } for (let i = 0; i < 400; i++) { const r = war(P, rng(warSeed(25, i)), { strikeNorth: true, __trace: true }); s += r.outcome + r.y; } for (let i = 0; i < 300; i++) { const r = war(P, rng(warSeed(26, i)), { strikeNorth: true, europeLost: true, euroEarly: true }); s += r.outcome + r.y + r.path.join(); } for (let i = 0; i < 300; i++) { const r = war(P, rng(warSeed(27, i)), { ...W, midwayPlan: true, codebreak2: true, win_midway: 'J', hawaiiTry: true, hawaiiHold: true, __trace: true }); s += r.outcome + r.y + r.path.join(); } for (let i = 0; i < 400; i++) { const r = war(P, rng(warSeed(25, i)), { ...W, southOnly: true, usEntersNow: false, indianOcean: true }); s += r.outcome + r.y + r.path.join(); } return s; };
    obj[k] = sc(was, 1.5); const hi = sig(); obj[k] = sc(was, 0.5); const lo = sig(); obj[k] = was; return hi !== lo; };
  const dead = []; for (const k of Object.keys(ECONOMY)) if (k !== 'outReal' && k !== 'oilReal' && !moved(ECONOMY, k)) dead.push('ECONOMY.' + k); for (const k of Object.keys(MECH)) if (!moved(MECH, k)) dead.push('MECH.' + k); ok('every ECONOMY and MECH field changes something (outReal is display only; oilReal is the real-path test)', dead.length === 0, dead.join(', ') || 'all move'); }
{ let bad = 0, n = 0; for (let i = 0; i < 50000; i++) { const r = war(P, rng(warSeed(26, i)), { __trace: true }); for (const t of r.trace || []) { n++; if (t.some(x => Number.isNaN(x)) || t[8] < 0 || t[6] < 0.25 || t[3] < 0.3 || t[1] < 0) bad++; } } ok('no NaN, and stocks in range (will ≥ 0, pilots ≥ 0.25, shipping ≥ 0.3, oil ≥ 0)', bad === 0, bad + ' of ' + n + ' rows'); }
{ let lost = 0, n = 0; for (let i = 0; i < 200000 && n < 300; i++) { const r = war(P, rng(warSeed(27, i))); if (r.outcome !== O_WIN || !r.rolls.usTalks) continue; n++; if (war(P, rng(warSeed(27, i)), { usTalks: false }).outcome !== O_WIN) lost++; } ok('pinning the talks off loses at least 80% of the talk wins', n > 20 && lost / n >= 0.8, lost + '/' + n); }

// 5. Every door can open: generated from the source (code review r2 test 8)
const MARKS = [...new Set([...SRC.matchAll(/mark\('([^']+)'\)/g)].map(m => m[1]))];
const reach = batch('mid', 300000, 6), forcedN = batch('mid', 60000, 8, { strikeNorth: true }), forcedNE = batch('mid', 60000, 8, { strikeNorth: true, europeLost: true }), forcedP = batch('mid', 60000, 9, { ...W, philNoPearl: true, usFleetSails: true }), forcedS = batch('mid', 60000, 10, { ...W, southOnly: true, usEntersNow: false, indianOcean: true });
const ALL = [reach, forcedN, forcedNE, forcedP, forcedS], seen = k => ALL.reduce((s, x) => s + (x.events[k] || 0), 0);
for (const k of MARKS) ok('reachable: ' + k, seen(k) > 0, seen(k));
for (const b of BATTLES) ok('battle fought in some wars: ' + b.name, ALL.some(x => Object.keys(x.events).some(k => k.startsWith(b.name + ':'))));
for (const o of OUTCOMES) ok('outcome reachable: ' + o, ALL.some(x => (x.outcomes[o] || 0) > 0));

// 6. A win means Japan holds its conquests at the end, and a peace talk only becomes a win when Britain is down too
{ let bad = 0, wins = 0; for (let i = 0; i < 100000; i++) { const r = war(P, rng(warSeed(9, i))); if (r.outcome !== O_WIN) continue; wins++; if (r.south < 1 && r.north !== 2) bad++; if (r.ev.includes('America leaves the war') ? !r.ev.includes('peace without America') : r.ev.includes('America negotiates') && !r.ev.some(x => x === 'Britain out' || x === 'Hawaii taken' || x === 'the Indian Ocean: Japan wins' || x === 'Imphal and Kohima: Japan wins')) bad++; } ok('every win leaves Japan its conquests, and a talk-win needs Britain down too (after America leaves, the win must be the separate peace)', bad === 0, wins + ' wins, ' + bad + ' bad'); }
// 7. Decisions and battles move things the right way
{ const t1 = batch('mid', N, 10, { temper: 1.5 }), t0 = batch('mid', N, 10, { temper: -1.5 }); ok('a bolder leadership strikes America more often', (t1.events['Pearl Harbor'] || 0) > (t0.events['Pearl Harbor'] || 0), (t1.events['Pearl Harbor'] || 0) + ' v ' + (t0.events['Pearl Harbor'] || 0)); }
for (const id of ['coral', 'midway', 'guadalcanal', 'philsea', 'leyte']) { const pre = id === 'midway' ? { midwayPlan: true, codebreak2: true } : id === 'coral' ? { moresbyPlan: true } : {}; const a = batch('mid', N, 14, { ...W, ...pre, ['win_' + id]: 'J' }), b = batch('mid', N, 14, { ...W, ...pre, ['win_' + id]: 'U' });
  const good = x => (x.outcomes[O_WIN] || 0) + (x.outcomes[O_EMPIRE] || 0), se = Math.sqrt((good(a) + good(b)) / 2) + 1; ok(`a Japanese win at ${id} helps Japan (a better peace or a later end)`, good(a) >= good(b) - 2 * se && a.endMean >= b.endMean - 0.02, good(a) + ' v ' + good(b) + ', end ' + a.endMean.toFixed(2) + ' v ' + b.endMean.toFixed(2)); }


// ---- v5: the tests code review r3 asked for (S7), and the history review r3 changes
// a published sensitivity value must not sit behind a clamp: v and v + 10% of (v - default) differ (code review r3 M1, the jScale bug)
{ const RUN = fs.readFileSync(new URL('./run.mjs', import.meta.url), 'utf8'), grab = name => { const m = RUN.match(new RegExp('const ' + name + ' = (\\{[^}]*\\})')); return m ? Function('return ' + m[1])() : {}; };
  const sig = (n = 1000) => { let s = ''; for (let i = 0; i < n; i++) { const r = war(P, rng(warSeed(41, i))); s += r.outcome + r.y + r.dead.toFixed(1); } for (let i = 0; i < 300; i++) { const r = war(P, rng(warSeed(42, i)), { strikeNorth: true }); s += r.outcome + r.y; } return s; };
  const base = sig(), stuck = []; for (const [obj, table] of [[MECH, grab('MEC')], [ECONOMY, grab('ECV')]]) for (const [k, vs] of Object.entries(table)) for (const v of vs) { const was = obj[k]; if (typeof was !== 'number' || k === 'delayTanks') continue; try { obj[k] = v; const a = sig(); obj[k] = v + 0.25 * (v - was); const b = sig(); if (a !== base && a === b) { obj[k] = v; const A = sig(20000); obj[k] = v + (v - was); if (sig(20000) === A) stuck.push(k + '=' + v); } } finally { obj[k] = was; } }   // a sparse effect can miss 1,300 wars by chance: a suspect is retried on 8,000 with a bigger step
  ok('every published sensitivity value still moves the model (no clamp hides it)', stuck.length === 0, stuck.join(', ') || 'all move'); }
// a win is a peace every great power fighting Japan signs: never with the Soviets still at war (code review r3 M3)
{ let bad = 0, n = 0; for (const H of [{}, { strikeNorth: true }]) for (let i = 0; i < 150000; i++) { const r = war(P, rng(warSeed(43, i)), H); if (r.outcome !== O_WIN && r.outcome !== O_EMPIRE) continue; n++; if (r.ev.includes('south, a year late') && r.path.some(l => /still fighting the Soviets/.test(l)) && !r.ev.includes('the Soviet Far East kept')) bad++; }
  ok('no win or pre-war-empire peace while the Soviets are still at war with Japan', bad === 0, bad + ' of ' + n); }
// the late southern war conquers after the attack quarter, not in it (code review r3 S7, NICE-2)
{ let bad = 0, n = 0; for (let i = 0; i < 40000 && n < 2000; i++) { const r = war(P, rng(warSeed(44, i)), { strikeNorth: true }); if (r.mq['south, a year late'] === undefined || r.mq['the south taken'] === undefined) continue; n++; if (r.mq['the south taken'] <= r.mq['south, a year late']) bad++; }
  ok('a late southern war takes the south after the quarter it starts', n > 50 && bad === 0, bad + ' of ' + n); }
// a Soviet ceasefire with the US embargo still on is a pause: Japan goes back to its choice (history review r3 M2)
{ let ended = 0, n = 0; for (let i = 0; i < 20000; i++) { const r = war(P, rng(warSeed(45, i)), { strikeNorth: true, northEmbargo: true, europeLost: false }); if (!r.ev.includes('the Soviet counter-offensive') || r.ev.includes('the embargo lifted')) continue; n++; if (r.outcome === O_NORTH && !r.ev.includes('Japan backs down')) ended++; }
  ok('a Soviet ceasefire under the embargo never ends the war on its own', n > 200 && ended === 0, ended + ' of ' + n); }
// Strike North is not the safe plan (history review r3 M2): forced, Japan surrenders far more often than it draws
{ const b = batch('mid', 20000, 46, { strikeNorth: true }); ok('forced Strike North: surrender outweighs the Soviet draw', (b.outcomes[O_SURR] || 0) > 2 * (b.outcomes[O_NORTH] || 0), pct((b.outcomes[O_SURR] || 0) / b.n) + ' surrender v ' + pct((b.outcomes[O_NORTH] || 0) / b.n) + ' draw'); }
// the 1942 battles are even-ish (history review r3 M3): Midway 20-30% Japanese wins of those fought on the free real plan; Coral Sea 33-47%
{ let mj = 0, mn = 0, cj = 0, cn = 0; for (let i = 0; i < 30000; i++) { const r = war(P, rng(warSeed(47, i)), W); const m = r.btl.midway, c = r.btl.coral; if (m && m !== 'none') { mn++; if (m === 'J') mj++; } if (c) { cn++; if (c === 'J') cj++; } }
  ok('Midway: Japan wins 20-30% of the battles fought', mj / mn >= 0.2 && mj / mn <= 0.3, pct(mj / mn)); ok('the Coral Sea: Japan wins 33-47%', cj / cn >= 0.33 && cj / cn <= 0.47, pct(cj / cn)); }
// Imphal is not dead code: where it can matter (Britain alone), forcing it changes outcomes (code review r3 S7)
{ let diff = 0; for (let i = 0; i < 20000; i++) { const H = { ...W, southOnly: true, usEntersNow: false, usEntersLater: false }, a = war(P, rng(warSeed(48, i)), { ...H, win_imphal: 'J' }), b = war(P, rng(warSeed(48, i)), { ...H, win_imphal: 'U' }); if (a.outcome !== b.outcome || a.y !== b.y) diff++; }
  ok('Imphal changes outcomes in a war Britain fights alone', diff >= 100, diff + ' of 20,000'); }
// US dead: a Japanese success never makes the war much cheaper for America (code review r3 M2)
// every quarter America is at war costs at least the base rate, whoever holds the initiative (code review r3 M2)
{ let bad = 0, n = 0; for (let i = 0; i < 20000; i++) { const r = war(P, rng(warSeed(49, i)), { ...W, midwayPlan: true, codebreak2: true, win_midway: 'J' }); if (!r.pearl || r.outcome === O_NOWAR) continue; n++; if (r.dead < MECH.baseDead * (r.y - 1941.92) * 4 * 0.95) bad++; }
  ok('US dead are counted every quarter at war, whoever holds the initiative (Japan wins Midway)', n > 1000 && bad === 0, bad + ' of ' + n); }
// the no-bomb switch works (history review r3 S7)
{ const a = batch('mid', 20000, 50, { ...W, noBomb: true }), b = batch('mid', 20000, 50, W); ok('with no atomic bomb the war ends later', a.endMean > b.endMean, a.endMean.toFixed(2) + ' v ' + b.endMean.toFixed(2)); }


// v5d (code review r4): no call hides inside a // comment (the Coral Sea dead did); the Soviet Far East is asked under the embargo
{ const hid = SRC.split('\n').filter(l => { const i = l.indexOf('//'); if (i < 0 || /https?:\/\//.test(l.slice(i - 6, i + 2))) return false; return /\b(dies|roll|mark|say|carrierBattle)\(/.test(l.slice(i)); }); ok('no model call hides inside a // comment', hid.length === 0, hid.length + ' lines'); }
{ let asked = 0, n = 0; for (let i = 0; i < 20000; i++) { const r = war(P, rng(warSeed(51, i)), { strikeNorth: true, northEmbargo: true, europeLost: true, win_siberia: 'J', backDown: false }); if (!r.ev.includes('the USSR beaten')) continue; n++; if ('farEastFalls' in r.rolls) asked++; } ok('under the embargo, a beaten USSR\'s Far East is always asked', n > 200 && asked === n, asked + ' of ' + n); }
{ const r = batch('mid', 4000, 52, realUntil(99)); ok('the real path: mean US dead 88-95k', r.deadMean > 88 && r.deadMean < 95, r.deadMean.toFixed(1) + 'k'); }

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS'); process.exit(fails ? 1 : 0);
