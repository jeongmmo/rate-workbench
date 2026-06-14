/* =====================================================================
   mascot.js — 전망 적중 점수 엔진 (숫자 표시용)
   적중하면 XP 상승(등급 상승), 빗나가면 차감(등급 하락).
   5등급. computeXP/progress/STAGES 제공.
   금리 변동성 큰 시기의 오답은 패널티 경감. window.Mascot 노출.
   ===================================================================== */
(function (root) {
  "use strict";

  var VOL_THRESHOLD = 0.20;
  var VOL_RELIEF = 0.5;

  function computeXP(data) {
    var recs = (data && data.records) || [];
    var xp = 0, hits = 0, evaluated = 0, precise = 0, misses = 0, relieved = 0;
    recs.forEach(function (r) {
      if (r.error === null || r.error === undefined) return;
      evaluated++;
      var ae = Math.abs(r.error);
      var vol = (r.anchor !== null && r.anchor !== undefined && r.realized !== null && r.realized !== undefined)
        ? Math.abs(r.realized - r.anchor) : 0;
      var highVol = vol >= VOL_THRESHOLD;
      var relief = highVol ? VOL_RELIEF : 1;
      if (highVol) relieved++;
      if (r.direction_hit === true) { xp += 10; hits++; }
      else if (r.direction_hit === false) { xp -= 3 * relief; misses++; }
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

  /* 샴고양이 얼굴 5단계. glow=눈빛(파란 눈) */
  var STAGES = [
    { id: 0, name: "잠꾸러기 샴", min: 0,    glow: "#60a0da" },
    { id: 1, name: "뚠뚠 샴",     min: 200,  glow: "#60a0da" },
    { id: 2, name: "방긋 샴",     min: 600,  glow: "#5a9ad6" },
    { id: 3, name: "행복 샴",     min: 1300, glow: "#6aa8e0" },
    { id: 4, name: "여왕 샴",     min: 2400, glow: "#7ab8ee" }
  ];

  function stageFor(xp) {
    var s = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) if (xp >= STAGES[i].min) s = STAGES[i];
    return s;
  }
  function nextStage(stage) { return STAGES[Math.min(STAGES.length - 1, stage.id + 1)]; }
  function prevStage(stage) { return STAGES[Math.max(0, stage.id - 1)]; }



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
    progress: progress
  };
})(window);
