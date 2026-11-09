// The locked model for the browser: real_path.mjs, then sim.mjs, with the word "export" and sim.mjs's one import line dropped, nothing else changed. Built by tools/build_page_jp.mjs.
// sim.mjs sha256 e71972d78299af52cb607573b6312d368f3a6a7c027085e80d829ed80949f8a1, real_path.mjs sha256 6e783efaa2ec5d4f6472e51c66b9628cc3e99a94ced68a65e2adfde926e03879
// The real chain of events, 1941-1945, as the model's turning points (model v4: q = 0 is July-September 1941, quarter q covers year 1941.5 + q/4).
// realUntil(q) restarts the model from the real situation at quarter q: before it every roll goes the way it really went; from q on the war runs free.
// The dates of V-E Day (1945.35) and the bomb (1945.6) are the model's own draws; on the real path they fall in their real quarters (code review r1 #6: no fudged dates).
// Sources: 00_research/SOURCES.md (A-F).
const ADV = { 10: 1, 11: 1, 12: 1, 13: 1, 15: 1, 16: 1 };   // the quarters the US advance moved a stage: the Marshalls (Jan-Mar 1944), Hollandia (Apr-Jun 1944), the Marianas (Jul-Sep 1944), Leyte (Oct-Dec 1944), Iwo Jima and Okinawa (Apr-Jun 1945 with Iwo in Feb-Mar), the home islands in range (Jul 1945)
const REALQ = {
  strikeNorth: () => false,                                   // Kantokuen called off, 9 Aug 1941
  modusVivendi: () => false, backDown: () => false, southOnly: () => false, philNoPearl: () => false, hitlerDeclares: () => true,   // the Hull note, 26 Nov; the 1 Dec Imperial Conference; Germany declares war, 11 Dec 1941
  usWarned: () => false, enterpriseIn: () => false, lexingtonIn: () => false, thirdStrike: () => false, tanksHit: () => false,   // 7 Dec 1941: the carriers at sea; no third strike
  philTaken: q => q >= 3, conquestFast: q => q >= 2,          // Singapore 15 Feb, Java 9 Mar, Corregidor 6 May 1942
  indianOcean: () => false,                                   // the April 1942 raid on Ceylon was a raid, not a turn west
  moresbyPlan: () => true, codebreak: () => true, win_coral: () => 'draw', moresbyGo: () => false, coralShokaku: () => true,   // the Coral Sea, 4-8 May 1942: Lexington lost, Shokaku damaged, Port Moresby not taken
  midwayPlan: () => true, splitForces: () => true, codebreak2: () => true, yorktownReady: () => true, scoutLate: () => true, win_midway: () => 'U',   // Midway, 4 June 1942
  usFleetSails: () => false, hawaiiTry: () => false, hawaiiHold: () => false, operationFS: () => false,
  win_guadalcanal: () => 'U', guadalStay: () => true,         // Guadalcanal, Aug 1942 - Feb 1943
  pilotPipeline: () => false, carriersNotYamato: () => false, subsOnShipping: () => false, convoyEarly: () => false, chinaPeace: () => false, tankersEarly: () => false,
  uncond: () => true,                                         // Casablanca, 24 Jan 1943
  imphal: () => true, win_imphal: () => 'U',                  // Imphal-Kohima, Mar-Jul 1944
  advance: q => !!ADV[q], advance2: () => false, win_philsea: () => 'U', win_leyte: () => 'U',   // the Philippine Sea (19-20 Jun 1944); Leyte Gulf (23-26 Oct 1944)
  usTalks: () => false, blockadeSurrender: () => false, invadeChoice: () => false, invasionSurrender: () => false,
  sovietEnter: () => true, surrender: q => q >= 16,           // the Soviets, 8-9 Aug 1945; the surrender, 15 Aug 1945
};
const MILESTONES = [
  [0, 'July 1941: north or south'], [1, 'November 1941: the decision'], [2, 'after Pearl Harbor'], [3, 'spring 1942: the south taken'], [4, 'after Midway'], [6, 'after Guadalcanal'],
  [11, 'after the Marshalls'], [13, 'after the Marianas'], [14, 'after Leyte'], [16, 'after Okinawa'], [17, 'August 1945'] ];
function realUntil(qT, extra = {}) { return { __real: { until: qT }, ...extra }; }

// RealityMargin · "I Ran 1,000,000 Simulations to See if Japan Could Win WW2". The Pacific war model, v5 (9 Nov 2026), built to _system/SIM_STANDARD.md.
// v5 answers review rounds 3 and 4 (_work/REVIEW_history_r3.md, r4; REVIEW_code_r3.md, r4) on top of rounds 1-2. Earlier versions: _work/sim_v1/v2/v3/v4_backup.mjs.
// Sources: 00_research/SOURCES.md, parts A (1941), B (Midway-1944, production), C (will, the end), D (the battles, official histories), E (the two war economies), F (Strike North, the Axis,
// Japan's choices, the other Allies). INPUTS.md is generated from this file. One war = quarter-year turns from July 1941 (q = 0) to the end of 1947.
// An event dated inside a quarter happens in that quarter (inQ: date < start of quarter + 0.25). Nothing is forced: every decision reads the state of that war.
// Japan's leadership has one appetite for risk per war ("temper"): it shifts Japan's strategic choices together, never luck in the field.
// Battles are events resolved from the forces on each side, intelligence and luck; their losses carry through the economy, which replaces them at its own rate.
// The dice (common random numbers): a one-off event is keyed by its name and how many times it has been rolled, a per-quarter hazard by its name and quarter, so changing one event
// never reshuffles the luck of the others, even when it moves the date on which they are rolled (code review r2 M1).

const O_WIN = 'JAPAN WINS', O_EMPIRE = 'JAPAN KEEPS ITS PRE-WAR EMPIRE', O_SURR = 'JAPAN SURRENDERS', O_INV = 'JAPAN IS INVADED', O_NORTH = 'A DRAWN WAR WITH THE SOVIETS', O_NOWAR = 'NO WAR', O_STILL = 'STILL AT WAR';
const OUTCOMES = [O_WIN, O_EMPIRE, O_SURR, O_INV, O_NORTH, O_NOWAR, O_STILL];
// JAPAN WINS: a peace that every great power fighting Japan signs, with Japan keeping what it took in 1941-42 (the southern resource area, or the Soviet Far East) and its pre-war empire.
//   The sources' own test (C l.778): US will collapsing is not enough; Britain must be knocked down too. So a talk becomes a win only if Europe is lost, India and Ceylon are threatened,
//   or Hawaii is held; otherwise the conquests go back (history review r2 #2).
// JAPAN KEEPS ITS EMPIRE: a peace after a war with the US or Britain that hands back the 1941-42 conquests but leaves Korea, Formosa, Manchukuo and the imperial government.
// JAPAN SURRENDERS: it loses the empire with no landing in the home islands (15 Aug 1945). JAPAN IS INVADED: it surrenders only after landings in Japan.
// A DRAWN WAR WITH THE SOVIETS: Japan struck north, never fought the US or Britain, and made peace with the USSR on about the 1941 lines.
// NO WAR: Japan backs down in 1941 (the embargo lifted on US terms) before fighting anyone. STILL AT WAR: no verdict by the end of 1947.
const Q0 = 1941.5, QN = 26;
const yearOf = q => Q0 + q / 4;
const inQ = (date, y) => date < y + 0.25;

// odds: [against Japan, middle (headline), for Japan]
const ODDS = {
  // July-December 1941 (A §1-2; F §1-2)
  strikeNorth: [0.02, 0.04, 0.08],       // Japan attacks the USSR in summer 1941: the 2 July decision was conditional on the German-Soviet war "turning in favor of Japan" (JM 147); Kantokuen doubled the Kwantung Army to 700,000 (JM 77) and was called off on 9 Aug (F §1). ×5 when the Soviet front is collapsing in 1941
  northEmbargo: [0.9, 0.85, 0.7],        // ...and the US freezes Japan's assets and oil anyway: the real freeze of 26 Jul 1941 answered the move into southern Indochina, made before a strike north could start (F §1; A §1)
  northWin: [0.1, 0.2, 0.3],             // history review r3 M2: Soviet archives give 1,161,202 men in the Far East on 20 Dec 1941 and ~3,190 tanks (Glantz), not G-2's 682,000; Japan had ammunition for 16 divisions and never met its own 2:1 condition (Coox). Old note:            // the Kwantung Army's autumn 1941 offensive takes the Maritime Province and Vladivostok, at even strength: US G-2 counted 684,000 Japanese v 682,000 Soviet and said Japan would attack only at 2:1 (F §1; Khalkhin Gol 1939). judgment
  sovietCounter: [0.25, 0.15, 0.08],     // per quarter from 1942 while Germany is not winning: a Soviet counter-offensive throws Japan back to the 1941 lines (Khalkhin Gol, Aug 1939) (F §1). judgment
  farEastFalls: [0.4, 0.6, 0.8],         // one roll, once the USSR is beaten in Europe and Japan holds Vladivostok (history review r3 M2): its Far East gives up the Maritime Province for good rather than fight on alone. judgment (F §1: Far East strength still rose to ~1.2M in 1941-42)
  modusVivendi: [0.12, 0.08, 0.04],      // the US keeps the three-month modus vivendi of 25-26 Nov 1941 instead of the Hull note (dropped under allied pressure; A §1) and Japan postpones a quarter (A fork 1). judgment
  backDown: [0.03, 0.03, 0.03],          // Japan accepts enough of the Hull note to lift the embargo: both sides' minimum terms on China never overlapped in any document read (A fork 1). ×3 after a modus vivendi
  southOnly: [0.1, 0.15, 0.25],          // Japan strikes only British and Dutch territory (the Army's plan): the Navy won the argument, US bombers in the Philippines on the flank (JM 150 p.11; A fork 2-3)
  philNoPearl: [0.03, 0.05, 0.1],        // ...or the Philippines and the south but not Pearl Harbor: the Navy's pre-1941 plan, wait for the US fleet and fight the decisive battle near home (Kantai Kessen) (A fork 2). judgment
  usEntersNow: [0.8, 0.6, 0.4],          // with no attack on Americans, the US goes to war within the quarter: FDR to Halifax 1 Dec 1941 "we should obviously all be together" (DFAT5); against: Morton "might not have gone to war", Hull to Stark (A)
  usEntersLater: [0.25, 0.15, 0.08],     // per quarter after that: incidents, the Philippines on the flank, Britain's pressure; ×2 once Germany is beaten (judgment). Opinion "hardened sharply after July 1941" (A l.106)
  hitlerDeclares: [0.95, 0.9, 0.8],      // Germany declares war on the US: Germany promised twice (April and 28 Nov 1941) to join; the 11 Dec declaration cites the Atlantic, not Japan (Nuremberg judgment; F §2). If not: the US fights Japan first for a year
  // Pearl Harbor (A §3; D)
  enterpriseIn: [0.4, 0.3, 0.2],         // Enterprise at her berth that morning: due on the 7th, delayed by weather (A §3)
  lexingtonIn: [0.2, 0.12, 0.06],        // Lexington at her berth: she sailed on the 5th to ferry planes to Midway (A §3)
  usWarned: [0.1, 0.05, 0.03],           // the Opana radar warning is acted on and the fleet sorties: Nimitz's 1965 letter says a fleet caught at sea would have been sunk in deep water (A §3; Wallin)
  thirdStrike: [0.1, 0.15, 0.3],         // Nagumo launches a third strike at the tank farm and the yards: he did not (two-thirds of losses in the second wave, carriers unlocated, night recovery, fuel) (A fork 5)
  tanksHit: [0.5, 0.65, 0.8],            // ...and burns most of the 4.0-4.5 million barrels in unprotected tanks (A §3; Wallin)
  // 1942 (A §4; B §1-2; D)
  philTaken: [0.75, 0.85, 0.92],         // per quarter, with the US at war: the Philippines fall (Bataan 9 Apr, Corregidor 6 May 1942: ~149 days against a 53-day plan); until then the US bombers there cut Japan's oil imports (A fork 6; JM 150)
  conquestFast: [0.8, 0.88, 0.95],       // per quarter, the rest of the south falls: Malaya ~69 days, the Indies ~91 (A fork 6)
  indianOcean: [0.03, 0.05, 0.1],        // in spring 1942 the carriers go west instead (Ceylon, the Eastern Fleet, a link-up with Germany): the navy was "apathetic" about German requests (Hata); Madagascar never considered (British official history; F §3)
  moresbyPlan: [0.85, 0.8, 0.7],         // Japan sends the Port Moresby invasion (the Coral Sea, May 1942) (B §1; D)
  moresbyGo: [0.4, 0.55, 0.7],           // after winning the carrier battle, the invasion force goes on: Inoue turned it back on 8 May 1942 with Shoho sunk and Shokaku hit (D). judgment
  coralShokaku: [0.8, 0.7, 0.5],         // after the Coral Sea, Shokaku and Zuikaku miss Midway (damage and aircrew), as they did (B fork 2)
  midwayPlan: [0.85, 0.75, 0.6],         // Yamamoto attacks Midway in mid-1942, approved after the Doolittle raid of 18 Apr 1942 (A fork 8)
  splitForces: [0.9, 0.8, 0.6],          // ...with the Aleutians diversion and the forces scattered, as he did (B fork 2; Parshall)
  codebreak: [0.92, 0.85, 0.7],          // per major Japanese operation in 1942: the US reads it in time (HYPO; the codebook change slipped to 24 May) (B fork 1; the NWC calls it decisive, D)
  yorktownReady: [0.9, 0.8, 0.6],        // Yorktown patched in about 72 hours after the Coral Sea (B fork 2)
  scoutLate: [0.7, 0.6, 0.45],           // Japan's search finds the US carriers late (the Tone No. 4 plane launched 30 minutes late; the NWC: Nagumo's re-arming order "in a large part due to the element of chance") (B fork 3; D)
  usFleetSails: [0.45, 0.3, 0.15],       // without Pearl Harbor, the US fleet sails west in 1942 into the decisive battle Japan planned (WPL-46 had it raiding the Marshalls, not relieving the Philippines) (A fork 2). judgment
  operationFS: [0.4, 0.5, 0.65],         // with the initiative, Japan goes on to Fiji, Samoa and New Caledonia to cut Australia off (Operation FS) (B fork 4)
  hawaiiTry: [0.08, 0.12, 0.2],          // after big wins, Japan tries for Hawaii: a January 1942 staff study said it could be taken but not supplied (B fork 4)
  hawaiiHold: [0.02, 0.04, 0.08],        // ...and takes and holds it: Oahu's garrison was 100,000-150,000 against the 45,000 Japan thought it needed (B fork 4 [X])
  guadalStay: [0.85, 0.75, 0.6],         // the US holds on at Guadalcanal through a lost quarter (it did, through Savo, the Tokyo Express and the loss of Wasp and Hornet) (B §2; D)
  // Japan's slow choices (B §3-4; E; F §3)
  convoyEarly: [0.01, 0.02, 0.05],       // per quarter to 1944: Japan organises real convoys (USSBS: "belated", "poorly planned"; Grand Escort Command Nov 1943) (B fork 8)
  pilotPipeline: [0.08, 0.15, 0.3],      // Japan expands pilot training in 1942: about 100 naval pilots a year in the 1930s (F §3); training hours fell from 500-650 to about 100 (USSBS; B fork 6)
  carriersNotYamato: [0.05, 0.1, 0.2],   // Japan builds carriers instead of more battleships: Shinano was converted only after Midway (B §3). judgment
  subsOnShipping: [0.04, 0.08, 0.15],    // Japan's submarines hunt merchant ships instead of warships: only 40-45 operational boats, built to support the fleet (Miwa, USSBS interrogation; F §3). judgment
  chinaPeace: [0.002, 0.005, 0.01],      // per quarter in 1942-43: a peace with Chiang that frees much of the army in China: Tojo brought down a cabinet rather than withdraw; the US public put it at 7-9% (F §3; C §5)
  // the US and Britain (B §4; C; F §4)
  tankersEarly: [0.4, 0.25, 0.12],       // the submarines go after tankers before 1944: USSBS Rpt 54, "acute at the end of 1943 rather than a year later" (B fork 7)
  usTalks: [0, 0.0008, 0.002],           // per quarter of strain after Americans were attacked, Washington talks: polls 88% for fighting it out; ~5-10% ever backed a peace letting Japan keep conquests (Cantril; C §2a). The low end is zero: no source shows an America that quits (history review r2 #1)
  usTalksCold: [0.001, 0.005, 0.012],    // per quarter of strain in a war America entered without being attacked; zero once the US is clearly winning: judgment from A polls (Feb 1941 39% would risk war; "two-thirds or more" after July 1941)
  jointPeace: [0.4, 0.55, 0.7],          // Britain and the Netherlands sign the peace Washington talks (otherwise America leaves and Britain fights on, or the talks fail). judgment
  japanAccepts: [0.5, 0.7, 0.85],        // Japan accepts a peace that hands back its conquests, bound by the Axis no-separate-peace agreement of 11 Dec 1941 (F §2; C l.1847). judgment
  uncond: [0.95, 0.88, 0.7],             // the US declares unconditional surrender as its aim (Casablanca, 24 Jan 1943); every poll after it shows 78-84% for fighting on (C §2c)
  invadeChoice: [0.7, 0.55, 0.4],        // with the home islands in range and no surrender, the US lands rather than waits on the blockade (58% preferred blockade in June 1945; the JCS chose Olympic) (C §2-4)
  sovietEnter: [0.95, 0.9, 0.75],        // the Soviets enter two to three months after Germany falls (Yalta; 8-9 Aug 1945) (C §4)
  surrBombs: [0.55, 0.4, 0.25],          // per quarter: Japan's leaders accept surrender once atomic bombs are falling, Soviets or not (Frank: the bombs decisive) (C §4). judgment
  surrSoviets: [0.5, 0.35, 0.2],         // per quarter: ...once the Soviets are in, bombs or not (Hasegawa: Soviet entry decisive) (C §4). judgment
  surrBoth: [0.9, 0.8, 0.6],             // per quarter with both: the Big Six split 3-3 and the emperor broke the tie (USSBS; C §4)
  blockadeSurrender: [0.15, 0.06, 0.03], // per quarter from the B-29 bases on, scaled by hunger and collapse: USSBS, surrender before 31 Dec 1945 even without the bombs or the Soviets (the high end); contested by Frank (C §4d; E §D; history review r2)
  invasionSurrender: [0.6, 0.45, 0.3],   // per quarter once landings begin in the home islands (Olympic, planned for 1 Nov 1945) (C §4b-c)
  ukRetake: [0.08, 0.05, 0.03],          // per quarter, without America at war and after Germany is beaten: Britain retakes Malaya and the Indies. Burma took 18 months and 450,000-620,000 men against a starving army (Kirby III pp.319-321, 372); the BPF had 4 fleet carriers to the US 17 at Okinawa (Kirby V p.108). judgment (history review r3 M4)
  ukPeace: [0.002, 0.005, 0.012],        // per quarter, without America at war: Britain and the Netherlands accept the loss in the East: Britain never negotiated with Germany either; ×4 if Europe is lost or India is threatened. judgment
  imphal: [0.92, 0.85, 0.75],            // history review r3 S1. Britain wins on the Indian border when Japan attacks India (Imphal-Kohima 1944: Japan lost 53,505 of 84,280; British official history, F §4)
  // Europe (C §1a, §3)
  europeLost: [0.007, 0.014, 0.03],      // Germany beats Britain or the USSR: Japan's own 15 Nov 1941 plan relied on it (C §1a). Middle from our own WW2 simulation (7,188 of 500,000 wars), not from history: said on the page
  euUSSR: [0.75, 0.85, 0.9],             // given Germany wins in Europe from the July 1941 situation, the USSR is beaten (Moscow, an armistice): the winning paths of our own WW2 simulation run through a Soviet armistice in 1942-43 (RESULTS_v7, top 12 paths: 10 of 12). judgment (history review r3 S2)
  euBritain: [0.4, 0.5, 0.6],            // ...and Britain makes peace: 89.6% of that simulation's German wins have Britain out, but most of those via a 1940 peace that the July 1941 start excludes. judgment (history review r3 S2)
  europeLostTalks: [2, 5, 10],           // ×: how much more often Washington talks once Europe is lost: planners in 1942 chose Africa, not the Pacific, if the USSR fell; FDR vetoed a Pacific pivot (C §3). judgment
  temperSd: [0.4, 0.5, 0.6],             // spread of Japan's leadership's appetite for risk between wars. judgment
};
const SETS = { low: 0, mid: 1, high: 2 };
function oddsFor(set) { const i = SETS[set] ?? 1, o = {}; for (const [k, v] of Object.entries(ODDS)) o[k] = v[i]; return o; }

// ---------- the economy (SIM_STANDARD §1): production from each side's base and imports; battles destroy, production replaces. Every field is read by the model.
const ECONOMY = {
  usCarriers: { 1942: 1.5, 1943: 10.5, 1944: 7, 1945: 3 },   // production: US fleet-carrier equivalents per year at war: Essex 1/6/7/3 + Independence 9 (1943) at half + Atlantic transfers 1942 (B §3b; NHHC force levels, D: 4 at end-1942, 19 end-1943, 25 end-1944)
  usNeutral: 0.6,        // production: share of that rate a neutral US still builds (the Two-Ocean Navy Act of 19 Jul 1940 had the carriers laid down). judgment
  usScale: 1,            // production: scale on all US production (the results test 0.5 and 0.75). judgment
  jCarriers: { 1942: 1.5, 1943: 1, 1944: 1.5, 1945: 0.5 },   // production: Japan's carriers that fought, in fleet equivalents, on the real path: USSBS counts six small carriers in 1942 and four in 1944 (B §3), but escort carriers ferried aircraft, Shinano was sunk before she operated and the Unryu class lacked air groups; ~6 fleet equivalents at the Philippine Sea (D). judgment
  jScale: 1,             // production: scale on Japan's output (the results test 1.5 and 2). judgment
  jAircraft: { 1941: 5088, 1942: 8861, 1943: 16693, 1944: 28180, 1945: 17706 },   // production: Japan's aircraft per year on the real path (USSBS Table I-I; 1945 scaled from 7.5 months) (B §3)
  usAircraftRatio: 4.5,  // production: US aircraft per Japanese, 1941-44, all theatres (USSBS Table I-II; B §3); about 4:1 in combat types by year (E)
  outReal: { 1942: 0.3, 1943: 0.55, 1944: 0.95, 1945: 0.55 },   // production (display only, the trace column): Japan's war output on the real path, 1 = the Sep-Nov 1944 peak (aircraft 642/month early 1942 → 2,573 Sep 1944 → 1,131 Jul 1945) (USSBS; E §C)
  shipReal: { 1941: 6.0, 1942: 5.95, 1943: 5.4, 1944: 3.9, 1945: 2.2 },   // resources: Japan's merchant tonnage on the real path (all ships, mid-year), millions of tons (USSBS Rpt 54 App. A-B; E §A)
  oilReal: { 1941: 43, 1942: 33, 1943: 22, 1944: 12, 1945: 4 },   // resources: Japan's oil stocks on the real path (mid-year), for the "economy set to the real path" test: 42.7 Dec 1941, ~13.8 Apr 1944, 6.4 Dec 1944, 2.8 Jul 1945 (USSBS Rpt 53; E), interpolated. judgment between the points
  pacificShare: { 1942: 0.45, 1943: 0.5, 1944: 0.5, 1945: 0.8 },   // resources: share of US ground and air power facing Japan: Dec 1943 1.88M men v 1.81M (Matloff; C §3); after V-E Day nearly all. Applied once, to ground and air, not carriers
  ship0: 6.0,            // resources: Japanese merchant tonnage Dec 1941, millions of tons ("some 6,000,000 tons", USSBS Summary; B §4)
  captured: 0.3,         // replace: merchant tonnage captured or salvaged in the south per quarter in the first half year of the conquest (4.1M built, captured or requisitioned over the war) (USSBS Summary; E)
  shipBuild: { 1942: 0.065, 1943: 0.19, 1944: 0.425, 1945: 0.14 },   // replace: merchant tonnage built per quarter on the real path: 0.26/0.77/1.70/0.56M a year (USSBS; E)
  subs: { 1942: 0.025, 1943: 0.05, 1944: 0.14, 1945: 0.1 },   // blockade: share of tonnage sunk per quarter by US submarines, by year of the US war (54.7% of all sinkings; tons per patrol-day doubled after the torpedo fix) (JANAC; E §A)
  carrierAir: { 1942: 0.01, 1943: 0.02, 1944: 0.08, 1945: 0.12 },   // blockade: share sunk per quarter by carrier and land-based aircraft, only while the US advance is moving (16.3% carrier aircraft, ~10% land-based) (JANAC; E)
  otherSink: { 1942: 0.01, 1943: 0.015, 1944: 0.03, 1945: 0.03 },   // blockade: everything else (surface ships, marine casualties), so the totals match JANAC: 1.06/1.82/3.89/1.78M (E). judgment of the split
  mines: 0.06,           // blockade: share sunk per quarter by B-29 mining once the Marianas are held, from 27 Mar 1945 (Operation Starvation; 9.3% of all sinkings) (JANAC; E)
  oil0: 43,              // resources: oil stocks Dec 1941, millions of barrels (USSBS Summary p.14; A §1a gives 43-61)
  oilUse: 5.9,           // resources: burned per quarter at full operations, tuned so the real path runs 42.7 → ~13 by Apr 1944 → ~6.4 by Dec 1944 → ~3 by mid-1945 (USSBS Rpt 53 App. A-4; E); much less once the fleet is idle for lack of fuel
  oilImp: 3.6,           // resources: oil reaching Japan per quarter at the peak: crude plus products 10.5M (FY1942), 14.5M (FY1943), 5.0M (FY1944) barrels (USSBS; E)
  tankerFloor: 0.6,      // resources: tankers kept on priority: imports fall with total shipping only below this share of the Dec 1941 fleet (tankers held ~0.8-0.87M t through 1944) (USSBS Rpt 54 App. A; E)
  tankerFall: 1.2,       // blockade: once the submarines target tankers, the share of oil imports lost per year (FY1944 5.0M against FY1943 14.5M; zero by Apr 1945) (USSBS; E)
  bombing: 0.06,         // blockade: share of output lost per quarter of B-29 bombing from the Marianas: bombing added 10-20 points on top of a 40-50% blockade cut, almost all from March 1945 (USSBS; E §D)
  chinaDrain: 0.25,      // resources: share of Japan's output tied down in China (1.1M men deployed; 455,700 dead in China by Japan's own count) (C §5; F §4); a peace with China frees 70% of it. judgment of the share
  northBurn: 6,          // resources: what the rest of Japan burns per quarter under the embargo while fighting in Siberia: FY1941 refined consumption 22.6M bbl, 5.7 a quarter (USSBS Rpt 53 App. C-49; E); Tsuji, the Army runs dry "within 6 to 12 months" (F §1). history review r3 M2
  northOil: 2.2,         // resources: extra oil burned per quarter by a war in Siberia, with no oil to be had there (F §1: nothing found gives Japan usable Siberian oil). judgment
};

// mechanics: judgments, varied in the sensitivity table
const MECH = {
  jCV0: 7.5,         // Japan's six fleet carriers of the Kido Butai, Dec 1941 (A §5), plus the light carriers Ryujo, Zuiho and Shoho at half each (Hosho, a training carrier, not counted) (history review r3 S4; D: about 6 fleet equivalents at the Philippine Sea)
  uCV0: 3,           // US carriers in the Pacific, Dec 1941: Lexington, Saratoga, Enterprise (A §3; NHHC: 7 in commission, D)
  uPil0: 1.0,        // US naval aviators against Japan's in Dec 1941 (Japan's = 1): the 1942 carrier battles were even: Coral Sea 121 v 122 aircraft, losses 81 US v 105+ Japanese (NWC); Eastern Solomons, Japanese air losses 75-90 v US 17-25 (D). judgment, range 0.9-1.1 (history review r3 M3)
  ukCV: 1.5,         // the British Eastern Fleet's carriers in the Indian Ocean, spring 1942, in fleet equivalents (Indomitable, Formidable, Hermes; F §3). judgment
  maxLoss: 4.5,      // the most carriers one side loses in one battle: four at Midway, the worst day for either side (D; JANAC)
  k: 2.2,            // how sharply the air-strength ratio decides a carrier battle. judgment (the 1942 battles were close at near-even strength: Coral Sea 121 v 122 planes, NWC; D)
  ambush: 2.4,       // (history review r3 M3: with it Japan wins about a quarter of the Midways fought) strength multiplier for the side that knows the other's plan and strikes first. judgment (Midway; the NWC calls codebreaking decisive; D)
  midwayLand: 0.4,   // Midway's 110 land-based US aircraft, in carrier equivalents (D: 227 carrier + 110 island planes v 234). judgment of the conversion
  guadJ: 0.48,       // (v5: the light carriers are now in the total, so the share is lower for the same force) the share of Japan's carrier strength that fights at Guadalcanal: piecemeal reinforcement over 560 miles from Rabaul (D; Frank via B §2). judgment
  guadAir: 1.0,      // weight of US land-based air at Guadalcanal (Henderson Field, radar, the coastwatchers) (D). judgment
  airW: 0.3,         // weight of land-based air (from aircraft production, pilots binding) beside carriers in the advance. judgment
  advK: 0.12,        // the US advance: chance of taking the next stage per quarter at even strength, tuned so the real path's stages fall within about a quarter of the real dates (D; B). judgment, calibrated
  advExp: 1.2,       // ...and how steeply it rises with the strength ratio. judgment, calibrated with advK
  relExp: 0.5,       // how Japan's output follows its shipping: the USSBS says the blockade alone would have cut output 40-50% by Aug 1945, with shipping about a third of 1941's (E §D): (1/3)^0.5 ≈ 0.58
  willPearl: 1.0,    // US will after Americans are attacked: the scale (C §2a: only 2% thought the war lost in March 1942)
  willSouth: 0.6,    // US will entering a war with no attack on Americans: judgment from A polls (39% Feb 1941; "two-thirds or more" after July 1941)
  strainInit: 1.5,   // strain on US will in a quarter when Japan holds the initiative. judgment
  strainEdge: 2,     // ...per unit of Japan's carrier edge over the US (capped at 1.5). judgment
  strainDead: 10,    // ...thousands of US dead in a quarter per unit of strain. judgment
  delayTanks: 3,     // quarters of delay to the US offensive if the tank farm burns: Nimitz's "two years" is an upper anchor (Prange); his 1965 letter, "devastatingly worse" (Wallin; A fork 5)
  campaign: [0, 2, 1, 1, 1, 2, 2, 1],   // quarters each stage's campaign takes: Guadalcanal Aug 1942-Feb 1943; the Philippines Oct 1944-Mar 1945; Iwo Jima and Okinawa Feb-Jun 1945 (B; D)
  stageCost: [0, 7, 4, 6, 7, 15, 0, 0],   // US dead (thousands) per stage, Navy included: Guadalcanal, Gilberts-Marshalls, New Guinea, Marianas, Philippines (D; NARA). Iwo-Okinawa is a battle
  baseDead: 1.76,    // US dead per quarter at war outside the named campaigns (submarines, air, the Navy at sea), every quarter at war whoever holds the initiative (code review r3 M2), tuned so the real path totals ~91,000 against a comparable ~90-97,000 (107,000 includes POWs who died in captivity and the Atlantic; NARA RIP 82; B §6; D; history review r3 S5)
  pilotOps: 0.055,   // Japan's pilot quality lost per quarter of active campaign against the US: the Navy lost 70% of its experienced pilots by Nov 1943; the Army air force was at 30% of its experience by Apr 1944 (SRC_E; history reviews r1 #11, r2)
  surrStage: [0, 0, 0, 0, 0.25, 0.5, 0.8, 1],   // how much of the surrender pressure applies at each US stage (the Marianas, the Philippines, Iwo-Okinawa, the home islands in range): Japan does not give up with the US far away (history review r2 #3). judgment
  capAttacked: 8,    // the most strain that counts toward talks after Americans were attacked. Japan's normal 1942 edge already gives about 3-4.5, so a cap of 2 or 4 makes every further Japanese success (Hawaii, a lost fleet) count for nothing; 8 lets them count. No poll covers a held Hawaii or years of stalemate (Cantril stops at 88% for fighting on): range 4-12. judgment (history review r3 M1)
  capCold: 6,        // the same cap in a war America entered without being attacked. judgment
  edgeOff: 0.6,      // Japan's carrier strength as a share of the US's above which it strains Washington. judgment
  edgeMax: 1.5,      // ...and the most that edge can count. judgment
  hawaiiStrain: 4,   // strain while Japan holds Hawaii. judgment (no poll covers it)
  willStrain: 4,     // strain per unit of US casualty weariness below 0.7. judgment
  stalemate: 0.5,    // strain per year of stalemate after 1943 while the US advance has not begun (Mueller, War, Presidents and Public Opinion, 1973: support for Korea fell with casualties; a limited war, not an attacked America). judgment (history review r3 M1b)
  relMax: 1.6,       // the most Japan's output can exceed the real path from its own shipping and the bombing; jScale applies outside it (code review r3 M1). judgment
  sovWeak: 0.6,      // Soviet Far East strength against a 1941 strike north when the Soviet front in Europe is collapsing. judgment (F §1)
};

// ---------- the battles (SIM_STANDARD §1, CHECK S1): every major battle is an event; result from the forces, intelligence and luck; consequences carry through
const BATTLES = [
  { id: 'pearl', name: 'Pearl Harbor', when: 1941.93, decides: 'US carriers and battleships lost; the tank farm; US will' },
  { id: 'siberia', name: 'the Siberian offensive', when: 1941.7, decides: 'only if Japan strikes north: the Maritime Province, and how long Japan can fight there' },
  { id: 'decisive', name: 'the decisive battle at sea', when: 1942.3, decides: 'only if Japan spares Pearl Harbor and the US fleet sails west: the battle Japan planned for' },
  { id: 'ceylon', name: 'the Indian Ocean', when: 1942.3, decides: "only if the carriers go west: the Eastern Fleet, Ceylon, and whether a peace can leave Japan its conquests" },
  { id: 'coral', name: 'the Coral Sea', when: 1942.35, decides: 'Port Moresby; whether Shokaku and Zuikaku reach Midway' },
  { id: 'midway', name: 'Midway', when: 1942.42, decides: 'the carriers on both sides; who holds the initiative for the next year' },
  { id: 'guadalcanal', name: 'Guadalcanal', when: 1942.6, decides: 'the first US offensive; pilots, aircraft and shipping on both sides' },
  { id: 'imphal', name: 'Imphal and Kohima', when: 1944.3, decides: 'Burma, India\'s border and the Hump: a Japanese win shakes Britain (a peace in the East is likelier while America is out); not the war with America' },
  { id: 'philsea', name: 'the Philippine Sea', when: 1944.45, decides: "Japan's carrier air arm; how fast the Marianas fall and the bombing starts" },
  { id: 'leyte', name: 'Leyte Gulf', when: 1944.8, decides: "Japan's surface fleet; the Philippines; the oil route from the south" },
  { id: 'okinawa', name: 'Iwo Jima and Okinawa', when: 1945.2, decides: 'the cost of the last step (the kamikazes); invasion or blockade' },
];
const STAGES = ['the conquests stand', 'Guadalcanal and the Solomons', 'the Gilberts and Marshalls', 'New Guinea', 'the Marianas', 'the Philippines', 'Iwo Jima and Okinawa', 'the home islands in range'];

// ---------- the dice
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function warSeed(base, i) { let h = (base * 2654435761 + i * 40503 + 0x9e3779b9) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0; h ^= h >>> 16; return h >>> 0; }
function keyed(seed0) { return key => { let h = (seed0 ^ 0x811c9dc5) >>> 0; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; }; }
const HAZ = new Set(['invadeChoice', 'sovietCounter', 'philTaken', 'conquestFast', 'convoyEarly', 'chinaPeace', 'usEntersLater', 'ukRetake', 'ukPeace', 'usTalks', 'advance0', 'advance', 'advance2', 'surrender', 'blockadeSurrender', 'invasionSurrender']);   // per-quarter hazards: luck by date
const KEYS = new WeakMap(), keysOf = t => { let k = KEYS.get(t); if (!k) { k = Object.keys(t).map(Number).sort((a, b) => a - b); KEYS.set(t, k); } return k; };
const tbl = (t, y) => { const ks = keysOf(t); let v = t[ks[0]]; for (const k of ks) if (k <= Math.floor(y)) v = t[k]; return v; };
const lerpT = (t, y) => { const ks = keysOf(t), x = y - 0.5; if (x <= ks[0]) return t[ks[0]]; for (let i = 0; i < ks.length - 1; i++) if (x < ks[i + 1]) { const f = (x - ks[i]) / (ks[i + 1] - ks[i]); return t[ks[i]] * (1 - f) + t[ks[i + 1]] * f; } return t[ks[ks.length - 1]]; };

// ---------- one war
function war(P, R, H = {}) {
  const E = ECONOMY, M = MECH, ev = [], path = [], trace = H.__trace ? [] : null, btl = {}, bq = {}, rolls = {}, NTH = {}, U = keyed(Math.floor(R() * 4294967296));
  const S = { q: 0, us: false, usLeft: false, uk: false, attacked: false, pearl: false, plan: '', jCV: M.jCV0, uCV: M.uCV0, jPil: 1, uPil: M.uPil0, oil: E.oil0, ship: E.ship0, stage: 0, south: 0, phil: 1, north: 0,
    delay: 0, dead: 0, deadQ: 0, will: 0, uncond: false, init: 0, bomb: 0, rel: 1, out: 0.3, germany: 1945.35 + 0.25 * (U('germany') - 0.5), atom: H.noBomb ? Infinity : 1945.6 + 0.2 * (U('atom') - 0.5), sovIn: false, embargo: true, china: E.chinaDrain, busy: 0, active: false, usSince: 1941.92, southStart: 1 };
  const yr = () => yearOf(S.q), Y = () => Math.floor(yr());
  const roll = (name, p) => { const nth = NTH[name] = (NTH[name] ?? -1) + 1, u = U(HAZ.has(name) ? name + '@' + S.q : name + '#' + nth); let v;
    if (name in H) v = !!H[name]; else if (H.__real && S.q < H.__real.until && REALQ[name]) v = !!REALQ[name](S.q, S); else v = u < p; rolls[name] = (rolls[name] || false) || v; return v; };
  const mq = {}, say = s => path.push(`${Y()} ${s}`), mark = e => { if (!ev.includes(e)) { ev.push(e); mq[e] = S.q; } };
  const temper = ('temper' in H) ? H.temper : (U('temper') - 0.5) * 2 * P.temperSd;
  const tilt = (p, s = 1) => Math.min(0.99, Math.max(0.0005, p * Math.exp(s * temper)));
  const dies = k => { S.dead += k; S.deadQ += k; };
  const end = (o, why) => { if (why) say(why); return { outcome: o, ev, mq, path, trace, btl, bq, rolls, plan: S.plan, pearl: S.pearl, us: S.us, stage: S.stage, q: S.q, y: yr(), south: S.south, north: S.north, dead: S.dead, init1: S.firstOffensive || null, temper }; };
  const lateSouth = (withSov, y) => { goSouth = true; S.southStart = S.q; S.plan += '+SOUTH LATE'; S.us = true; S.usSince = y; S.uk = true; S.attacked = true; S.will = M.willPearl; S.south = 0.3; if (withSov) { S.sovIn = true; S.sovSince = y; } mark('south, a year late'); say(withSov ? 'out of oil, Japan turns south against a readier America, still fighting the Soviets' : 'out of oil, Japan turns south against a readier America'); S.uCV += 1.5; S.jCV -= 0.5; };
  const pinWin = id => { let r = null; if (('win_' + id) in H) r = H['win_' + id]; else if (H.__real && S.q < H.__real.until && REALQ['win_' + id]) r = REALQ['win_' + id](S.q, S); if (r !== null && !['J', 'U', 'draw'].includes(r)) throw new Error('bad pin for ' + id + ': ' + r); return r; };
  const label = (id, r) => BATTLES.find(b => b.id === id).name + ': ' + (r === 'J' ? 'Japan wins' : r === 'U' ? (['imphal', 'ceylon'].includes(id) ? 'Britain wins' : id === 'siberia' ? 'the Soviets hold' : 'the US wins') : 'a draw');
  const clamp = () => { S.jCV = Math.max(0.2, S.jCV); S.uCV = Math.max(0.2, S.uCV); S.jPil = Math.max(0.25, Math.min(1.2, S.jPil)); S.uPil = Math.max(0.5, Math.min(1.3, S.uPil)); S.will = Math.max(0, Math.min(1.2, S.will)); };
  // a carrier battle: strength = carriers × pilots × multipliers; result 'J' | 'U' | 'draw'; the loser loses most of what it committed (all of it when ambushed, as at Midway), capped by maxLoss.
  // o.foe: a British fleet ({cv, pil}) in place of the US one, whose losses don't touch the US count (code review r2 S4)
  const carrierBattle = (id, jMul = 1, uMul = 1, o = {}) => {
    const fcv = o.foe ? o.foe.cv : S.uCV, fpil = o.foe ? o.foe.pil : S.uPil;
    const J = Math.min(Math.max(0.3, S.jCV), o.jCommit ?? Infinity) * S.jPil * jMul, Us = Math.min(Math.max(0.3, fcv), o.uCommit ?? Infinity) * fpil * uMul + (o.uLand || 0), pJ = 1 / (1 + Math.pow(Us / J, M.k)), u = U('battle:' + id);
    let r = pinWin(id); if (r === null) { const pDraw = 0.25 * (1 - Math.abs(pJ - 0.5) * 2); r = u < pJ * (1 - pDraw) ? 'J' : u < pJ * (1 - pDraw) + pDraw ? 'draw' : 'U'; }
    const jB = o.jCommit ? Math.min(S.jCV, o.jCommit) : o.jB ? Math.min(S.jCV, o.jB) : Math.max(0.3, S.jCV) * Math.min(1, jMul), uB = o.uCommit ? Math.min(Math.max(0.3, fcv), o.uCommit) : Math.max(0.3, fcv) * Math.min(1, uMul), x = U('loss:' + id), amb = o.ambushedLoser ? 0.8 + 0.2 * x : 0.5 + 0.3 * x;
    const hitUS = d => { if (!o.foe) S.uCV -= d; };
    if (r === 'J') { hitUS(Math.min(fcv - 0.2, uB * amb, M.maxLoss)); S.jCV -= jB * 0.15 * x; if (!o.foe) S.uPil -= 0.03; S.jPil -= 0.03; }
    else if (r === 'U') { S.jCV -= Math.min(S.jCV - 0.2, jB * amb, M.maxLoss); hitUS(uB * 0.2 * x); S.jPil -= o.pilotHit || 0.06; if (!o.foe) S.uPil -= 0.01; }
    else { S.jCV -= jB * 0.2 * x; hitUS(uB * 0.25 * x); S.jPil -= 0.04; if (!o.foe) S.uPil -= 0.02; }
    clamp(); btl[id] = r; bq[id] = S.q; mark(label(id, r)); return r; };

  // ---- July 1941 (q = 0): north or not. Europe's fate is drawn once; an early Soviet collapse makes the strike north far likelier (JM 147's condition)
  const euroU = U('euro'), eLost = ('europeLost' in H) ? !!H.europeLost : (H.__real && H.__real.until > 6) ? false : euroU < P.europeLost, euroEarly = ('euroEarly' in H) ? !!H.euroEarly && eLost : eLost && euroU < P.europeLost * 0.4 * P.euUSSR;   // an early Soviet collapse (test hook: H.euroEarly)
  if (eLost) { S.germany = Infinity; mark('Europe lost'); S.ussrBeaten = U('euUSSR') < P.euUSSR; S.britainOut = U('euBritain') < P.euBritain; if (S.ussrBeaten) mark('the USSR beaten'); if (S.britainOut) mark('Britain out'); }
  if (roll('strikeNorth', tilt(P.strikeNorth * (euroEarly ? 5 : 1)))) {
    S.plan = 'NORTH'; S.north = 1; mark('Japan strikes north'); say('Japan attacks the Soviet Union');
    S.embargo = roll('northEmbargo', P.northEmbargo); if (!S.embargo) mark('no embargo');
    const pN = Math.min(0.85, P.northWin / (euroEarly ? M.sovWeak : 1)), r = pinWin('siberia') ?? (U('battle:siberia') < pN ? 'J' : 'U');
    btl.siberia = r; bq.siberia = 0; mark(label('siberia', r)); if (r === 'J') { S.north = 2; say('the Kwantung Army takes Vladivostok'); } else say('the Kwantung Army is stopped short of Vladivostok');
  }
  // ---- November-December 1941 (q = 1): the decision in the south
  S.q = 1; let goSouth = false;
  if (S.north && S.embargo) { if (roll('backDown', tilt(P.backDown, -1))) { S.embargo = false; mark('the embargo lifted'); } }   // backing down to the US doesn't end a war already fought in Siberia (code review r2 N3)
  else if (!S.north) {
    const mv = roll('modusVivendi', P.modusVivendi); if (mv) mark('the modus vivendi');
    if (roll('backDown', tilt(P.backDown * (mv ? 3 : 1), -1))) { mark('Japan backs down'); return end(O_NOWAR, 'Japan backs down; the embargo is lifted'); }
    goSouth = true; S.uk = true; S.southStart = 1;
    if (mv) { S.uCV += 0.4; S.oil -= 3; }   // a quarter's grace: the US a quarter readier, Japan's oil a quarter lower (code review r2 M5: no longer through the tank-farm delay)
    const south = roll('southOnly', tilt(P.southOnly, -0.8)), phil = !south && roll('philNoPearl', tilt(P.philNoPearl, -0.5)), tag = s => S.plan = S.plan ? S.plan + '+' + s : s;
    if (south) { tag('SOUTH'); mark('south only'); say('Japan strikes only the British and the Dutch'); S.will = M.willSouth; S.phil = 0; if (roll('usEntersNow', P.usEntersNow)) { S.us = true; S.usSince = 1941.92; S.phil = 1; mark('America enters'); say('Roosevelt takes America to war anyway'); } }
    else if (phil) { tag('PHIL'); S.us = true; S.usSince = 1941.92; S.attacked = true; S.will = M.willPearl; mark('no Pearl Harbor, the Philippines attacked'); say('Japan attacks the Philippines and the south, and leaves Pearl Harbor alone'); }
    else {
      tag('REAL'); S.us = true; S.usSince = 1941.92; S.pearl = true; S.attacked = true; S.will = M.willPearl; mark('Pearl Harbor');
      if (roll('usWarned', P.usWarned)) { mark('the fleet sorties'); S.uCV -= 0.6; dies(6); say('warned, the fleet sorties and is caught at sea'); }
      else { const e = roll('enterpriseIn', P.enterpriseIn), l = roll('lexingtonIn', P.lexingtonIn), n = (e ? 1 : 0) + (l ? 1 : 0); if (n) { S.uCV -= n * 0.85; mark('carriers caught at Pearl'); } say(`Pearl Harbor: the battleships are hit, ${n ? n + ' carrier' + (n > 1 ? 's' : '') + ' too' : 'the carriers are at sea'}`); }
      dies(2.4); btl.pearl = 'J'; bq.pearl = 1; mark('Pearl Harbor: Japan wins');
      if (roll('thirdStrike', tilt(P.thirdStrike))) { mark('third strike'); if (roll('tanksHit', P.tanksHit)) { S.delay = Math.max(1, Math.round(M.delayTanks)); S.tankFarm = true; mark('the tank farm burns'); say('a third strike burns the tank farm'); } }
    }
    if (H.coldAmerica && S.attacked) { S.attacked = false; S.will = M.willSouth; }   // the test of the first morning (history review r4 M1): the same war against an America that was not attacked
    S.south = 0.3; if (S.us && !roll('hitlerDeclares', P.hitlerDeclares)) { S.noHitler = true; mark('Hitler does not declare war'); }
  }

  for (S.q = 2; S.q < QN; S.q++) {
    const y = yr(); S.deadQ = 0; S.active = false;
    // ---- the north: a war in Siberia with no oil to be had there; it goes on even if Japan turns south (two fronts)
    if (S.north) S.oil -= E.northOil * (0.8 + 0.4 * U('northOil@' + S.q)) + (S.embargo && !goSouth ? E.northBurn : S.embargo ? 0 : -1.5);
    if (S.north && !goSouth) {
      if (S.ussrBeaten && y >= 1942.5 && S.north === 2 && !S.feRolled) { S.feRolled = true; if (roll('farEastFalls', P.farEastFalls)) { mark('the Soviet Far East kept');
        if (S.embargo) { S.north = 0; S.sovIn = false; say('the Soviet Far East gives up the Maritime Province; the American embargo is still on'); lateSouth(false, y); }   // the Soviets out, the embargo still on: a pause, as with the ceasefire (code review r4 M2)
        else return end(O_WIN, 'with the Soviet Union beaten in Europe, Japan keeps the Soviet Far East'); } }
      if (!S.ussrBeaten && roll('sovietCounter', P.sovietCounter)) { mark('the Soviet counter-offensive');
        if (!S.embargo) return end(O_NORTH, 'the Soviets throw Japan back; a peace on the 1941 lines');
        // a ceasefire with the American embargo still on is a pause, not an end: Japan is back at its November 1941 choice with less oil (history review r3 M2)
        S.north = 0; say('the Soviets throw Japan back; a ceasefire, and the American embargo is still on');
        if (roll('backDown', tilt(P.backDown * 3, -1))) { mark('Japan backs down'); return end(O_NORTH, 'a ceasefire in Siberia; Japan backs down and the embargo is lifted'); }
        lateSouth(false, y); }
      else
      if (goSouth) { /* turned south this quarter already */ }
      else if (S.embargo && S.oil < 22.5) lateSouth(true, y);
      else { if (y >= 1943.75) return end(O_NORTH, S.north === 2 ? 'a ceasefire in Siberia; Japan holds the Maritime Province, unrecognised' : 'the northern war ends where it began'); continue; }
    }
    // ---- the Philippines, and the rest of the south (backstops counted from the start of the southern war; code review r2 S2)
    if (S.us && S.phil === 1 && S.south > 0 && S.q > S.southStart) { if (roll('philTaken', P.philTaken) || S.q >= S.southStart + 4) { S.phil = 2; mark('the Philippines taken'); } }
    if (S.south > 0 && S.south < 1 && S.stage < 2 && S.q > S.southStart && (roll('conquestFast', P.conquestFast) || S.q >= S.southStart + 3)) { S.south = 1; mark('the south taken'); }
    // ---- production: Japan's output relative to the real path, from its shipping, the bombing and China; the real schedules scaled by it (no double count)
    const shipR = lerpT(E.shipReal, y), bombR = y >= 1945.2 ? Math.min(0.2, (y - 1945.0) * 0.27) : 0;
    S.rel = H.realEcon ? 1 : Math.max(0.25, Math.min(M.relMax, Math.pow(Math.max(0.05, S.ship) / shipR, M.relExp) * (1 - Math.max(0, S.bomb - bombR)) * (1 - S.china) / (1 - E.chinaDrain))) * E.jScale;
    S.out = lerpT(E.outReal, y + 0.125) * S.rel;
    S.jCV += tbl(E.jCarriers, y) / 4 * S.rel * (S.notYamato ? 1.6 : 1);
    S.uCV += tbl(E.usCarriers, y) / 4 * E.usScale * (S.us ? 1 : E.usNeutral);
    const share = (eLost && S.noHitler ? 0.9 : S.noHitler && y < 1943 ? 0.8 : tbl(E.pacificShare, y)) / 0.5;   // Germany winning: 0.9 when the US is not at war with Germany (our WW2 film); Europe first when it is (planners chose Africa if the USSR fell, C §3)
    const jAir = tbl(E.jAircraft, y) / 10000 * S.rel, uAir = tbl(E.jAircraft, y) / 10000 * E.usAircraftRatio * share * E.usScale * 0.5;   // land-based air, tens of thousands of aircraft a year; half the US output faces Japan at the base share
    if (S.delay > 0 && y > 1942.5) S.delay = Math.max(0, S.delay - 1); if (S.init > 0) S.init--;
    // ---- Japan's slow choices: rolled once, in the first quarter of its southern war (code review r2 S2c)
    if (!S.choices && S.south > 0 && y >= 1942.25) { S.choices = true;
      if (roll('pilotPipeline', tilt(P.pilotPipeline, -0.5))) { S.pipe = true; mark('pilot training expanded'); }
      if (roll('carriersNotYamato', tilt(P.carriersNotYamato, -0.3))) { S.notYamato = true; mark('carriers, not battleships'); }
      if (roll('subsOnShipping', tilt(P.subsOnShipping, -0.3))) { S.subsJ = true; mark('submarines on shipping'); } }
    if (S.south > 0 && !S.convoy && y < 1944 && roll('convoyEarly', tilt(P.convoyEarly, -1))) { S.convoy = true; mark('convoys early'); }
    if (S.us && !S.chinaFree && y >= 1942 && y < 1944 && roll('chinaPeace', P.chinaPeace)) { S.chinaFree = true; mark('peace with China'); S.china *= 0.3; S.jPil += 0.05; }
    // ---- spring 1942, with or without America at war: the carriers go west into the Indian Ocean against Britain's Eastern Fleet
    if (y >= 1942.25 && !S.didIO && S.south >= 1) { S.didIO = true; if (roll('indianOcean', tilt(P.indianOcean * (S.us ? 1 : 2)))) { mark('the carriers go west'); const r = carrierBattle('ceylon', 0.6, 1, { foe: { cv: M.ukCV, pil: 0.85 } }); if (r === 'J') { say('the Eastern Fleet is destroyed; Ceylon is threatened'); S.ukShaken = true; } S.west = true; } }
    // ---- Burma and India (1944): a Japanese win shakes Britain (a peace in the East is likelier while America is out or not yet winning) (code review r3 S3)
    let imphalStrain = 0;
    if (inQ(1944.2, y) && y < 1944.75 && !btl.imphal && S.uk && S.south >= 1 && (!S.us || S.stage <= 3)) { const r = pinWin('imphal') ?? (roll('imphal', P.imphal) ? 'U' : 'J'); btl.imphal = r; bq.imphal = S.q; mark(label('imphal', r)); if (r === 'J') { S.ukShaken = true; imphalStrain = 1; } }
    // ---- a war America stays out of (or has left): Britain and the Netherlands alone in the East
    if (!S.us) {
      if (!S.usLeft && roll('usEntersLater', P.usEntersLater * (inQ(S.germany, y) ? 2 : 1))) { S.us = true; S.usSince = y; S.phil = Math.max(S.phil, 1); mark('America enters late'); say('America goes to war'); }
      else {
        if (inQ(S.germany, y) && roll('ukRetake', P.ukRetake)) { S.south = 0; mark('Britain retakes the south'); }
        if (S.south >= 1 && y >= 1943 && roll('ukPeace', P.ukPeace * (S.britainOut ? 4 : 1) * (S.ukShaken ? 4 : 1))) { S.uk = false; mark('peace without America'); return end(O_WIN, 'Britain and the Netherlands make peace in the East'); }
        if (S.q >= S.southStart + 3 && S.south === 0) { S.uk = false; mark('the south lost'); return end(O_EMPIRE, 'Britain takes back the south; a peace hands it back'); }
        S.oil = Math.max(0, Math.min(60, S.oil + E.oilImp * 0.85 - E.oilUse * 0.6));   // the US bombers in the Philippines astride the route cost Japan shipping (JM 150)
        if (trace) trace.push([+(y + 0.25).toFixed(2), +S.oil.toFixed(1), S.stage, +S.ship.toFixed(2), +S.uCV.toFixed(1), +S.jCV.toFixed(1), +S.jPil.toFixed(2), +S.out.toFixed(2), +S.will.toFixed(2), +S.bomb.toFixed(2)]); continue;
      }
    }
    // ---- the 1942 carrier battles, in 1942 only: an America entering later meets a first offensive instead (code review r1 #7)
    if (y >= 1943 && !S.did42) S.did42 = true;
    if (y >= 1942.25 && !S.did42 && S.south >= 1) { S.did42 = true;
      if (S.plan.includes('PHIL') && roll('usFleetSails', P.usFleetSails)) { const r = carrierBattle('decisive', 1.3, 1.0); if (r === 'J') { S.init = 4; dies(15); S.will -= 0.08; say('the US fleet is beaten in the western Pacific'); } else if (r === 'U') say("the decisive battle goes America's way"); }
      if (roll('moresbyPlan', tilt(P.moresbyPlan * (S.west ? 0.5 : 1)))) { const knows = roll('codebreak', P.codebreak), r = carrierBattle('coral', S.west ? 0.6 : 1, knows ? 1.3 : 0.9, { jCommit: 2.5, uCommit: 2 }); dies(r === 'J' ? 1.0 : 0.6);   // Shokaku, Zuikaku and Shoho against Lexington and Yorktown: 121 v 122 aircraft (NWC; D). US dead: 656 real (Lexington 216 of them); a clear Japanese win costs both US carriers (judgment, D; history review r4 N2: this call used to sit inside the comment)
        if (r === 'J' && roll('moresbyGo', tilt(P.moresbyGo))) { mark('Port Moresby taken'); S.init = Math.max(S.init, 2); }
        S.shokakuOut = r === 'U' ? true : roll('coralShokaku', r === 'draw' ? P.coralShokaku : P.coralShokaku * 0.5); }
      if (roll('midwayPlan', tilt(P.midwayPlan * (S.west ? 0.5 : 1)))) {
        const split = roll('splitForces', P.splitForces), knows = roll('codebreak2', P.codebreak), york = roll('yorktownReady', P.yorktownReady), late = roll('scoutLate', P.scoutLate);
        const jMul = (split ? 0.85 : 1.1) * (S.west ? 0.8 : 1), uMul = (york ? 1 : 0.67) * (late ? 1.25 : 0.85) * (S.tankFarm ? 0.7 : 1) * M.ambush;
        if (!knows) { mark('Midway taken, no battle'); say('Japan takes Midway; the US carriers stay back'); S.init = Math.max(S.init, 2); btl.midway = 'none'; bq.midway = S.q; }
        else { const r = carrierBattle('midway', jMul, uMul, { uLand: M.midwayLand, ambushedLoser: true, jCommit: S.shokakuOut ? 4 : 6 }); dies(r === 'J' ? 1.2 : 0.3);   // Japan committed its four (or six) fleet carriers and lost all four (D); US dead 307 real, ~1,200 if all three US carriers go down (judgment from Lexington 216 and Yorktown, D)
          if (r === 'J') { say('Japan wins at Midway'); S.init = Math.max(S.init, 4); S.will -= 0.05;
            if (roll('hawaiiTry', tilt(P.hawaiiTry))) { mark('Hawaii attempted'); if (roll('hawaiiHold', P.hawaiiHold)) { mark('Hawaii taken'); S.hawaii = true; S.init = 8; dies(15); S.will -= 0.25; say('Japan takes Hawaii'); } else { S.jCV -= 1; S.ship -= 0.3; dies(3); } } }
          else if (r === 'U') say('Japan loses its carriers at Midway'); }
      }
      if (S.init > 1 && roll('operationFS', tilt(P.operationFS))) { mark('Fiji and Samoa taken'); S.init += 2; S.will -= 0.03; }
      clamp();
    }
    // ---- Guadalcanal: the first US offensive, an attrition campaign (Aug 1942 - Feb 1943). Real losses: the US lost Wasp and Hornet, Japan Ryujo, ~683 aircraft and 1,200-2,300 aircrew (D)
    if (y >= 1942.5 && !S.didGuadal && !S.delay && S.init <= 1 && S.stage === 0 && S.q >= S.southStart + 3) { S.didGuadal = true; S.firstOffensive = y; S.active = true;
      const J = Math.max(0.3, S.jCV) * S.jPil * M.guadJ + 0.5 * jAir * S.jPil, Us = Math.max(0.3, S.uCV) * S.uPil + M.guadAir * uAir, pJ = 1 / (1 + Math.pow(Us / J, M.k)), x = U('loss:guadalcanal');
      let r = pinWin('guadalcanal'); if (r === 'draw') r = 'U'; if (r === null) r = U('battle:guadalcanal') < pJ ? 'J' : 'U';
      btl.guadalcanal = r; bq.guadalcanal = S.q; mark(label('guadalcanal', r)); dies(7);
      if (r === 'U') { S.jCV -= 0.4 + 0.3 * x; S.uCV -= 1.2 + 0.8 * x; S.jPil -= 0.14; S.stage1At = S.q + M.campaign[1]; }
      else { S.uCV -= 2 + x; S.jCV -= 0.3; S.jPil -= 0.07; S.will -= 0.03; if (!roll('guadalStay', P.guadalStay)) { mark('Guadalcanal abandoned'); S.init = Math.max(S.init, 3); S.will -= 0.03; say('America pulls out of Guadalcanal'); S.guadalLost = true; } else S.stage1At = S.q + M.campaign[1] + 2; }
      clamp(); }
    if (S.stage1At && S.q >= S.stage1At && S.stage === 0) { S.stage = 1; S.stage1At = 0; mark('stage 1'); S.active = true; }
    if (S.guadalLost && S.stage === 0 && !S.init && !S.delay && roll('advance0', Math.min(0.8, M.advK * Math.pow((S.uCV * S.uPil + M.airW * uAir) / Math.max(0.3, S.jCV * S.jPil + M.airW * jAir * S.jPil), M.advExp)))) { S.stage = 1; mark('stage 1'); say('the US offensive restarts in the central Pacific'); }
    // ---- shipping: sunk by its agents, each tied to what the US actually holds; the submarine war counts from the US entry (history review r2)
    if (!S.tankers && !S.tankRolled && inQ(1943.2, y)) { S.tankRolled = true; if (roll('tankersEarly', P.tankersEarly)) S.tankers = y; } if (!S.tankers && inQ(1944.1, y)) S.tankers = y;
    const warY = 1941.92 + (y - S.usSince), subR = tbl(E.subs, warY) * (S.hawaii ? 0.5 : 1) * (S.convoy ? 0.7 : 1), airR = tbl(E.carrierAir, warY) * (S.stage >= 2 && !S.init ? 1 : 0.25), mineR = S.stage >= 4 && inQ(1945.23, y) ? E.mines : 0;
    S.ship = Math.max(0.3, S.ship * (1 - subR - airR - mineR - tbl(E.otherSink, warY)) + tbl(E.shipBuild, y) * S.rel + (S.q <= S.southStart + 2 && S.south > 0 ? E.captured : 0));
    const imp = S.south >= 1 && y >= 1942.25 ? E.oilImp * Math.min(1, (y - Math.max(1942.0, yearOf(S.southStart) + 0.25)) / 0.75) * Math.min(1, S.ship / (E.tankerFloor * E.ship0)) * (S.tankers && y >= S.tankers ? Math.max(0, 1 - (y - S.tankers) * E.tankerFall) : 1) * (S.stage >= 5 ? 0.2 : 1) * (S.us && S.phil === 1 ? 0.85 : 1) : 0;
    S.oil = Math.max(0, S.oil + imp - E.oilUse * (S.oil < 8 ? 0.28 : S.oil < 12 ? 0.6 : 1));
    if (H.realEcon) { S.ship = lerpT(E.shipReal, y + 0.25); S.oil = lerpT(E.oilReal, y + 0.25); }   // the "economy set to the real path" test (SIM_STANDARD §3)
    const southCut = S.stage >= 5 || (S.tankers && y >= S.tankers + 0.9);   // the forward fleet is fuelled in the south until the south is cut off (E)
    if (southCut && S.oil < 3) mark('the fleet runs dry');
    if (S.subsJ) S.will -= 0.004;
    S.uPil = Math.min(1.3, S.uPil + 0.025);
    // ---- the American advance (stages 2-7), with the 1944 battles as events; the second prong never reaches the Marianas in the same quarter (code review r2 S3)
    const dry = southCut || S.oil < 3, jPow = Math.max(0.3, S.jCV) * S.jPil * (dry ? 0.4 : 1) + M.airW * jAir * S.jPil, uPow = S.uCV * S.uPil + M.airW * uAir, ratio = uPow / jPow;
    const pinned = H.__real && S.q < H.__real.until;
    if (S.busy > 0 && !pinned) { S.busy--; S.active = true; }
    else if (S.stage >= 1 && S.stage < 7 && (pinned ? REALQ.advance(S.q, S) : (!S.delay && S.init <= 0))) {
      const p = Math.min(0.8, M.advK * Math.pow(ratio, M.advExp) * (S.chinaFree ? 0.85 : 1)), two = ratio > 4 && S.stage >= 2 && S.stage <= 3;
      for (let pr = 0; pr < (two ? 2 : 1); pr++) { if (pr && S.stage >= 3) break; if (S.stage < 7 && roll(pr ? 'advance2' : 'advance', pr ? p * 0.5 : p)) {
        const next = S.stage + 1; S.active = true;
        if (next === 4 && !btl.philsea) { const r = carrierBattle('philsea', 1.0, 1.0, { pilotHit: 0.15 }); if (r === 'J') { S.init = 2; dies(6); S.will -= 0.05; say('Japan holds the Marianas at the Philippine Sea'); break; } }
        if (next === 5 && !btl.leyte) { const r = carrierBattle('leyte', 1.2, 1.0); if (r === 'J') { S.init = 1; dies(8); S.will -= 0.04; mark('Kurita breaks into Leyte Gulf'); break; } }
        if (next === 6) { const kami = 0.6 + 0.8 * U('kamikaze'); dies(12 + 10 * kami * (S.chinaFree ? 1.2 : 1)); btl.okinawa = 'U'; bq.okinawa = S.q; mark('Iwo Jima and Okinawa: the US wins'); S.will -= 0.03 * kami; S.okinawaCost = kami; }
        S.stage = next; S.busy = pinned ? 0 : M.campaign[S.stage] - 1; dies((M.stageCost[S.stage] || 0) * (S.chinaFree ? 1.2 : 1)); mark('stage ' + S.stage);
        if (S.stage >= 2) S.south = Math.min(S.south, S.stage >= 5 ? 0.5 : 1);
        if (S.stage === 4) S.bombFrom = y + 0.25;
      } }
    }
    if (S.us) dies(M.baseDead);   // every quarter at war: submarines, air, the Navy at sea, whoever holds the initiative (code review r3 M2)
    if (S.active || S.stage >= 1) { S.jPil = Math.max(0.25, S.jPil - M.pilotOps * (S.pipe ? 0.5 : 1) + (S.pipe && !southCut ? 0.01 : 0)); }
    if (S.bombFrom && y >= S.bombFrom) S.bomb = Math.min(0.6, S.bomb + E.bombing);
    // ---- Burma and India (1944): a Japanese win shakes Britain (a peace can then leave Japan its conquests) and strains Washington that quarter (code review r2 S6)
    // ---- will and talks: talks need strain (initiative, the carrier edge, this quarter's losses, low will) and stop once the US is clearly winning. No floor: no strain, no talks (history review r2 #1)
    if (!S.uncondRolled && y >= 1943) { S.uncondRolled = true; S.uncond = roll('uncond', P.uncond); }
    S.will = S.will + 0.005 - S.deadQ / 150; clamp();
    const jEdge = Math.min(M.edgeMax, Math.max(0, (Math.max(0.3, S.jCV) * S.jPil) / Math.max(0.3, S.uCV * S.uPil) - M.edgeOff)), stale = S.stage < 2 && y >= 1943 ? (y - 1943 + 0.25) * M.stalemate : 0, strain = (S.init > 0 ? M.strainInit : 0) + jEdge * M.strainEdge + S.deadQ / M.strainDead + (S.hawaii ? M.hawaiiStrain : 0) + Math.max(0, (0.7 - S.will) * M.willStrain) + imphalStrain + stale;
    const talkP = S.stage >= 2 ? 0 : (S.attacked ? P.usTalks * Math.min(strain, M.capAttacked) : P.usTalksCold * Math.min(strain, M.capCold)) * (S.uncond ? 0.5 : 1) * (eLost && y > 1943 ? P.europeLostTalks : 1);   // capped: even at Japan's high-water mark (Feb 1942) only 10% backed a status-quo peace (Cantril; C §2a)
    if (talkP > 0 && roll('usTalks', talkP)) {
      mark('America negotiates');
      const sovAtWar = S.north > 0 && S.sovIn,   // a beaten USSR whose Far East did not give up is still at war (code review r4 M2b)
       britainDown = S.britainOut || S.ukShaken || S.hawaii, ukSigns = roll('jointPeace', P.jointPeace * (eLost ? 1.5 : 1));
      if (britainDown && !sovAtWar && S.stage <= 1 && S.south >= 1 && ukSigns) { S.uk = false; return end(O_WIN, 'the Allies negotiate, and Japan keeps the south'); }
      if (!S.attacked && !ukSigns) { S.us = false; S.usLeft = true; mark('America leaves the war'); say('America makes its own peace; Britain fights on'); continue; }
      if (!sovAtWar && roll('japanAccepts', P.japanAccepts)) { S.uk = false; return end(O_EMPIRE, 'the Allies negotiate; Japan gives back its conquests'); }
      mark('the talks fail');
    }
    if (trace) trace.push([+(y + 0.25).toFixed(2), +S.oil.toFixed(1), S.stage, +S.ship.toFixed(2), +S.uCV.toFixed(1), +S.jCV.toFixed(1), +S.jPil.toFixed(2), +S.out.toFixed(2), +S.will.toFixed(2), +S.bomb.toFixed(2)]);
    // ---- the end: Germany, the Soviets, the bomb, the blockade, the landings; the pressure grows with how close the US has come (history review r2 #3)
    if (inQ(S.germany, y)) mark('Germany falls');
    if (!S.sovRolled && !S.sovIn && inQ(S.germany + 0.25, y)) { S.sovRolled = true; S.sovIn = roll('sovietEnter', P.sovietEnter); if (S.sovIn) { mark('the Soviets enter'); S.sovSince = y; } }
    const bombs = S.stage >= 4 && inQ(S.atom, y); if (bombs) mark('the bomb');
    const near = M.surrStage[S.stage] || 0;
    if (near > 0 && inQ(1944.9, y)) {
      const pS = (bombs && S.sovIn ? P.surrBoth : bombs ? P.surrBombs : S.sovIn ? P.surrSoviets : 0) * near;
      if (pS && roll('surrender', pS)) return end(O_SURR, bombs && S.sovIn ? 'the bombs, the Soviets: Japan surrenders' : bombs ? 'the bombs: Japan surrenders' : 'the Soviets come in: Japan surrenders');
      const hunger = Math.max(0, 1 - S.ship / 2.5) + (S.oil < 3 ? 0.5 : 0) + S.bomb;
      if (roll('blockadeSurrender', P.blockadeSurrender * hunger * near)) return end(O_SURR, 'blockaded and starving, Japan surrenders');
      if (inQ(1945.83, y) && S.stage >= 7 && (S.invading || (S.invading = roll('invadeChoice', P.invadeChoice * (S.will > 0.8 ? 1 : 0.7) / (S.okinawaCost > 1.1 ? 1.3 : 1))))   /* taken again each quarter until made: Coronet was planned for 1 Mar 1946 (C §4; history review r4 M3) */) {
        mark('the invasion'); dies(20 + 15 * U('olympic@' + S.q)); if (roll('invasionSurrender', P.invasionSurrender)) return end(O_INV, 'Japan surrenders after the landings'); }
    }
  }
  S.q = QN - 1;
  if (!S.us && !S.uk) return end(O_WIN, 'the end of 1947: no great power is fighting Japan');
  return end(O_STILL, 'still at war at the end of 1947');
}

function batch(set, n, seedBase, H, over) {
  const P = { ...oddsFor(set), ...(over || {}) }, out = { n, outcomes: {}, events: {}, endYear: {}, win: 0, deadSum: 0, endSum: 0, fought: 0 };
  for (let i = 0; i < n; i++) { const r = war(P, rng(warSeed(seedBase, i)), H || {}); out.outcomes[r.outcome] = (out.outcomes[r.outcome] || 0) + 1; for (const e of r.ev) out.events[e] = (out.events[e] || 0) + 1; const y = Math.floor(r.y); out.endYear[y] = (out.endYear[y] || 0) + 1; if (r.outcome !== O_NOWAR) { out.fought++; out.deadSum += r.dead; out.endSum += r.y; } }
  out.win = out.outcomes[O_WIN] || 0; out.deadMean = out.fought ? out.deadSum / out.fought : 0; out.endMean = out.fought ? out.endSum / out.fought : 0; return out;
}
