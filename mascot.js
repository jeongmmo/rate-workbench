/* =====================================================================
   mascot.js — 전망 적중도 픽셀 마스코트 (오리지널 캐릭터)
   "녹스(Nox)" — 금리를 예언하는 흑룡. 적중할수록 7단계로 진화한다.
   추적 페이지와 포털이 공유. window.Mascot 노출.
   ===================================================================== */
(function (root) {
  "use strict";

  function computeXP(data) {
    var xp = 0, hits = 0, evaluated = 0, precise = 0;
    var recs = (data && data.records) || [];
    recs.forEach(function (r) {
      if (r.error === null || r.error === undefined) return;
      evaluated++;
      var ae = Math.abs(r.error);
      if (r.direction_hit === true) { xp += 10; hits++; }
      if (ae <= 0.10) { xp += 8; precise++; }
      else if (ae <= 0.25) { xp += 4; }
      else if (ae <= 0.50) { xp += 1; }
    });
    return { xp: xp, evaluated: evaluated, hits: hits, precise: precise,
             hitRate: evaluated ? hits / evaluated : 0 };
  }

  var STAGES = [
    { id: 0, name: "흑룡의 알",    min: 0,    body: "#3a3a42", dark: "#22222a", glow: "#8a6bd0" },
    { id: 1, name: "해츨링",       min: 150,  body: "#36363f", dark: "#202028", glow: "#7d5fd0" },
    { id: 2, name: "윙드 드레이크", min: 400,  body: "#323240", dark: "#1c1c26", glow: "#6f8fe0" },
    { id: 3, name: "영 드래곤",     min: 800,  body: "#2e2e3c", dark: "#191922", glow: "#5fc0e0" },
    { id: 4, name: "스톰 와이번",   min: 1400, body: "#2b2b3a", dark: "#161620", glow: "#58d0c0" },
    { id: 5, name: "엘더 드래곤",   min: 2200, body: "#28283a", dark: "#131320", glow: "#d6a84a" },
    { id: 6, name: "녹스, 종말룡",  min: 3400, body: "#242438", dark: "#10101e", glow: "#e0483a" }
  ];

  function stageFor(xp) {
    var s = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) if (xp >= STAGES[i].min) s = STAGES[i];
    return s;
  }
  function nextStage(stage) { return STAGES[Math.min(STAGES.length - 1, stage.id + 1)]; }

  var GRIDS = {
    0: [
      "......HH........",
      ".....DDDD.......",
      "....DBBBBD......",
      "...DBBBBBBD.....",
      "...DBBBBBBD.....",
      "..DBBBFBBBBD....",
      "..DBBFBBBBBD....",
      "..DBBBBFBBBD....",
      "..DBBBBBFBBD....",
      "..DBBBFBBBBD....",
      "...DBBBBBBD.....",
      "...DBBBBBBD.....",
      "....DBBBBD......",
      ".....DDDD.......",
      "................",
      "................"
    ],
    1: [
      "...H........H...",
      "...HD......DH...",
      "....DBBBBBBD....",
      "...DBBBBBBBBD...",
      "..DBEEBBBBEEBD..",
      "..DBEEBBBBEEBD..",
      "..DBBBBBBBBBBD..",
      "..DBBBFFFFBBBD..",
      "...DBBBBBBBBD...",
      "..WDBBBBBBBBDW..",
      ".W..DBBBBBBD..W.",
      ".....DBBBBD.....",
      "......DBBD....DD",
      ".......DD...DDB.",
      "................",
      "................"
    ],
    2: [
      "..WW......WW....",
      ".WBBW....WBBW...",
      "WWBBWW..WWBBWW..",
      "WBBBBW..WBBBBW..",
      ".WBBW.HBBH.WBBW.",
      "..WW.DBEEBD.WW..",
      ".....DBBBBD.....",
      ".....DBFFBD.....",
      ".....DBBBBD.....",
      "......DBBD......",
      "......DBBD......",
      ".....DBBBD......",
      "....DBBD........",
      "...DBBD.....HH..",
      "..DDD.....HH....",
      "................"
    ],
    3: [
      ".WW..HH..HH..WW.",
      "WBBW.HH..HH.WBBW",
      "WBBBW......WBBBW",
      "WBBBBW HH WBBBBW",
      ".WBBBWBEEBWBBBW.",
      "..WWBDBBBBDBWW..",
      "....DBBBBBBD....",
      "FFF.DBBFFBBD....",
      "....DBBBBBBD....",
      "....DBBBBBBD....",
      ".....DBBBBD.....",
      ".....DBBBD......",
      "....DBBD........",
      "...DBBD.....HH..",
      "..DDD.....HHH...",
      "................"
    ],
    4: [
      "WW..HH....HH..WW",
      "WBBW.HH..HH.WBBW",
      "WBBBW.HH.H.WBBBW",
      "WBBBBW....WBBBBW",
      "WBBBBWHBBHWBBBBW",
      ".WBBBDBEEBDBBBW.",
      "..WWDBBBBBBDWW..",
      "FFF.DBBFFBBD....",
      "....DBBBBBBD....",
      "....DBBBBBBD....",
      ".....DBBBBD..H..",
      ".....DBBBD..HH..",
      "....DBBD...HH...",
      "...DBBD..HH.....",
      "..DDD..HH.......",
      "................"
    ],
    5: [
      "HWWWWW..WWWWWH..",
      "HHWWWWWWWWWWWHH.",
      "WWWBBBWWBBBWWWW.",
      "WBBBBBBWWBBBBBW.",
      "WBBBBBBWWBBBBBW.",
      "HWWBBBDBBDBBBWW.",
      "HH.WDBEBBEBDW...",
      "FFFFDBBBBBBBD...",
      ".FF.DBBHHBBBD...",
      "....DBBBBBBBD...",
      "....DBBBBBBD.H..",
      "...DBBBBBBD.HH..",
      "..DBBBBBD.HH....",
      "..DBBBD.HH......",
      ".DDD..HH........",
      "......H........."
    ],
    6: [
      "HWWWWWWWWWWWWWH.",
      "HHWWWWWWWWWWWHH.",
      "WWWBBBBWWBBBBWW.",
      "WBBBBBBWWBBBBBW.",
      "WBBBBBBWWBBBBBW.",
      "HWWBBBBDBBBBBWW.",
      "HHWWBEEBBEEBWWH.",
      "FFFFFBBBBBBBBDH.",
      "FFF.DBBHHHBBBD..",
      ".F..DBBBBBBBBD..",
      "....DBBBBBBBD.H.",
      "...DBBBBBBBD.HH.",
      "..DBBBBBBD.HH...",
      "..DBBBBD.HH.....",
      ".DDDD..HHH......",
      "H....HH........."
    ]
  };

  function mix(a, b, t) {
    function p(h, i) { return parseInt(h.replace("#", "").substr(i, 2), 16); }
    var r = Math.round(p(a, 0) * (1 - t) + p(b, 0) * t);
    var g = Math.round(p(a, 2) * (1 - t) + p(b, 2) * t);
    var bl = Math.round(p(a, 4) * (1 - t) + p(b, 4) * t);
    return "#" + [r, g, bl].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }

  function svgFor(stageId, px) {
    px = px || 9;
    var grid = GRIDS[stageId] || GRIDS[0];
    var st = STAGES[stageId] || STAGES[0];
    var palette = {
      B: st.body, D: st.dark, H: "#c8c8d2",
      E: st.glow, F: st.glow, W: mix(st.body, st.dark, 0.5)
    };
    var n = 16, dim = n * px, rects = "";
    for (var y = 0; y < n; y++) {
      var row = grid[y] || "";
      for (var x = 0; x < n; x++) {
        var c = row.charAt(x);
        if (!c || c === "." || c === " ") continue;
        var col = palette[c];
        if (!col) continue;
        rects += '<rect x="' + (x * px) + '" y="' + (y * px) + '" width="' + px + '" height="' + px + '" fill="' + col + '"/>';
      }
    }
    return '<svg viewBox="0 0 ' + dim + ' ' + dim + '" width="' + dim + '" height="' + dim +
      '" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">' +
      rects + '</svg>';
  }

  function progress(xp) {
    var st = stageFor(xp), nx = nextStage(st);
    if (nx.id === st.id) return { stage: st, next: null, pct: 100, toNext: 0 };
    var span = nx.min - st.min, into = xp - st.min;
    return { stage: st, next: nx, pct: Math.round(into / span * 100), toNext: nx.min - xp };
  }

  root.Mascot = {
    STAGES: STAGES,
    computeXP: computeXP,
    stageFor: stageFor,
    progress: progress,
    svg: svgFor
  };
})(window);
