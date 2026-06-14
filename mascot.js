/* =====================================================================
   mascot.js — 전망 적중도 픽셀 마스코트 "금리몬: 임수룡(壬水龍)"
   사주(1991.3.23 임진일 · 임수 일간 · 금 3개 · 봄 묘목)에서 착안.
   임수=큰 물 → 물방울에서 금(金)비늘 수룡으로. 5단계, 56x56.
   적중하면 진화, 빗나가면 퇴화. 단, 금리 변동성이 큰 시기의 오답은 패널티 경감.
   추적 페이지와 포털이 공유. window.Mascot 노출.
   ===================================================================== */
(function (root) {
  "use strict";

  /* ---------- XP: 보상 + 패널티(변동성 인지) ----------
     [적중] 방향 +10 · 오차 ≤0.10%p +8 / ≤0.25 +4 / ≤0.50 +1
     [오답] 방향 틀림 −3 · 오차 >1.00%p −3 / >0.50 −2 / >0.25 −1
     [변동성 경감] |realized−anchor| ≥ 0.20%p (그 시기 실제 금리 변동폭이 큰
        '예측 난이도 높은 구간')이면 오답·오차 패널티를 50%만 부과.
why: 금리가 요동친 시기엔 빗나가도 덜 가혹하게 — 실력 부족과 불가항력을 구분.
     [번복] 같은 (변수,타깃) 갱신 5회 무료, 6회차부터 −1(30일내 −2) */
  var VOL_THRESHOLD = 0.20;  // %p, 이 이상 움직였으면 고변동 구간
  var VOL_RELIEF = 0.5;      // 고변동 구간 패널티 배수

  function computeXP(data) {
    var recs = (data && data.records) || [];
    var xp = 0, hits = 0, evaluated = 0, precise = 0, misses = 0, relieved = 0;
    recs.forEach(function (r) {
      if (r.error === null || r.error === undefined) return;
      evaluated++;
      var ae = Math.abs(r.error);
      // 그 시기 실제 금리 변동폭 → 고변동 여부
      var vol = (r.anchor !== null && r.anchor !== undefined && r.realized !== null && r.realized !== undefined)
        ? Math.abs(r.realized - r.anchor) : 0;
      var highVol = vol >= VOL_THRESHOLD;
      var relief = highVol ? VOL_RELIEF : 1;
      if (highVol) relieved++;
      // 방향
      if (r.direction_hit === true) { xp += 10; hits++; }
      else if (r.direction_hit === false) { xp -= 3 * relief; misses++; }
      // 정밀도/오차
      if (ae <= 0.10) { xp += 8; precise++; }
      else if (ae <= 0.25) { xp += 4; }
      else if (ae <= 0.50) { xp += 1; }
      else if (ae <= 1.00) { xp -= 1 * relief; }
      else if (ae <= 2.00) { xp -= 2 * relief; }
      else { xp -= 3 * relief; }
    });
    var FREE_REVISIONS = 5;
    var groups = {};
    recs.forEach(function (r) {
      var k = r.variable + "|" + r.target;
      (groups[k] = groups[k] || []).push(r);
    });
    var revisions = 0, rapidRevisions = 0, revPenalty = 0;
    Object.keys(groups).forEach(function (k) {
      var arr = groups[k].slice().sort(function (a, b) {
        return (a.forecast_date < b.forecast_date) ? -1 : 1;
      });
      for (var i = 1; i < arr.length; i++) {
        revisions++;
        if (i <= FREE_REVISIONS) continue;
        var prev = Date.parse(arr[i - 1].forecast_date);
        var cur = Date.parse(arr[i].forecast_date);
        var days = (isFinite(prev) && isFinite(cur)) ? (cur - prev) / 86400000 : 999;
        if (days <= 30) { revPenalty += 2; rapidRevisions++; }
        else { revPenalty += 1; }
      }
    });
    xp -= revPenalty;
    xp = Math.round(xp);
    if (xp < 0) xp = 0;
    return {
      xp: xp, evaluated: evaluated, hits: hits, precise: precise, misses: misses,
      hitRate: evaluated ? hits / evaluated : 0, volRelieved: relieved,
      revisions: revisions, rapidRevisions: rapidRevisions, revPenalty: revPenalty
    };
  }

  /* 사주 테마 5단계: 물방울 → 임수 용왕. glow=눈빛 */
  var STAGES = [
    { id: 0, name: "임수의 알",   min: 0,    glow: "#7bd0e0" },
    { id: 1, name: "물방울 정령", min: 200,  glow: "#7bd0e0" },
    { id: 2, name: "계류 수룡",   min: 600,  glow: "#6fc0e0" },
    { id: 3, name: "창해 수룡",   min: 1300, glow: "#6f8be0" },
    { id: 4, name: "임수 용왕",   min: 2400, glow: "#a0e8ff" }
  ];

  function stageFor(xp) {
    var s = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) if (xp >= STAGES[i].min) s = STAGES[i];
    return s;
  }
  function nextStage(stage) { return STAGES[Math.min(STAGES.length - 1, stage.id + 1)]; }
  function prevStage(stage) { return STAGES[Math.max(0, stage.id - 1)]; }

  var GRIDS = {
    0: [
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      ".....................M............M.....................",
      ".....................MM..........MM.....................",
      ".....................MM..........MM.....................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................DDDDDDDD........................",
      "......................DDDDDDDDDDDD......................",
      "....................DDDDDBBBBBBDDDDD....................",
      "...................DDDDBBBBBBBBBBDDDD...................",
      "...................DDLBBBBBBBBBBBBLDD...................",
      "..................DDLLBBBBBBBBBBBBLLDD..................",
      ".................DDDLLBBBBBKKBBBBBLLDDD.................",
      ".................DDBLBBBBBBBBBBBBBBLBDD.................",
      "................DDBBBBBBBBKBBKBBBBBBBBDD................",
      "................DDBBBBBBBBBBBBBBBBBBBBDD................",
      "...............DDBBBBBBBBBBKKBBBBBBBBBBDD...............",
      "...............DDBBBBBBBBBBBBBBBBBBBBBBDD...............",
      "...............DDBBBBBBBBBKBBKBBBBBBBBBDD...............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBKKBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBKBBKBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBKKBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBKBBKBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBKKBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      "...............DDBBBBBBBBBKBBKBBBBBBBBBDD...............",
      "...............DDBBBBBBBBBBBBBBBBBBBBBBDD...............",
      "...............DDBBBBBBBBBBBBBBBBBBBBBBDD...............",
      "................DDBBBBBBBBBBBBBBBBBBBBDD................",
      "................DDBBBBBBBBBBBBBBBBBBBBDD................",
      ".................DDBBBBBBBBBBBBBBBBBBDD.................",
      ".................DDDBBBBBBBBBBBBBBBBDDD.................",
      "..................DDBBBBBBBBBBBBBBBBDD..................",
      "...................DDBBBBBBBBBBBBBBDD...................",
      "...................DDDDBBBBBBBBBBDDDD...................",
      "....................DDDDDBBBBBBDDDDD....................",
      "......................DDDDDDDDDDDD......................",
      "........................DDDDDDDD........................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................"
    ],
    1: [
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "...........................AA...........................",
      "..........................AAAA..........................",
      "..........................AAAA..........................",
      "...........................AA...........................",
      "...........................AA...........................",
      "........................................................",
      "........................................................",
      ".........................BBBBBB.........................",
      ".....................L.BBBBBBBBBB.L.....................",
      ".....................LLBBBBBBBBBBLL.....................",
      "....................BBLBBBBBBBBBBLBB....................",
      "...................BBBBBBBBBBBBBBBBBB...................",
      "..................DBBBBBBBBBBBBBBBBBBD..................",
      ".................DBBBBBBBBBBBBBBBBBBBBD.................",
      ".................DBBBBBBBBBBBBBBBBBBBBD.................",
      "................DDBBBBBBBBBBBBBBBBBBBBDD................",
      "...............DDBBBBBBBBBBBBBBBBBBBBBBDD...............",
      "...............DDBSWBBBBBBBBBBBBBBBBWSBDD...............",
      "..............DDDBWEBBBBBBBBBBBBBBBBEWBDDD..............",
      "..............DDBBWEBBBBBBBBBBBBBBBBEWBBDD..............",
      "..............DDBBWEBBBBBBBBBBBBBBBBEWBBDD..............",
      ".............DDDBBBBBBBBBBBBBBBBBBBBBBBBDDD.............",
      ".............DDBBBBBBBBBBBBBBBBBBBBBBBBBBDD.............",
      ".............DDPPBBBBBBBBBBBBBBBBBBBBBBPPDD.............",
      ".............DDBBBBBBBBBBOOOOOOBBBBBBBBBBDD.............",
      "............DDDBBBBBBBBBBBBBBBBBBBBBBBBBBDDD............",
      "............DDBBBBBBBBBBBBBBBBBBBBBBBBBBBBDD............",
      "............DDBBBBBBBBBBBBBBBBBBBBBBBBBBBBDD............",
      "............DDBBBBBBBBBBBBBBBBBBBBBBBBBBBBDD............",
      "...........DDDBBBBBBBBBBBBBBBBBBBBBBBBBBBBDDD...........",
      "...........DDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBDD...........",
      "...........DDBBBBBBBBBBLLLBBBBLLLBBBBBBBBBBDD...........",
      "...........DDBBBBBBBBBLLLLLBBLLLLLBBBBBBBBBDD...........",
      "..........DDDBBBBBBBBLLLLLLLLLLLLLLBBBBBBBBDDD..........",
      "..........DDDBBBBBBBBLLLLLLLLLLLLLLBBBBBBBBDDD..........",
      "..........DDBBBBBBBBBLLLLLLLLLLLLLLBBBBBBBBBDD..........",
      "..........DDBBBBBBBBBBLLLLLBBLLLLLBBBBBBBBBBDD..........",
      "..........DDBBBBBBBBBBBLLLBBBBLLLBBBBBBBBBBBDD..........",
      ".........DDDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBDDD.........",
      ".........DDDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBDDD.........",
      ".........DDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBDD.........",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................"
    ],
    2: [
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "...........................VV...........................",
      ".........................VVVVVV.........................",
      "...........................VV...........................",
      "......................M..........M......................",
      "......................M..........M......................",
      ".......................M........M.......................",
      "........................................................",
      "........................................................",
      ".........................BBBBBB.........................",
      "........................BBBBBBBB........................",
      "......................BBBBBBBBBBBB......................",
      ".....................BBBBBBBBBBBBBB.....................",
      "....................DBBBBBBKKBBBBBBD....................",
      "....................BBBBBBBBBBBBBBBB....................",
      "....M..............DBBBBBBBBBBBBBBBBD..............M....",
      "....FMM...........DDBBBBBBBBBBBBBBBBDD...........MMF....",
      ".....FFM..........DDBBBBBBBKKBBBBBBBDD..........MFF.....",
      ".....FMFMM.......DDBBBBBBBBBBBBBBBBBBDD.......MMFMF.....",
      ".....FFFFFM......DDSWBBBBBBBBBBBBBBWSDD......MFFFFF.....",
      "......MFFMFMM...DDDWEBBBBBBBBBBBBBBEWDDD...MMFMFFM......",
      "......FFFFFFFM..DDBWEBBBBBBKKBBBBBBEWBDD..MFFFFFFF......",
      "......MFFMFMF...DDBWEBBBBBBBBBBBBBBEWBDD...FMFMFFM......",
      "......FFFFFFF...DDBBBBBBBBBBBBBBBBBBBBDD...FFFFFFF......",
      ".......FFMFM...DDDBBBBBBBBBBBBBBBBBBBBDDD...MFMFF.......",
      ".......FFFF....DPPBBBBBBBBBKKBBBBBBBBBPPD....FFFF.......",
      ".......FFM.....DDBBBBBBBBOOOOOOBBBBBBBBDD.....MFF.......",
      "........FF.....DDBBBBBBBBBBBBBBBBBBBBBBDD.....FF........",
      "........F.....DDDBBBBBBBBBBBBBBBBBBBBBBDDD.....F........",
      "..............DDDBBBBBBBBBBBBBBBBBBBBBBDDD..............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      "..............DDBBBBBBBBBBBBBBBBBBBBBBBBDD..............",
      ".............DDDBBBBBBLLLLLBBLLLLLBBBBBBDDD.............",
      ".............DDDBBBBBBLLLLLBBLLLLLBBBBBBDDD.............",
      ".............DDBBBBBBLLLLLLLLLLLLLLBBBBBBDD.............",
      ".............DDBBBBBBBLLLLLBBLLLLLBBBBBBBDD.............",
      ".............DDBBBBBBBLLLLLBBLLLLLBBBBBBBDD.............",
      ".............DDBBBBBBBBBLBBBBBBLBBBBBBBBBDD.............",
      "............DDDBBBBBBBBBBBBBBBBBBBBBBBBBBDDD............",
      "............DDDBBBBBBBBBBBBBBBBBBBBBBBBBBDDD............",
      "............DDBBBBBBBBBBBBBBBBBBBBBBBBBBBBDD............",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................"
    ],
    3: [
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "....................M..............M....................",
      "....................M..............M....................",
      ".....................M.M........M.M.....................",
      "......................M.M......M.M......................",
      ".......................M........M.......................",
      "........................................................",
      "........................................................",
      "........................................................",
      "M........................BBBBBB........................M",
      "FMM.....................BBBBBBBB.....................MMF",
      ".FFM...................BBBBBBBBBB...................MFF.",
      ".FFFMM................BBBBBKKBBBBB................MMFFF.",
      ".FFMFFM..............BBBBBBBBBBBBBB..............MFFMFF.",
      ".FFFFFFM............DBBBBBBBBBBBBBBD............MFFFFFF.",
      "..FMFFFFMM.........DDBBBBBBKKBBBBBBDD.........MMFFFFMF..",
      "..FFFFFMFFM........DBBBBBBBBBBBBBBBBD........MFFMFFFFF..",
      "..FMFFFFFFFMM.....DDBBBBBBBBBBBBBBBBDD.....MMFFFFFFFMF..",
      "..FFFFFMFFMFFM....DDBBBBBBBKKBBBBBBBDD....MFFMFFMFFFFF..",
      "...MFFFFFFFFF....DDSWBBBBBBBBBBBBBBWSDD....FFFFFFFFFM...",
      "...FFFFMFFMF.....DDWEBBBBBBBBBBBBBBEWDD.....FMFFMFFFF...",
      "...MFFFFFFFF.....DDWEBBBBBBKKBBBBBBEWDD.....FFFFFFFFM...",
      "...FFFFMFFM.....DDDWEBBBBBBBBBBBBBBEWDDD.....MFFMFFFF...",
      "....FFFFFF......DDDBBBBKKKBBBBKKKBBBBDDD......FFFFFF....",
      "....FFFMF.......DDBBBBBKKKBKKBKKKBBBBBDD.......FMFFF....",
      "....FFFF........PPBBBBBBKKBBBBKKBBBBBBPP........FFFF....",
      "....FFFM........DDBBBBBBBOOOOOOBBBBBBBDD........MFFF....",
      ".....FF........DDDBBBBBBBBBKKBBBBBBBBBDDD........FF.....",
      ".....F.........DDDBBBBBBBBBBBBBBBBBBBBDDD.........F.....",
      "...............DDBBBBBBBBBBBBBBBBBBBBBBDD...............",
      "...............DDBBBBBBBBBBKKBBBBBBBBBBDD...............",
      "...............DDBBBBBBBBBBBBBBBBBBBBBBDD...............",
      "..............DDDBBBBBBBBBBBBBBBBBBBBBBDDD..............",
      "..............DDDBBBBBBLLLLLLLLLLBBBBBBDDD..............",
      "..............DDDBBBBBBLLLLLLLLLLBBBBBBDDD..............",
      "..............DDBBBBBBLLLLLLLLLLLLBBBBBBDD..............",
      "..............DDBBBBBBBLLLLLLLLLLBBBBBBBDD..............",
      "..............DDBBBBBBBLLLLLLLLLLBBBBBBBDD..............",
      ".............DDDBBBBBBBBBBBBBBBBBBBBBBBBDDD.............",
      ".............DDDBBBBBBBBBBBBBBBBBBBBBBBBDDD.............",
      ".............DDDBBBBBBBBBBBBBBBBBBBBBBBBDDD.............",
      ".............DDBBBBBBBBBBBBBBBBBBBBBBBBBBDD.............",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................"
    ],
    4: [
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................",
      "...................M.M..M......M..M.M...................",
      "..................M.M.M..M....M..M.M.M..................",
      "...................M.M.M........M.M.M...................",
      "......................M..........M......................",
      "........................................................",
      "M......................................................M",
      "FM....................................................MF",
      "FFMM................................................MMFF",
      "FMFFM....................BBBBBB....................MFFMF",
      "FFFFFM.................BBBBBBBBBB.................MFFFFF",
      "FMFFFFM...............BBBBBBBBBBBB...............MFFFFMF",
      "FFFFFMFMM............BBBBBBKKBBBBBB............MMFMFFFFF",
      "FMFFFFFFFM..........DBBBBBBBBBBBBBBD..........MFFFFFFFMF",
      "FFFFFMFFFFMM........DBBBBBBKKBBBBBBD........MMFFFFMFFFFF",
      "FMFFFFFFFMFFM......DBBBBBBBBBBBBBBBBD......MFFMFFFFFFFMF",
      "FFFFFMFFFFFFFM....DDBBBBBBBKKBBBBBBBDD....MFFFFFFFMFFFFF",
      "FMFFFFFFFMFFF.....DDBBBBBBBBBBBBBBBBDD.....FFFMFFFFFFFMF",
      "FFFFFMFFFFFF.....DDBBBBBBBBKKBBBBBBBBDD.....FFFFFFMFFFFF",
      ".MFFFFFFFMF......DDSWBBBBBBBBBBBBBBWSDD......FMFFFFFFFM.",
      ".FFFFMFFFFF......DDWEBBBBBBKKBBBBBBEWDD......FFFFFMFFFF.",
      ".MFFFFFFFM......DDDWEBBBBBBBBBBBBBBEWDDD......MFFFFFFFM.",
      "..FFFMFFF.......DDDWEBBBBBBKKBBBBBBEWDDD.......FFFMFFF..",
      "..FFFFFF........DDBBBBKKKKBBBBKKKKBBBBDD........FFFFFF..",
      "..FFFMF.........DDBBBBKKKKBKKBKKKKBBBBDD.........FMFFF..",
      "..FFFFF.........DDBBBBBKKKBBBBKKKBBBBBDD.........FFFFF..",
      "..FFFM.........DPPBBBBBBKKBKKBKKBBBBBBPPD.........MFFF..",
      "...FF..........DDDBBBBBBBOOOOOOBBBBBBBDDD..........FF...",
      "...F...........DDBBBBBBBBBBKKBBBBBBBBBBDD...........F...",
      "...............DDBBBBBBBBBBBBBBBBBBBBBBDD...............",
      "...............DDBBBBBBBBBBKKBBBBBBBBBBDD...............",
      "...............DDBBBBBBBBBBBBBBBBBBBBBBDD...............",
      "..............DDDBBBBBBBBBBKKBBBBBBBBBBDDD..............",
      "..............DDDBBBBBBLLLLLLLLLLBBBBBBDDD..............",
      "..............DDBBBBBBBLLLLLLLLLLBBBBBBBDD..............",
      "..............DDBBBBBBLLLLLLLLLLLLBBBBBBDD..............",
      "..............DDBBBBBBBLLLLLLLLLLBBBBBBBDD..............",
      "..............DDBBBBBBBLLLLLLLLLLBBBBBBBDD..............",
      ".............DDDBBBBBBBBBBBBBBBBBBBBBBBBDDD.............",
      ".............DDDBBBBBBBBBBBBBBBBBBBBBBBBDDD.............",
      ".............DDDBBBBBBBBBBBBBBBBBBBBBBBBDDD.............",
      ".............DDBBBBBBBBBBBBBBBBBBBBBBBBBBDD.............",
      "........................................................",
      "........................................................",
      "........................................................",
      "........................................................"
    ]
  };
  /* 임수룡 팔레트: 물(심해 청록) 본체 + 금(은금) 비늘·뿔. glow만 단계별 눈빛. */
  var PAL = {
    B: "#4a96a8", D: "#2c687c", L: "#96d2dc", H: "#e2d8ba",
    W: "#ffffff", S: "#ffffff", O: "#964659", P: "#f496a2",
    K: "#e0d6a4", M: "#dcd2a0", F: "#6eb6c6", A: "#b4e6f0", V: "#78c878"
  };

  function svgFor(stageId, px) {
    px = px || 3;
    var grid = GRIDS[stageId] || GRIDS[0];
    var st = STAGES[stageId] || STAGES[0];
    var n = 56, dim = n * px, rects = "";
    for (var y = 0; y < n; y++) {
      var row = grid[y] || "";
      for (var x = 0; x < n; x++) {
        var c = row.charAt(x);
        if (!c || c === "." || c === " ") continue;
        var col = (c === "E") ? st.glow : PAL[c];
        if (!col) continue;
        rects += '<rect x="' + (x * px) + '" y="' + (y * px) + '" width="' + px + '" height="' + px + '" fill="' + col + '"/>';
      }
    }
    return '<svg viewBox="0 0 ' + dim + ' ' + dim + '" width="' + dim + '" height="' + dim +
      '" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">' +
      rects + '</svg>';
  }

  function progress(xp) {
    var st = stageFor(xp), nx = nextStage(st), pv = prevStage(st);
    var out = { stage: st, next: null, prev: (pv.id !== st.id ? pv : null), pct: 100, toNext: 0 };
    if (nx.id !== st.id) {
      var span = nx.min - st.min, into = xp - st.min;
      out.next = nx; out.pct = Math.round(into / span * 100); out.toNext = nx.min - xp;
    }
    out.marginToDrop = xp - st.min;
    return out;
  }

  root.Mascot = {
    STAGES: STAGES, computeXP: computeXP, stageFor: stageFor,
    progress: progress, svg: svgFor
  };
})(window);
