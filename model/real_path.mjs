// The real chain of events, 1941-1945, as the model's turning points (model v4: q = 0 is July-September 1941, quarter q covers year 1941.5 + q/4).
// realUntil(q) restarts the model from the real situation at quarter q: before it every roll goes the way it really went; from q on the war runs free.
// The dates of V-E Day (1945.35) and the bomb (1945.6) are the model's own draws; on the real path they fall in their real quarters (code review r1 #6: no fudged dates).
// Sources: 00_research/SOURCES.md (A-F).
const ADV = { 10: 1, 11: 1, 12: 1, 13: 1, 15: 1, 16: 1 };   // the quarters the US advance moved a stage: the Marshalls (Jan-Mar 1944), Hollandia (Apr-Jun 1944), the Marianas (Jul-Sep 1944), Leyte (Oct-Dec 1944), Iwo Jima and Okinawa (Apr-Jun 1945 with Iwo in Feb-Mar), the home islands in range (Jul 1945)
export const REALQ = {
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
export const MILESTONES = [
  [0, 'July 1941: north or south'], [1, 'November 1941: the decision'], [2, 'after Pearl Harbor'], [3, 'spring 1942: the south taken'], [4, 'after Midway'], [6, 'after Guadalcanal'],
  [11, 'after the Marshalls'], [13, 'after the Marianas'], [14, 'after Leyte'], [16, 'after Okinawa'], [17, 'August 1945'] ];
export function realUntil(qT, extra = {}) { return { __real: { until: qT }, ...extra }; }
