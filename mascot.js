/* =====================================================================
   mascot.js — 전망 적중도 픽셀 마스코트 "금리몬"
   알 → 슬라임 → 날개 달린 슬라임 드래곤. 적중하면 진화, 빗나가면 퇴화.
   32x32 픽셀. 추적 페이지와 포털이 공유. window.Mascot 노출.
   ===================================================================== */
(function (root) {
  "use strict";

  /* ---------- XP 계산: 보상 + 패널티 ----------
     [적중] 방향 +10 · 오차 ≤0.10%p +8 / ≤0.25 +4 / ≤0.50 +1
     [오답] 방향 틀림 −3 · 오차 >1.00%p −3 / >0.50 −2 / >0.25 −1
     [번복] 같은 (변수,타깃) 갱신 5회 무료, 6회차부터 −1(30일내 −2)
why: 적중엔 보상, 오답·과잉수정엔 패널티 → XP 하락 시 전 단계 퇴화 가능. */
  function computeXP(data) {
    var recs = (data && data.records) || [];
    var xp = 0, hits = 0, evaluated = 0, precise = 0, misses = 0;
    recs.forEach(function (r) {
      if (r.error === null || r.error === undefined) return;
      evaluated++;
      var ae = Math.abs(r.error);
      if (r.direction_hit === true) { xp += 10; hits++; }
      else if (r.direction_hit === false) { xp -= 3; misses++; }
      if (ae <= 0.10) { xp += 8; precise++; }
      else if (ae <= 0.25) { xp += 4; }
      else if (ae <= 0.50) { xp += 1; }
      else if (ae <= 1.00) { xp -= 1; }
      else if (ae <= 2.00) { xp -= 2; }
      else { xp -= 3; }
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
    if (xp < 0) xp = 0;
    return {
      xp: xp, evaluated: evaluated, hits: hits, precise: precise, misses: misses,
      hitRate: evaluated ? hits / evaluated : 0,
      revisions: revisions, rapidRevisions: rapidRevisions, revPenalty: revPenalty
    };
  }

  var STAGES = [
    { id: 0, name: "금리몬의 알",   min: 0,    glow: "#9a7bd8" },
    { id: 1, name: "슬라임 금리몬", min: 150,  glow: "#5fc0a0" },
    { id: 2, name: "새싹날개 금리몬", min: 400, glow: "#5fb0d0" },
    { id: 3, name: "날개 금리몬",   min: 800,  glow: "#5f90e0" },
    { id: 4, name: "비룡 금리몬",   min: 1400, glow: "#7f7be0" },
    { id: 5, name: "성룡 금리몬",   min: 2200, glow: "#e0b850" },
    { id: 6, name: "금리몬 킹",     min: 3400, glow: "#ff5a4a" }
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
      "................................",
      "................................",
      "................................",
      "............H......H............",
      "............H......H............",
      "............H......H............",
      "................................",
      "............DDDDDDDD............",
      "...........DDDBBBBDDD...........",
      "..........DDBBBBBBBBDD..........",
      ".........DDBBBBBBBBBBDD.........",
      ".........DBLLBBCCBBLLBD.........",
      "........DDBLBBCBBCBBLBDD........",
      "........DBBBBBBCCBBBBBBD........",
      "........DBBBBBCBBCBBBBBD........",
      "........DBBBBBBCCBBBBBBD........",
      "........DBBBBBCBBCBBBBBD........",
      ".......DDBBBBBBCCBBBBBBDD.......",
      "........DBBBBBBBBBBBBBBD........",
      "........DBBBBBBBBBBBBBBD........",
      "........DBBBBBBBBBBBBBBD........",
      "........DBBBBBBBBBBBBBBD........",
      "........DDBBBBBBBBBBBBDD........",
      ".........DBBBBBBBBBBBBD.........",
      ".........DDBBBBBBBBBBDD.........",
      "..........DDBBBBBBBBDD..........",
      "...........DDDBBBBDDD...........",
      "............DDDDDDDD............",
      "................................",
      "................................",
      "................................",
      "................................"
    ],
    1: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      ".............BBBBBB.............",
      "............BBLLLLBB............",
      "..........DBBBBLLBBBBD..........",
      "..........BBBBBBBBBBBB..........",
      ".........DBBBBBBBBBBBBD.........",
      "........DDSWBBBBBBBBWSDD........",
      "........DBWEBBBBBBBBEWBD........",
      "........DBBEBBBBBBBBEBBD........",
      ".......DDPBBBBBBBBBBBBPDD.......",
      ".......DBBBBBBMMMMBBBBBBD.......",
      ".......DBBBBBBBBBBBBBBBBD.......",
      ".......DBBBBBBBBBBBBBBBBD.......",
      "......DDBBBBBBBBBBBBBBBBDD......",
      "......DBBBBBLLLLLLLLBBBBBD......",
      "......DBBBBLLLLLLLLLLBBBBD......",
      "......DBBBBBLLLLLLLLBBBBBD......",
      ".....DDBBBBBBLLLLLLBBBBBBDD.....",
      ".....DDBBBBBBBBBBBBBBBBBBDD.....",
      ".....DBBBBBBBBBBBBBBBBBBBBD.....",
      "................................",
      "................................",
      "................................"
    ],
    2: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      ".............BBBBBB.............",
      "............BBBBBBBB............",
      ".......K...DBBBBBBBBD...K.......",
      ".......GK.DBBBBBBBBBBD.KG.......",
      ".......GGKKSWBBBBBBWSKKGG.......",
      "........GGGKEBBBBBBEKGGG........",
      "........GKGBEBBBBBBEBGKG........",
      "........GGPBBBBBBBBBBPGG........",
      "........GDBBBBBMMBBBBBDG........",
      "........DDBBBBBBBBBBBBDD........",
      "........DDBBBBBBBBBBBBDD........",
      "........DBBBBBBBBBBBBBBD........",
      "........DBBBLLLLLLLLBBBD........",
      "........DBBBBLLLLLLBBBBD........",
      ".......DDBBBBBLLLLBBBBBDD.......",
      ".......DDBBBBBBBBBBBBBBDD.......",
      ".......DBBBBBBBBBBBBBBBBD.......",
      "................................",
      "................................",
      "................................"
    ],
    3: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "....K......................K....",
      "....GKK..................KKG....",
      "....GGGK.....BBBBBB.....KGGG....",
      ".....GGKK...DBBBBBBD...KKGG.....",
      ".....GGGGKKDBBBBBBBBDKKGGGG.....",
      ".....GGKGGGKBBBBBBBBKGGGKGG.....",
      ".....GGGGGGDSWBBBBWSDGGGGGG.....",
      ".....GGKGGDBWEBBBBEWBDGGKGG.....",
      "......GGG.DBBBBBBBBBBD.GGG......",
      "......GK..DPBBBBBBBBPD..KG......",
      "......G..DDBBBBMMBBBBDD..G......",
      ".........DDBBLLLLLLBBDD.........",
      ".........DBBBBLLLLBBBBD.........",
      ".........DBBBBLLLLBBBBD.........",
      ".........DBBBBBBBBBBBBD.........",
      "........DDBBBBBBBBBBBBDD........",
      "................................",
      "................................",
      "................................"
    ],
    4: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "..K..........................K..",
      "..GK........................KG..",
      "..GGKK....................KKGG..",
      "...GGGK..................KGGG...",
      "...GGGKK................KKGGG...",
      "...GGGGGKK...BBBBBB...KKGGGGG...",
      "...GGGKGGGK.DBBBBBBD.KGGGKGGG...",
      "....GGGGGGGKBBBBBBBBKGGGGGGG....",
      "....GGKGGGGDBBBBBBBBDGGGGKGG....",
      "....GGGGGG.DSWBBBBWSD.GGGGGG....",
      "....GGKGG.DDWEBBBBEWDD.GGKGG....",
      ".....GGG..DBBBBBBBBBBD..GGG.....",
      ".....GK...DPBBBBBBBBPD...KG.....",
      ".....G....DBBBLMMLBBBD....G.....",
      "..........DBBBLLLLBBBD..........",
      ".........DDBBBBLLBBBBDD.........",
      ".........DDBBBBBBBBBBDD.........",
      ".........DBBBBBBBBBBBBD.........",
      "................................",
      "................................"
    ],
    5: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "K..............................K",
      "GKK..........................KKG",
      "GGGK.........H....H.........KGGG",
      ".GGGK........H....H........KGGG.",
      ".GGGGKK..................KKGGGG.",
      ".GGGGGGK................KGGGGGG.",
      ".GGGGKGGK..............KGGKGGGG.",
      ".GGGGGGGGKK..BBBBBB..KKGGGGGGGG.",
      "..GGGKGGGGGKDBBBBBBDKGGGGGKGGG..",
      "..GGGGGGGGGDBBBBBBBBDGGGGGGGGG..",
      "..GGGKGGGG.DBBBBBBBBD.GGGGKGGG..",
      "..GGGGGGG..DSWBBBBWSD..GGGGGGG..",
      "..GGGKGG..DDWEBBBBEWDD..GGKGGG..",
      "...GGG....DBBBBBBBBBBD....GGG...",
      "...GG.....DPBBBBBBBBPD.....GG...",
      "...G......DBBBLMMLBBBD......G...",
      "..........DBBBLLLLBBBD..........",
      ".........DDBBBBLLBBBBDD.........",
      ".........DDBBBBBBBBBBDD.........",
      ".........DBBBBBBBBBBBBD.........",
      "................................",
      "................................"
    ],
    6: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "K..............................K",
      "GKK..........................KKG",
      "GGGK.........H....H.........KGGG",
      "GGGGKK......H..HH..H......KKGGGG",
      "GGGGGGK.....H..HH..H.....KGGGGGG",
      "GGGGGKGK................KGKGGGGG",
      ".GGGGGGGK..............KGGGGGGG.",
      ".GGGGKGGGKK..........KKGGGKGGGG.",
      ".GGGGGGGGGGK.BBBBBB.KGGGGGGGGGG.",
      ".GGGGKGGGGG.BBBBBBBB.GGGGGKGGGG.",
      "..GGGGGGGG.DBBBBBBBBD.GGGGGGGG..",
      "..GGGKGGG.DDBBBBBBBBDD.GGGKGGG..",
      "..GGGGGG..DBSEBBBBESBD..GGGGGG..",
      "..GGGKG...DBEEBBBBEEBD...GKGGG..",
      "...GGG....DBBBBBBBBBBD....GGG...",
      "...GG....DDPBBBBBBBBPDD....GG...",
      "...G.....DDBBBLMMLBBBDD.....G...",
      ".........DBBBBLLLLBBBBD.........",
      ".........DBBBBBLLBBBBBD.........",
      ".........DBBBBBBBBBBBBD.........",
      "........DDBBBBBBBBBBBBDD........",
      "................................",
      "................................"
    ]
  };
  /* 슬라임 팔레트(청록 본체). glow만 단계별. */
  var PAL = {
    B: "#60b896", D: "#3a8068", L: "#96dec0", H: "#e2d8ba",
    W: "#ffffff", S: "#ffffff", M: "#a84e67", P: "#f496a2",
    C: "#78c8aa", G: "#50a28a", K: "#367662"
  };

  function svgFor(stageId, px) {
    px = px || 4;
    var grid = GRIDS[stageId] || GRIDS[0];
    var st = STAGES[stageId] || STAGES[0];
    var n = 32, dim = n * px, rects = "";
    for (var y = 0; y < n; y++) {
      var row = grid[y] || "";
      for (var x = 0; x < n; x++) {
        var c = row.charAt(x);
        if (!c || c === "." || c === " ") continue;
        var col = (c === "E" || c === "F") ? st.glow : PAL[c];
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
