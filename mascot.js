/* =====================================================================
   mascot.js — 전망 적중도 픽셀 마스코트 (오리지널 캐릭터)
   "리트(Rate)" — 금리를 예측하는 작은 생물. 적중할수록 진화한다.
   추적 페이지와 포털이 공유. window.Mascot 노출.
   ===================================================================== */
(function (root) {
  "use strict";

  /* ---------- XP 계산: forecast_eval 결과 → 경험치/레벨/단계 ---------- */
  // 평가 완료된 전망마다:
  //   방향 적중(direction_hit=true) → +10 XP
  //   오차 정확도 보너스 → |error|<=0.10:+8, <=0.25:+4, <=0.50:+1 (절대값, %p)
  function computeXP(data) {
    var xp = 0, hits = 0, evaluated = 0, precise = 0;
    var recs = (data && data.records) || [];
    recs.forEach(function (r) {
      if (r.error === null || r.error === undefined) return;  // 미도래 제외
      evaluated++;
      var ae = Math.abs(r.error);
      if (r.direction_hit === true) { xp += 10; hits++; }
      if (ae <= 0.10) { xp += 8; precise++; }
      else if (ae <= 0.25) { xp += 4; }
      else if (ae <= 0.50) { xp += 1; }
    });
    var hitRate = evaluated ? hits / evaluated : 0;
    return { xp: xp, evaluated: evaluated, hits: hits, precise: precise, hitRate: hitRate };
  }

  /* ---------- 단계 정의: XP 임계값 5단계 ---------- */
  var STAGES = [
    { id: 0, name: "리틀 에그",  min: 0,    color: "#cdb98f", accent: "#a8916a" },
    { id: 1, name: "새싹 리트",  min: 150,  color: "#7bbf8a", accent: "#4f9a63" },
    { id: 2, name: "주니어 리트", min: 450,  color: "#5aa9d6", accent: "#2f7fb0" },
    { id: 3, name: "세이지 리트", min: 900,  color: "#9a7fd0", accent: "#6f4fb0" },
    { id: 4, name: "오라클 리트", min: 1600, color: "#d6a84a", accent: "#b07d2b" }
  ];

  function stageFor(xp) {
    var s = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) if (xp >= STAGES[i].min) s = STAGES[i];
    return s;
  }
  function nextStage(stage) {
    return STAGES[Math.min(STAGES.length - 1, stage.id + 1)];
  }

  /* ---------- 픽셀 아트: 16x16 그리드를 SVG rect로 ---------- */
  // 각 단계별 도트맵. 문자 → 색 매핑.
  //  . 투명 / B 본체 / D 진한본체(음영) / E 눈 / W 흰자 / M 입·디테일 / A 강조(볼/장식)
  var GRIDS = {
    0: [ // 알: 둥근 달걀에 지그재그 금
      "................",
      ".....DDDDDD.....",
      "...DDBBBBBBDD...",
      "..DBBBBBBBBBBD..",
      "..DBBBBBBBBBBD..",
      ".DBBBBBBBBBBBBD.",
      ".DBBBBMMBBBBBBD.",
      ".DBBBMBBMBBBBBD.",
      ".DBBMBBBBMBBBBD.",
      ".DBBBBBBBBMBBBD.",
      "..DBBBBBBBMBBD..",
      "..DBBBBBBBBBBD..",
      "...DDBBBBBBDD...",
      ".....DDDDDD.....",
      "................",
      "................"
    ],
    1: [ // 새싹: 알에서 깨어난 작은 몸 + 머리 새싹
      ".......AA.......",
      "......A AA......",
      ".......AA.......",
      "......BBBB......",
      ".....DBBBBD.....",
      "....BBBBBBBB....",
      "...BBWEBBWEBB...",  // 눈
      "...BBWEBBWEBB...",
      "...BBBBBBBBBB...",
      "...BBBMMMMBBB...",  // 입
      "....DBBBBBBD....",
      ".....BB..BB.....",
      "....BB....BB....",
      "................",
      "................",
      "................"
    ],
    2: [ // 주니어: 또렷한 눈, 작은 귀, 볼
      "....B......B....",
      "...BB......BB...",
      "...BBBBBBBBBB...",
      "..BBBBBBBBBBBB..",
      ".DBBBBBBBBBBBBD.",
      ".BWWEBBBBBBWWEB.",
      ".BWWEBBBBBBWWEB.",
      ".AABBBBBBBBBBAA.",
      ".BBBBBMMMMBBBBB.",
      ".DBBBBBBBBBBBBD.",
      "..BBBBBBBBBBBB..",
      "..BB.BBBBBB.BB..",
      ".BB...BBBB...BB.",
      ".BB....BB....BB.",
      "................",
      "................"
    ],
    3: [ // 세이지: 머리 장식(안테나 보석), 망토 느낌
      ".......AA.......",
      ".......AA.......",
      "....BBBBBBBB....",
      "...BBBBBBBBBB...",
      "..BBBBBBBBBBBB..",
      ".DBWWEBBBBWWEBD.",
      ".BBWWEBBBBWWEBB.",
      ".BAABBBBBBBBAAB.",
      ".BBBBBMMMMBBBBB.",
      ".DBBBBBBBBBBBBD.",
      "AABBBBBBBBBBBBAA",  // 망토 어깨
      "ABBBBBBBBBBBBBBA",
      ".ABBBBBBBBBBBBA.",
      "..BB.BBBBBB.BB..",
      ".BB....BB....BB.",
      "................"
    ],
    4: [ // 오라클: 왕관, 빛나는 눈, 풍성한 형태
      ".A...AAAA...A...",
      ".AA.AABBAA.AA...",
      "..AAABBBBAAAA...",
      "...BBBBBBBBBB...",
      "..BBBBBBBBBBBB..",
      ".DBWWEBBBBWWEBD.",
      ".BBWWEBBBBWWEBB.",
      "ABAABBBBBBBBAABA",
      "ABBBBBMMMMBBBBBA",
      "A.DBBBBBBBBBBD.A",
      "AABBBBBBBBBBBBAA",
      "ABBBBBBBBBBBBBBA",
      ".ABBBBBBBBBBBBA.",
      "..ABB.BBBB.BBA..",
      ".AB....BB....BA.",
      "..A..........A.."
    ]
  };

  // 픽셀맵 → SVG 문자열. size=한 변 픽셀수(렌더 크기), bg 없음(투명)
  function svgFor(stageId, px) {
    px = px || 9;
    var grid = GRIDS[stageId] || GRIDS[0];
    var st = STAGES[stageId] || STAGES[0];
    var palette = {
      B: st.color, D: st.accent, A: lighten(st.color, 28),
      E: "#1c2433", W: "#ffffff", M: "#704a2e"
    };
    var n = 16, dim = n * px;
    var rects = "";
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

  function lighten(hex, amt) {
    var c = hex.replace("#", "");
    var r = Math.min(255, parseInt(c.substr(0, 2), 16) + amt);
    var g = Math.min(255, parseInt(c.substr(2, 2), 16) + amt);
    var b = Math.min(255, parseInt(c.substr(4, 2), 16) + amt);
    return "#" + [r, g, b].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }

  /* ---------- 진행도 ---------- */
  function progress(xp) {
    var st = stageFor(xp);
    var nx = nextStage(st);
    if (nx.id === st.id) return { stage: st, next: null, pct: 100, toNext: 0 };
    var span = nx.min - st.min;
    var into = xp - st.min;
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
