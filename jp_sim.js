// RealityMargin · Japan sim page engine, ported from the Napoleon page (tools/page_np/np_sim.js) and the channel template (_toolkit/sim_page): one link, tabs, workers across the cores with a page fallback.
// Every war's dice depend only on the seed and its number, so blocks can finish in any order and any computer gets the same answer.
// Needs the locked model (model/sim_web.js: war, rng, warSeed, oddsFor, ODDS, ECONOMY, realUntil, yearOf, O_*), window.JP from the builder and window.JP_RUNS (film_runs.js: the runs behind the film's numbers).
(() => {
  const $ = id => document.getElementById(id), R = window.JP, RUNS = window.JP_RUNS, FILM = RUNS.film, fmt = n => n.toLocaleString("en-US");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches, glide = () => reduced ? "auto" : "smooth", narrow = () => matchMedia("(max-width: 979px)").matches;
  const qs = new URLSearchParams(location.search), MAX = 5000000, MIN = 1000, PREVIEW = 5000, SMALL = 100000, MAXSEED = 4294967295;
  const cores = qs.has("workers") ? Math.max(0, Math.min(16, +qs.get("workers") | 0)) : Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 2) - 1));
  const START = Object.fromEntries(R.starts.map(s => [s.id, s])), WI = Object.fromEntries(R.whatifs.map(w => [w.id, w])), OUT = Object.fromEntries(R.outcomes.map(o => [o.key, o]));
  const WIN = R.win, EMP = R.empire, NOWAR = R.nowar;
  let col = "mid", over = {}, whatif = "", start = FILM.set.start, seed = R.seed, wars = FILM.set.n, label = "";
  let job = null, pool = null, broken = cores === 0, nextId = 1, previewTimer = 0, msPerWar = R.msPerWar, reader = null, tweenId = 0, quietUntil = 0, scanId = 0;
  let shown = FILM.set, lastCounts = FILM.c;

  /* ---------- settings ---------- */
  const cur = () => ({ col, over: { ...over }, fix: whatif, start, seed, n: wars });
  const P_of = s => ({ ...oddsFor(s.col), ...s.over }), base = () => oddsFor(col);
  const spec_of = s => ({ q: START[s.start].q, x: { ...(s.fix ? WI[s.fix].fix : {}) } });
  const econ_of = s => (s.fix && WI[s.fix].econ) || {};
  const makeH = sp => sp.q ? realUntil(sp.q, sp.x) : { ...sp.x };
  const key = s => [s.col, s.start, s.fix || ""].join("|");
  const BYKEY = {}; for (const id in RUNS) (BYKEY[key(RUNS[id].set)] = BYKEY[key(RUNS[id].set)] || []).push(RUNS[id]);
  function refFor(s) { for (const k of [key(s), key({ ...s, col: "mid" }), key({ ...s, col: "mid", fix: "" })]) { const L = BYKEY[k]; if (L) return L.find(r => r.set.seed === s.seed && r.set.n === s.n) || L[0]; } return FILM; }
  const noOver = s => !Object.keys(s.over).length;
  const sameAs = (s, r) => key(s) === key(r.set) && noOver(s);
  const exactly = (s, r) => sameAs(s, r) && s.seed === r.set.seed && s.n === r.set.n;
  const filmWarSettings = s => noOver(s) && key(s) === key(FILM.set) && s.seed === FILM.set.seed;
  function withEcon(e, f) { const was = {}; for (const k in e) { was[k] = ECONOMY[k]; ECONOMY[k] = e[k]; } try { return f(); } finally { Object.assign(ECONOMY, was); } }
  function runOne(s, i, H) { return withEcon(econ_of(s), () => war(P_of(s), rng(warSeed(s.seed, i)), H || makeH(spec_of(s)))); }

  /* ---------- small helpers ---------- */
  const span = s => s < 5 ? "a few seconds" : s < 90 ? "about " + Math.round(s / 5) * 5 + " seconds" : "about " + Math.max(2, Math.round(s / 60)) + " minutes";
  const threads = () => Math.max(1, broken ? 1 : cores);
  const pct = (a, n, d) => (100 * a / Math.max(1, n)).toFixed(d) + "%", digits = n => n < SMALL ? 1 : 2, pctOf = (c, k, n, d) => pct(c[k] || 0, n, d);
  const dob = c => (c[WIN] || 0) + (c[EMP] || 0);   /* a draw or better: a win, or a peace that keeps the pre-war empire */
  const realJob = () => job && !job.preview;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "own-settings";
  const nice = v => String(+v.toFixed(v < 0.1 ? 3 : v < 1 ? 2 : 1));
  const show = (k, v) => { const o = R.odds[k]; return o.kind === "%" ? nice(100 * v) + "%" : o.kind === "x" ? "×" + +v.toFixed(3) : String(+v.toFixed(3)); };
  const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], QN = ["January–March", "April–June", "July–September", "October–December"];
  const quarter = y => QN[Math.round((y - Math.floor(y + 1e-9)) * 4) % 4] + " " + Math.floor(y + 1e-9);
  const month = y => MON[Math.min(11, Math.floor((y - Math.floor(y)) * 12))] + " " + Math.floor(y);
  const lit = () => document.querySelectorAll(".preset.on").forEach(p => { p.classList.remove("on"); p.removeAttribute("aria-current"); });
  function toast(t, ms) { const el = $("toast"); el.textContent = t; el.className = "on"; clearTimeout(toast.t); toast.t = setTimeout(() => el.className = "", ms || 2400); }
  function setNums(vw, vd, d, animate) { /* a new draw always cancels an old count-up, so the tiles can't disagree with the rows */
    const id = ++tweenId, A = $("vWin"), B = $("vDraw"), put = (a, b) => { A.textContent = a.toFixed(d) + "%"; B.textContent = b.toFixed(d) + "%"; };
    if (!animate || reduced) { put(vw, vd); return; } const a0 = parseFloat(A.textContent) || 0, b0 = parseFloat(B.textContent) || 0, t0 = performance.now();
    const go = t => { if (id !== tweenId) return; const u = Math.min(1, (t - t0) / 420), e = 1 - (1 - u) * (1 - u); put(a0 + (vw - a0) * e, b0 + (vd - b0) * e); if (u < 1) requestAnimationFrame(go); else put(vw, vd); }; requestAnimationFrame(go);
  }
  function pulse() { const a = $("answer"); a.classList.remove("pulse"); void a.offsetWidth; a.classList.add("pulse"); }
  function goTo(el) { el.scrollIntoView({ behavior: glide(), block: "start" }); }
  function toResults() { const t = $("answer").getBoundingClientRect().top; if (t < 0 || t > innerHeight * .3) goTo(narrow() ? $("answer") : $("work")); }
  function openFold(id) { const d = $(id); if (!d.open) d.open = true; setTimeout(() => goTo(d), reduced ? 0 : 280); }
  addEventListener("click", e => { if (performance.now() < quietUntil) { e.stopImmediatePropagation(); e.preventDefault(); } }, true); /* a double-click's second half must not stop a run or close a panel */

  /* ---------- reading what people type ---------- */
  const readNum = s => { const t = String(s).replace(/[,\s_]/g, "").replace(/[%×x]$/i, "").replace(/^[×x]/i, ""); if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN; const v = parseFloat(t); return isFinite(v) ? v : NaN; };
  const warsFrom = s => { const v = readNum(s); return isNaN(v) ? null : Math.max(MIN, Math.min(MAX, Math.round(v))); };
  function warsUI() { document.querySelectorAll(".chip[data-n]").forEach(c => { const on = +c.dataset.n === wars; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on); }); $("wEst").textContent = fmt(wars) + " wars, " + span(wars * msPerWar / 1000 / threads()) + (threads() > 1 ? " on " + threads() + " cores" : " on one core"); $("runT").textContent = "▶ Run " + fmt(wars) + " wars"; }
  function setWars(n) { wars = n; $("nw").value = fmt(n); warsUI(); setUI(); }

  /* ---------- what the run card says about the settings ---------- */
  function setUI() {
    const st = START[start], n = Object.keys(over).length;
    $("startNow").textContent = st.date + ": " + st.what;
    $("setNow").textContent = (whatif ? "What-if: " + WI[whatif].t + " · " : "") + ({ low: "Every odd against Japan", mid: "Middle odds", high: "Every odd for Japan" })[col] + (n ? ", " + n + " changed" : "") + " · seed " + seed;
    document.querySelectorAll("#startList .tp").forEach(b => { const on = b.dataset.id === start; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  }

  /* ---------- odds ---------- */
  function countChanged() {
    const n = Object.keys(over).length; $("changedN").textContent = n ? n + " changed" : ""; $("changedN").hidden = !n;
    document.querySelectorAll("#allOdds details.grp").forEach(g => { const m = [...g.querySelectorAll(".odd2")].filter(r => over[r.dataset.k] !== undefined).length, b = g.querySelector(".gn"); b.textContent = m ? m + " changed" : ""; b.hidden = !m; });
  }
  function syncOdd(k) {
    const row = $("allOdds").querySelector('.odd2[data-k="' + k + '"]'); if (!row) return; const v = over[k] ?? base()[k], idx = ODDS[k].findIndex(x => Math.abs(x - v) < 1e-12);
    row.querySelectorAll("input[type=radio]").forEach(r => { r.checked = +r.value === idx; });
    const own = row.querySelector(".own input"); own.value = idx < 0 ? (R.odds[k].kind === "%" ? nice(100 * v) : String(+v.toFixed(4))) : ""; row.classList.toggle("moved", over[k] !== undefined); row.classList.toggle("custom", idx < 0);
  }
  function setOdd(k, v) { if (Math.abs(v - base()[k]) < 1e-12) delete over[k]; else over[k] = v; syncOdd(k); countChanged(); changed("odds"); }
  function allOdds() {
    const el = $("allOdds"), open = new Set([...el.querySelectorAll("details.grp[open]")].map(g => g.dataset.g)); el.innerHTML = "";
    for (const g of R.groups) {
      const d = document.createElement("details"); d.className = "grp"; d.dataset.g = g.id; if (open.has(g.id)) d.open = true;
      d.innerHTML = '<summary><span class="gt">' + esc(g.name) + '</span><span class="badge gn" hidden></span><small>' + g.keys.length + " odds</small></summary>";
      for (const k of g.keys) {
        const o = R.odds[k], row = document.createElement("div"); row.className = "odd2"; row.dataset.k = k; row.dataset.s = (k + " " + o.t + " " + o.why).toLowerCase();
        const names = ["Against", "Middle", "For"];
        row.innerHTML = '<div class="oh"><b id="ot-' + k + '">' + esc(o.t) + "</b>" + (o.h ? '<span class="hy">each quarter</span>' : "") + (o.tm ? '<span class="tm">its appetite for risk</span>' : "") + '<code>' + k + '</code></div><small class="why">' + esc(o.why) + '</small>' +
          '<div class="seg4" role="group" aria-labelledby="ot-' + k + '">' + names.map((t, i) => '<label><input type="radio" name="o-' + k + '" value="' + i + '"><span><i>' + t + "</i>" + show(k, ODDS[k][i]) + "</span></label>").join("") +
          '<label class="own"><i>Yours</i><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="' + esc(o.t) + ': your own value' + (o.kind === "%" ? ", in percent" : "") + '" placeholder="' + (o.kind === "%" ? "%" : o.kind === "x" ? "×" : "#") + '"></label></div>';
        row.querySelectorAll("input[type=radio]").forEach(r => r.onchange = () => { if (r.checked) setOdd(k, ODDS[k][+r.value]); });
        const own = row.querySelector(".own input");
        own.onchange = () => {
          if (!own.value.trim()) { syncOdd(k); return; } let v = readNum(own.value); if (isNaN(v) || v < 0) { toast("Type a number, 0 or more"); syncOdd(k); return; }
          if (o.kind === "%") v /= 100; const x = Math.min(o.max, Math.max(o.min, v)); if (x !== v) toast("Capped at " + show(k, x)); setOdd(k, x);
        };
        own.onkeydown = e => { if (e.key === "Enter") own.blur(); };
        d.appendChild(row);
      }
      el.appendChild(d);
    }
    for (const k in ODDS) syncOdd(k); countChanged(); filterOdds();
  }
  function filterOdds() {
    const q = $("oddFind").value.trim().toLowerCase(); let n = 0;
    $("allOdds").querySelectorAll("details.grp").forEach(g => { let m = 0; g.querySelectorAll(".odd2").forEach(r => { const ok = !q || r.dataset.s.includes(q); r.hidden = !ok; if (ok) m++; }); g.hidden = !!q && !m; if (q && m) g.open = true; n += m; });
    $("oddN").textContent = q ? n + (n === 1 ? " odd matches" : " odds match") : ""; $("oddNone").hidden = !q || n > 0;
  }
  function seg(name, v) { document.querySelectorAll('input[name="' + name + '"]').forEach(r => { r.checked = r.value === String(v); }); }
  /* any change by hand: the panel stops claiming it's a named run, and a rough answer appears. Odds and the seed let go of a what-if */
  function changed(kind) {
    label = ""; lit(); if (kind !== "seed") whatif = ""; countChanged(); setUI(); warNote();
    if (realJob()) { job.dirty = true; $("status").textContent = "Changed. Your change counts on the next run."; return; }
    $("status").textContent = "Changed. Press Run for the full answer.";
    clearTimeout(previewTimer); previewTimer = setTimeout(() => { const s = cur(), r = refFor(s); if (exactly(s, r)) { job = null; showRef(r); return; } begin({ preview: true }); }, 380);
  }

  /* ---------- running ---------- */
  function getPool() { if (broken) return null; if (pool) return pool; try { pool = Array.from({ length: cores }, () => { const w = new Worker(R.worker); w.onmessage = e => onBlock(w, e.data); w.onerror = e => { e.preventDefault && e.preventDefault(); fallBack(e); }; return w; }); } catch (e) { fallBack(); return null; } return pool; }
  function fallBack(e) { window.JPFALL = String(e && (e.message || e.type) || "?"); if (broken) return; broken = true; if (pool) pool.forEach(w => w.terminate()); pool = null; warsUI(); if (job) { const j = job; job = null; begin({ again: j }); } }
  const merge = (a, b) => { for (const k in b) a[k] = (a[k] || 0) + b[k]; };
  const fresh = () => ({ next: 0, done: 0, c: {}, ev: {}, yr: {}, fought: 0, dead: 0, ends: 0, last: 0, t0: performance.now() });
  function feed(w) { const j = job; if (!j || j.next >= j.n) return; const from = j.next, to = Math.min(j.n, from + j.block); j.next = to; w.postMessage({ id: j.id, P: j.P, spec: j.spec, econ: j.econ, seed: j.set.seed, from, to }); }
  function onBlock(w, d) { const j = job; if (!j || d.id !== j.id) return; merge(j.c, d.c); merge(j.ev, d.ev); merge(j.yr, d.yr); j.fought += d.fought; j.dead += d.dead; j.ends += d.ends; j.done += d.n; tick(); if (j.done >= j.n) finish(false); else feed(w); }
  function localStep() {
    const j = job; if (!j || j.local !== j.id) return; const t0 = performance.now();
    withEcon(j.econ, () => { while (j.next < j.n && performance.now() - t0 < 50) { const r = war(j.P, rng(warSeed(j.set.seed, j.next++)), j.H); j.c[r.outcome] = (j.c[r.outcome] || 0) + 1; for (const e of r.ev) j.ev[e] = (j.ev[e] || 0) + 1; const y = Math.floor(r.y); j.yr[y] = (j.yr[y] || 0) + 1; if (r.outcome !== NOWAR) { j.fought++; j.dead += r.dead; j.ends += r.y; } j.done++; } });
    tick(); if (j.done >= j.n) finish(false); else setTimeout(localStep, 0);
  }
  function tick() { const j = job, now = performance.now(); if (!j) return; const end = j.done >= j.n; if (!end && now - j.last < 110) return; j.last = now; const rate = j.done / Math.max(1, now - j.t0); setProgress(j.done, j.n); if (!j.preview) $("eta").textContent = end ? "" : j.done > 0 ? span((j.n - j.done) / Math.max(rate, 1e-6) / 1000) + " left" : ""; if (j.done) draw(j, j.done, false, j.ref); }
  function setProgress(i, n) { const u = 100 * i / Math.max(1, n); $("bar").style.width = u + "%"; $("dockBar").style.width = u + "%"; $("count").textContent = fmt(i) + " / " + fmt(n) + " wars"; }
  function buttons(run) {
    document.documentElement.classList.toggle("running", run); $("runT").hidden = run; $("stopT").hidden = !run; $("dockRun").textContent = run ? "■ Stop" : "▶ Run"; $("ansRun").textContent = run ? "■ Stop" : "▶ Run"; $("heroRun").textContent = run ? "Running…" : "▶ Run " + R.filmName.replace(/^The /, "the ");
    for (const el of [$("heroRun"), $("reset"), ...document.querySelectorAll(".preset, .tp, .fwb")]) el.setAttribute("aria-disabled", run); /* not "disabled": the keyboard keeps its place */
  }
  function runName(s, r, preview) { if (preview) return "Rough preview"; if (label) return label; if (exactly(s, r)) return r === FILM ? R.filmName : r.name; if (sameAs(s, r)) return r === FILM ? "The film's settings" : r.name; return s.fix ? WI[s.fix].t + ", your settings" : "Your settings"; }
  function begin(o = {}) {
    clearTimeout(previewTimer);
    const again = o.again, preview = again ? again.preview : !!o.preview; if (!again && !preview && realJob()) return;
    let j;
    if (again) j = job = { ...again, id: nextId++, ...fresh() };
    else {
      const s = { ...cur(), n: preview ? PREVIEW : wars }, r = refFor(s), spec = spec_of(s);
      j = job = { note: o.note || "", id: nextId++, n: s.n, set: s, P: P_of(s), spec, econ: econ_of(s), H: makeH(spec), ref: r, preview, label: runName(s, r, preview), exact: !preview && exactly(s, r), same: !preview && sameAs(s, r), block: Math.max(250, Math.min(2500, Math.ceil(s.n / 240))), ...fresh() };
    }
    shown = j.set;
    $("modeT").textContent = j.label; $("modeS").textContent = fmt(j.n) + " wars, seed " + j.set.seed + ", " + START[j.set.start].date; $("compare").textContent = ""; $("again").classList.remove("on"); setProgress(0, j.n); refCap(j.ref);
    if (!preview) {
      quietUntil = performance.now() + 250; window.JPLAST = null; buttons(true); $("status").textContent = "Running. The numbers settle as it counts."; $("eta").textContent = ""; pulse();
      if (!again) try { if (window.goatcounter && goatcounter.count) goatcounter.count({ path: "run/" + slug(label || (start !== FILM.set.start ? "turning point" : "own settings")), title: "RUN: " + (label || "own settings"), event: true }); } catch (e) { } /* counts the press and the name of the button, never the odds */
    } else $("status").textContent = (j.note ? j.note + " " : "") + "Working out a rough answer…";
    const P = getPool(); if (P) P.forEach(feed); else { j.local = j.id; localStep(); }
  }
  function finish(stopped) {
    const j = job; if (!j) return; job = null;
    if (!j.preview && !stopped && j.done > 5000) { msPerWar = (performance.now() - j.t0) * threads() / j.done; }
    $("eta").textContent = "";
    if (j.preview) { draw(j, j.done, true, j.ref); setProgress(j.done, j.n); $("status").textContent = (j.note ? j.note + " " : "") + "Rough answer from " + fmt(j.done) + " wars. Press Run to use your " + fmt(wars) + "."; $("compare").textContent = "Only " + fmt(j.done) + " wars, so small differences here can be chance."; warsUI(); return; }
    buttons(false); window.JPLAST = { i: j.done, c: j.c, ev: j.ev, yr: j.yr, fought: j.fought, dead: j.dead, ends: j.ends, set: j.set };
    if (stopped && !j.done) { const s = cur(), r = refFor(s); if (exactly(s, r)) showRef(r); else { draw({ c: {}, ev: {}, yr: {}, fought: 0 }, 0, false, r); setProgress(0, j.n); $("modeT").textContent = "Stopped"; } $("status").textContent = "Stopped before any war finished."; return; }
    draw(j, j.done, true, j.ref); setProgress(j.done, j.n);
    if (stopped) { lit(); $("modeT").textContent = "Stopped at " + fmt(j.done) + " of " + fmt(j.n); $("modeS").textContent = "seed " + j.set.seed + ", " + START[j.set.start].date; }
    $("status").textContent = stopped ? "Stopped at " + fmt(j.done) + " wars. These numbers cover only those." : j.dirty ? "Done, for the settings as they were when you pressed Run. Press Run again to use your change." : "Done. The same settings, seed and number of wars give the same answer on any computer. It isn't a forecast.";
    compare(j, stopped); $("again").classList.add("on"); warsUI();
  }
  function compare(j, stopped) {
    const r = j.ref, d = digits(j.done), w = pctOf(j.c, WIN, j.done, d), b = pct(dob(j.c), j.done, d), rw = pctOf(r.c, WIN, r.set.n, 2), rb = pct(dob(r.c), r.set.n, 2);
    if (j.exact && !stopped) { $("compare").textContent = r.inFilm ? "This is the film's exact run." : "This is the exact run in the How it works tables."; return; }
    if (j.same) { $("compare").textContent = "Same settings as the run behind the film's column, in a different sample of wars, so any gap from its " + rb + " for a draw or better is chance."; return; }
    $("compare").textContent = "A draw or better: " + rb + " in the film's column, " + b + " here. Japan wins: " + rw + " there, " + w + " here." + (j.done < SMALL ? " With only " + fmt(j.done) + " wars, small differences can be chance." : "");
  }

  /* ---------- drawing the answer ---------- */
  function refCap(r) { $("refCap").textContent = "Film column: " + r.cap + "."; }
  const avgBits = d => d && d.fought ? [month(d.ends / d.fought), fmt(Math.round(d.dead / d.fought) * 1000)] : null;
  const avgLine = (d, r) => { const a = avgBits(d), b = avgBits(r); return (a ? "The wars fought here end, on average, in " + a[0] + ", with about " + a[1] + " Americans dead" : "No war was fought here") + (b ? ". Film column: " + b[0] + ", about " + b[1] + "." : "."); };
  function draw(d, i, settled, r) {
    const c = d.c; lastCounts = c; r = r || FILM; const w = c[WIN] || 0, e = c[EMP] || 0, vw = 100 * w / Math.max(1, i), vd = 100 * (w + e) / Math.max(1, i), dg = digits(i);
    setNums(vw, vd, dg, settled); $("dW").textContent = vw.toFixed(dg) + "%"; $("dD").textContent = vd.toFixed(dg) + "%";
    $("aWin").textContent = !i ? "" : w ? fmt(w) + " of " + fmt(i) + " wars" : "No war ended in a win";
    $("aDraw").textContent = !i ? "" : fmt(w) + " wins and " + fmt(e) + " peaces that keep the pre-war empire";
    $("stack").innerHTML = R.outcomes.map(o => '<i style="width:' + (100 * (c[o.key] || 0) / Math.max(1, i)) + "%;background:" + o.col + '"></i>').join("");
    const body = $("rowsB");
    if (!body.children.length) body.innerHTML = R.outcomes.map(o => '<button class="row" type="button" data-k="' + esc(o.key) + '"><span class="sw" style="background:' + o.col + '"></span><span class="l">' + esc(o.say) + '</span><span class="n"></span><span class="p"></span><span class="r"></span><span class="go2" aria-hidden="true">›</span></button>').join(""); body.querySelectorAll(".row").forEach(x => { if (!x.onclick) x.onclick = () => { if (x.getAttribute("aria-disabled") !== "true") readEnding(x.dataset.k, undefined, false, undefined, x); }; });
    body.querySelectorAll(".row").forEach(x => { const k = x.dataset.k, n = c[k] || 0; x.setAttribute("aria-disabled", !n); x.title = n ? "Read a war that ended this way" : "No war ended this way in this run"; x.setAttribute("aria-label", OUT[k].say + ": " + fmt(n) + " wars, " + pct(n, i, dg) + "; the film's column: " + pctOf(r.c, k, r.set.n, 2) + (n ? ". Read a war that ended this way" : "")); x.querySelector(".n").textContent = fmt(n); x.querySelector(".p").textContent = pct(n, i, dg); x.querySelector(".r").textContent = pctOf(r.c, k, r.set.n, 2); });
    refCap(r);
    $("avg").textContent = !i ? "" : avgLine(d, r);
    const fought = y => ((d.yr && d.yr[y]) || 0) - (y === R.years[0] ? (c[NOWAR] || 0) : 0);   /* the wars Japan never fought (it backs down in 1941) aren't counted */
    const ys = R.years.map(fought), top = Math.max(1, ...ys), nf = Math.max(1, i - (c[NOWAR] || 0));
    $("years").innerHTML = R.years.map((y, n) => '<span class="yc' + (R.realEnd.includes(y) ? " real" : "") + '" title="' + y + ": " + pct(ys[n], nf, 2) + ' of the wars fought"><i style="height:' + (100 * ys[n] / top) + '%"></i><b>' + y + "</b></span>").join("");
    $("evs").innerHTML = R.events.map(([k, t, real]) => "<span>" + esc(t) + '</span><span class="p">' + pct((d.ev && d.ev[k]) || 0, i, 1) + '</span><span class="r">' + pct((r.ev && r.ev[k]) || 0, r.set.n, 1) + '</span><span class="re" aria-label="' + (real ? "happened" : "did not happen") + '">' + (real ? "✓" : "–") + "</span>").join("");
  }
  function showRef(r) {
    shown = r.set; $("modeT").textContent = r === FILM ? R.filmName : r.name; $("modeS").textContent = fmt(r.set.n) + " wars, seed " + r.set.seed + ", " + START[r.set.start].date;
    setProgress(r.set.n, r.set.n); $("eta").textContent = ""; $("status").textContent = r === FILM ? "These are the film's numbers. Press Run to watch them come out again, or try a what-if." : "These are the numbers from the run behind them. Press Run to watch them come out again.";
    $("compare").textContent = r.inFilm ? "This is the film's exact run." : "This is the exact run in the How it works tables."; $("again").classList.remove("on"); draw(r, r.set.n, false, r);
  }
  function loadSettings(s) { job = null; clearTimeout(previewTimer); lit(); col = s.col; over = { ...(s.over || {}) }; whatif = s.fix || ""; start = s.start; seed = s.seed; if (s.n) setWars(s.n); seg("col", col); $("seed").value = seed; allOdds(); setUI(); warNote(); }
  function reset() { if (realJob()) return; label = ""; $("oddFind").value = ""; loadSettings(FILM.set); showRef(FILM); }

  /* ---------- turning points, what-ifs, the film's wars ---------- */
  function startList() {
    const el = $("startList"); el.innerHTML = "";
    for (const st of R.starts) {
      const r = RUNS[st.ref], b = document.createElement("button"); b.type = "button"; b.className = "tp"; b.dataset.id = st.id;
      b.innerHTML = '<span class="tt">' + esc(st.tag) + '</span><span class="td">' + esc(st.date + ": " + st.what) + '</span><span class="tn"><b class="w">' + pct(dob(r.c), r.set.n, 2) + '</b><b class="f">' + pctOf(r.c, WIN, r.set.n, 2) + "</b></span>";
      b.onclick = () => pickStart(st.id); el.appendChild(b);
    }
  }
  function pickStart(id) {
    if (realJob()) return; job = null; clearTimeout(previewTimer); const st = START[id], r = RUNS[st.ref];
    start = id; whatif = ""; label = ""; lit(); seed = r.set.seed; $("seed").value = seed; setWars(r.set.n); setUI(); warNote();
    const s = cur(), ref = refFor(s); toResults();
    if (exactly(s, ref)) { showRef(ref); return; }
    $("status").textContent = "Restarted from " + st.date + " with your settings."; begin({ preview: true });
  }
  function presets() {
    const el = $("presets"); el.innerHTML = "";
    R.whatifs.forEach(w => {
      if (w.head) { const h = document.createElement("p"); h.className = "wih"; h.textContent = w.head; el.appendChild(h); }
      const r = RUNS[w.ref], b = document.createElement("button"); b.type = "button"; b.className = "preset"; b.dataset.id = w.id;
      b.innerHTML = '<span class="t">' + esc(w.t) + '</span><span class="d">' + esc(w.d) + '</span><span class="wn"><b class="w">' + pct(dob(r.c), r.set.n, 2) + '</b> a draw or better · <b class="f">' + pctOf(r.c, WIN, r.set.n, 2) + "</b> wins</span>";
      b.onclick = () => { if (realJob()) return; loadSettings({ ...r.set, over: {} }); label = w.t; b.classList.add("on"); b.setAttribute("aria-current", "true"); toResults(); begin(); };
      el.appendChild(b);
    });
  }
  function filmWars() {
    const el = $("filmWars"); el.innerHTML = "";
    for (const fw of R.filmWars) {
      if (fw.head) { const h = document.createElement("p"); h.className = "wih"; h.textContent = fw.head; el.appendChild(h); }
      const b = document.createElement("button"); b.type = "button"; b.className = "fwb";
      b.innerHTML = '<span class="fn">War ' + fmt(fw.n) + '</span><span class="ft">' + esc(fw.t) + '</span><span class="fd">' + esc(fw.d) + "</span>";
      b.onclick = () => { if (realJob()) { toast("Stop the run first, or wait for it to finish"); return; } const back = b; loadSettings({ ...fw.set, n: 0 }); const s = cur(), r = refFor(s); if (exactly(s, r)) showRef(r); else begin({ preview: true }); $("warN").value = fmt(fw.n); reader = { mode: "number", set: s, i: fw.n - 1 }; $("drMore").textContent = "Show the next war"; fillWar(fw.n - 1, runOne(s, fw.n - 1), fw.k, s); openDrawer(back); };
      el.appendChild(b);
    }
  }

  /* ---------- reading one war, in a side panel ---------- */
  function warNote(s) {
    s = s || cur(); const t = filmWarSettings(s) ? "" : "These aren't the film's settings, so a war number here isn't the film's war of that number. Back to the film's settings brings the film's wars back.";
    $("warNote").textContent = t; $("warNote").hidden = !t; return t;
  }
  const ROAD = { REAL: "Pearl Harbor and the south (the real plan)", SOUTH: "the British and Dutch colonies only, leaving America alone (road B)", PHIL: "the Philippines and the south, but not Pearl Harbor", NORTH: "north, against the Soviet Union", "NORTH+SOUTH LATE": "north against the Soviet Union, then south a year late", "": "none: it backs down in 1941" };
  function headline(i, r) {
    const n = "War " + fmt(i + 1) + ": ", q = quarter(r.y);
    switch (r.outcome) {
      case WIN: return n + "Japan wins, " + q + ".";
      case EMP: return n + "a draw. Japan hands back its conquests and keeps its pre-war empire, " + q + ".";
      case O_SURR: return n + "Japan surrenders, " + q + ".";
      case O_INV: return n + "America lands in Japan, and Japan surrenders, " + q + ".";
      case O_NORTH: return n + "a drawn war with the Soviets, " + q + ".";
      case NOWAR: return n + "no war. Japan backs down in 1941.";
      case O_STILL: return n + "still at war at the end of 1947.";
    } return n + r.outcome;
  }
  function mood(z, s, P) { if (s.fix && WI[s.fix] && "temper" in WI[s.fix].fix) return "forced to " + (z > 0 ? "+" : "") + z + " by the what-if"; const sd = P.temperSd || 1e-9, a = Math.abs(z / sd), w = a < 0.33 ? "about average" : (a < 0.75 ? "" : "much ") + (z < 0 ? "more cautious" : "bolder") + " than most"; return (z > 0 ? "+" : "") + z.toFixed(2) + ", " + w; }
  function setLine(s) { return START[s.start].date + ": " + START[s.start].what + " · " + ({ low: "every odd against Japan", mid: "middle odds", high: "every odd for Japan" })[s.col] + (noOver(s) ? "" : ", " + Object.keys(s.over).length + " changed") + (s.fix ? " · what-if: " + WI[s.fix].t : "") + " · seed " + s.seed; }
  function fillWar(i, r, kicker, s) {
    const o = OUT[r.outcome] || { say: r.outcome, col: "#888" }; $("drK").textContent = kicker; $("warHead").textContent = headline(i, r); warNote(s);
    const q0 = START[s.start].q, facts = [['<span class="sw" style="background:' + o.col + '"></span>' + esc(o.say), ""], ["Japan's road", ROAD[r.plan] ?? r.plan.toLowerCase()], ["It ends", r.outcome === NOWAR ? "before any fighting" : quarter(r.y)], ["Americans dead", r.us || r.dead > 0 ? "about " + fmt(Math.round(r.dead * 10) * 100) : "none: America never fights"], ["Japan's appetite for risk", mood(r.temper, s, P_of(s))], ["Settings", setLine(s)]];
    if (q0) facts.splice(1, 0, ["Real history", "replayed exactly up to " + START[s.start].date + ", then the model runs free"]);
    $("warSum").innerHTML = facts.map(([a, b]) => b ? "<dt>" + a + "</dt><dd>" + esc(b) + "</dd>" : '<dt class="oc">' + a + "</dt><dd></dd>").join("");
    const groups = []; for (const line of r.path) { const m = /^(\d{4}) ([\s\S]*)$/.exec(line), y = m ? m[1] : "", g = groups[groups.length - 1], item = "<li>" + esc(m ? m[2] : line) + "</li>"; if (g && g.y === y) g.items.push(item); else groups.push({ y, items: [item] }); }
    $("warPath").innerHTML = groups.map(g => '<li class="yr"><b>' + g.y + "</b><ol>" + g.items.join("") + "</ol></li>").join("") || "<li>Nothing happened that the model writes down.</li>";
    let freeSaid = !q0; const evs = [];
    for (const e of r.ev) { const q = r.mq[e], real = q0 && q < q0; if (!real && !freeSaid) { freeSaid = true; evs.push('<li class="free">' + esc(START[s.start].date) + ": from here the model runs free</li>"); } evs.push("<li" + (real ? ' class="rh"' : "") + '><span class="mo">' + quarter(yearOf(q)) + "</span> " + esc(e) + "</li>"); }
    $("warEv").innerHTML = evs.join(""); $("evFold").open = false;
    window.JPWAR = { i, n: i + 1, outcome: r.outcome, path: r.path, ev: r.ev, y: r.y, dead: r.dead, plan: r.plan, head: $("warHead").textContent }; $("drBody").scrollTop = 0;
    if (reader) { reader.i = i; reader.set = s; }
  }
  const behind = () => [document.querySelector(".bar"), ...document.querySelectorAll(".tabp"), document.querySelector("footer"), $("dock")];
  function openDrawer(back) { const d = $("drawer"); if (!d.hidden) return; d.hidden = false; requestAnimationFrame(() => d.classList.add("on")); document.documentElement.classList.add("lock"); behind().forEach(e => e.inert = true); quietUntil = performance.now() + 250; if (reader) reader.back = back; $("drClose").focus(); }
  function closeDrawer() { scanId++; const d = $("drawer"); if (d.hidden) return; d.classList.remove("on"); document.documentElement.classList.remove("lock"); behind().forEach(e => e.inert = false); setTimeout(() => { if (!d.classList.contains("on")) d.hidden = true; }, reduced ? 0 : 240); if (reader && reader.back && reader.back.focus && document.contains(reader.back)) reader.back.focus({ preventScroll: true }); }
  function oneWar() {
    const v = readNum($("warN").value); if (isNaN(v) || v < 1 || v > MAX) { toast("Type a war number from 1 to " + fmt(MAX)); return; } const n = Math.round(v), s = cur(); $("warN").value = fmt(n);
    const back = reader && !$("drawer").hidden ? reader.back : $("warGo"); reader = { mode: "number", back }; $("drMore").textContent = "Show the next war"; fillWar(n - 1, runOne(s, n - 1), "One war", s); openDrawer($("warGo"));
  }
  function randomWar() { const s = cur(), i = Math.floor(Math.random() * Math.max(s.n, FILM.set.n)), back = reader && !$("drawer").hidden ? reader.back : $("warRand"); $("warN").value = fmt(i + 1); reader = { mode: "random", back }; $("drMore").textContent = "Show another random war"; fillWar(i, runOne(s, i), "A random war", s); openDrawer($("warRand")); }
  function readEnding(k, from, keep, kicker, backEl) {
    const s = shown, n = Math.max(1, Math.min(s.n, MAX)), my = ++scanId, H = makeH(spec_of(s)), o = OUT[k], t0 = performance.now();
    if (!(lastCounts[k] > 0)) { toast(k === WIN ? "No war in this run ended in a win" : "No war in this run ended this way"); return; }
    const back = keep && reader ? reader.back : backEl || document.activeElement; let i = from === undefined ? 0 : from % n, seen = 0, slow = false;
    const step = () => {
      if (my !== scanId) return; const t1 = performance.now();
      while (seen < n && performance.now() - t1 < 40) { if (i >= n) i = 0; const r = runOne(s, i, H); if (r.outcome === k) { if (slow) $("toast").className = ""; reader = { mode: "ending", key: k, kicker, back }; $("drMore").textContent = k === WIN && kicker ? "Show another random win" : "Another war like this"; fillWar(i, r, kicker || o.say, s); openDrawer(back); return; } i++; seen++; }
      if (seen >= n) { toast("None found in this run"); return; }
      if (!slow && performance.now() - t0 > 300) { slow = true; toast("Looking through the run…", 60000); }
      setTimeout(step, 0);
    };
    step();
  }
  function randomWin() { if (!(lastCounts[WIN] > 0)) { toast("No war in the run on screen ended in a win. Try other settings."); return; } readEnding(WIN, Math.floor(Math.random() * shown.n), false, "A random win", $("warWin")); }
  function warLink(s, i) { const q = new URLSearchParams({ col: s.col, seed: s.seed, n: s.n || wars, s: s.start }); if (s.fix) q.set("w", s.fix); if (!noOver(s)) q.set("o", JSON.stringify(s.over)); if (i !== undefined) q.set("war", i + 1); return location.href.split("#")[0].split("?")[0] + "?" + q + (i !== undefined ? "#one" : "#odds"); }
  async function copy(url, what) { try { await navigator.clipboard.writeText(url); toast(what + " copied"); } catch (e) { prompt("Copy this link:", url); } }

  /* ---------- tabs, links, the back button ---------- */
  const TAB_OF = R.tabOf, TITLES = { sim: "Simulator", how: "How it works", every: "Every odd", sources: "Sources" }; let tabNow = "";
  function ink() { const a = document.querySelector(".tabs a.on"), i = $("ink"); if (!a) return; i.style.width = a.offsetWidth + "px"; i.style.transform = "translateX(" + a.offsetLeft + "px)"; }
  function setTab(t) { if (t === tabNow) return false; tabNow = t; document.querySelectorAll(".tabp").forEach(p => { p.hidden = p.dataset.tab !== t; }); document.querySelectorAll(".tabs a").forEach(a => { const on = a.getAttribute("href") === "#" + t; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }); document.documentElement.dataset.tab = t; document.title = TITLES[t] + " · " + R.short + " · RealityMargin"; ink(); return true; }
  function route(first) {
    closeDrawer();
    let raw = ""; try { raw = decodeURIComponent(location.hash.slice(1)); } catch (e) { }
    const el = raw ? $(raw) : null, page = el && el.closest ? el.closest(".tabp") : null;   /* a tab, a fold, one odd (k-, m-, e-): anything with an id inside a tab */
    const id = TAB_OF[raw] || page ? raw : "sim", tab = TAB_OF[id] || page.dataset.tab, moved = setTab(tab), t = id !== tab ? $(id) : null;
    if (t) { let opened = false; for (let e = t; e; e = e.parentElement) if (e.tagName === "DETAILS" && !e.open) { e.open = true; opened = true; } setTimeout(() => goTo(t), opened && !reduced ? 280 : 30); }
    else if (moved && !first) scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------- search every odd ---------- */
  function searchOdds() {
    const q = $("find").value.trim().toLowerCase(), folds = document.querySelectorAll("#srcFolds details.fold"); let total = 0;
    folds.forEach(f => { const items = f.querySelectorAll("tr[id], .in li"); let n = 0; items.forEach(it => { const m = !q || it.textContent.toLowerCase().includes(q); it.hidden = !m; if (m) n++; }); total += n; f.hidden = !!q && !n; f.open = !!q && n > 0; const c = f.querySelector("summary small"); if (c) c.textContent = q ? n + (n === 1 ? " match" : " matches") : c.dataset.h; });
    $("findN").textContent = q ? total + (total === 1 ? " match" : " matches") : ""; $("findNone").hidden = !q || total > 0;
  }

  /* ---------- wiring ---------- */
  const runOrStop = () => { if (realJob()) { finish(true); return; } job = null; toResults(); begin(); };
  for (const id of ["run", "dockRun", "ansRun"]) $(id).onclick = runOrStop;
  $("heroRun").onclick = () => { if (realJob()) return; label = ""; $("oddFind").value = ""; filterOdds(); loadSettings(FILM.set); label = R.filmName; toResults(); begin(); };
  $("reset").onclick = () => { if (!realJob()) { reset(); toast("Back to the film's settings"); } };
  $("again").onclick = () => openFold("odds"); $("startEdit").onclick = () => openFold("start");
  document.querySelectorAll('input[name="col"]').forEach(r => r.onchange = () => { if (!r.checked) return; col = r.value; over = {}; allOdds(); changed("odds"); });
  $("seed").onchange = () => { const v = readNum($("seed").value); if (isNaN(v) || v < 0 || v > MAXSEED || v !== Math.floor(v)) { toast("A seed is a whole number from 0 to 4,294,967,295"); $("seed").value = seed; return; } if (v === seed) { $("seed").value = seed; return; } seed = v; $("seed").value = seed; changed("seed"); };
  $("seed").onkeydown = e => { if (e.key === "Enter") $("seed").blur(); };
  $("nw").oninput = () => { const n = warsFrom($("nw").value); if (n !== null) { wars = n; warsUI(); } };
  $("nw").onchange = () => { const n = warsFrom($("nw").value); if (n === null) { toast("Type a number of wars"); $("nw").value = fmt(wars); warsUI(); return; } if (n !== readNum($("nw").value)) toast(n === MAX ? "Capped at " + fmt(MAX) : n === MIN ? "At least " + fmt(MIN) : "Rounded to " + fmt(n)); setWars(n); };
  $("nw").onkeydown = e => { if (e.key === "Enter" && !realJob()) { const n = warsFrom($("nw").value); if (n !== null) { setWars(n); runOrStop(); } } };
  document.querySelectorAll(".chip[data-n]").forEach(c => c.onclick = () => setWars(+c.dataset.n));
  $("warGo").onclick = oneWar; $("warWin").onclick = randomWin; $("warRand").onclick = randomWar; $("warN").onkeydown = e => { if (e.key === "Enter") oneWar(); };
  $("drClose").onclick = closeDrawer; $("drShade").onclick = closeDrawer;
  $("drMore").onclick = () => { if (!reader) return; if (reader.mode === "ending") { if (reader.kicker) readEnding(reader.key, Math.floor(Math.random() * shown.n), true, reader.kicker); else readEnding(reader.key, reader.i + 1, true); } else if (reader.mode === "number") { const i = reader.i + 1; if (i >= MAX) return; $("warN").value = fmt(i + 1); fillWar(i, runOne(reader.set, i), "One war", reader.set); } else randomWar(); };
  $("drLink").onclick = () => { if (reader && reader.set) copy(warLink(reader.set, reader.i), "A link to this war"); };
  addEventListener("keydown", e => { if (e.key === "Escape" && !$("drawer").hidden) closeDrawer(); if (e.key === "Tab" && !$("drawer").hidden) { const f = [...$("drawer").querySelectorAll("button:not([tabindex='-1']), summary")].filter(b => b.offsetParent), a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } });
  $("share").onclick = () => copy(warLink({ ...cur() }), "A link to these settings");
  $("oddFind").oninput = filterOdds;
  $("find").oninput = searchOdds; document.querySelectorAll("#srcFolds summary small").forEach(c => { c.dataset.h = c.textContent; });
  addEventListener("hashchange", () => route(false)); addEventListener("resize", ink); if (document.fonts && document.fonts.ready) document.fonts.ready.then(ink);
  document.addEventListener("click", e => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (a && a.getAttribute("href") === location.hash) route(false); }); /* a link to where you already are still takes you there */
  document.querySelectorAll('a[href^="http"]').forEach(a => { a.target = "_blank"; a.rel = "noopener"; });
  /* "Run it" beside each famous what-if: the simulator, that what-if, at once */
  document.querySelectorAll("[data-run]").forEach(b => b.onclick = () => { const id = b.dataset.run, p = [...document.querySelectorAll(".preset")].find(x => x.dataset.id === id); if (!p) return; if (realJob()) { toast("Stop the run first, or wait for it to finish"); return; } location.hash = "#whatif"; setTimeout(() => p.click(), 60); });

  /* a shared link brings its settings, and says so if it can't */
  let shared = null, openWar = null;
  if (qs.has("col") || qs.has("s") || qs.has("war")) {
    try {
      const c0 = qs.get("col") || "mid", s0 = qs.get("s") || FILM.set.start, w0 = qs.get("w") || "", o = JSON.parse(qs.get("o") || "{}");
      if (!["low", "mid", "high"].includes(c0) || !START[s0] || (w0 && !WI[w0]) || !o || typeof o !== "object" || Array.isArray(o)) throw 0;
      const clean = {}; for (const k in o) if (k in ODDS && typeof o[k] === "number" && isFinite(o[k]) && o[k] >= 0) { const v = Math.min(R.odds[k].max, Math.max(R.odds[k].min, o[k])); if (Math.abs(v - oddsFor(c0)[k]) > 1e-12) clean[k] = v; }
      const sd = readNum(qs.get("seed") || R.seed), n0 = warsFrom(qs.get("n") || "") || FILM.set.n;
      col = c0; start = s0; whatif = w0; over = clean; seed = isNaN(sd) || sd < 0 || sd > MAXSEED ? R.seed : Math.floor(sd); wars = n0; shared = "ok";
      if (qs.has("war")) { const v = readNum(qs.get("war")); if (!isNaN(v) && v >= 1 && v <= MAX) openWar = Math.round(v); }
    } catch (e) { shared = "bad"; }
  }
  seg("col", col); $("seed").value = seed; setWars(wars); startList(); presets(); filmWars(); allOdds(); setUI(); warNote(); $("warN").value = fmt(R.defaultWar);
  { const s = cur(), r = refFor(s); if (shared === "ok" && !exactly(s, r)) { showRef(FILM); begin({ preview: true, note: "Shared settings loaded." }); } else showRef(shared === "ok" ? r : FILM); }
  if (shared === "bad") $("status").textContent = "That link's settings couldn't be read, so these are the film's numbers.";
  else if (shared === "ok" && Object.keys(over).length) $("odds").open = true;
  route(true);
  if (openWar) { const s = cur(); $("warN").value = fmt(openWar); reader = { mode: "number" }; $("drMore").textContent = "Show the next war"; fillWar(openWar - 1, runOne(s, openWar - 1), "One war", s); $("one").open = true; openDrawer($("warGo")); }
  requestAnimationFrame(() => document.documentElement.classList.add("ready"));
})();
