/* =====================================================================
   mascot.js — 전망 적중 점수 엔진 (숫자 표시용)
   적중하면 XP 상승(등급 상승), 빗나가면 차감(등급 하락).
   7등급. computeXP/progress/STAGES 제공.
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
    { id: 0, name: "Lv.1", min: 0,    glow: "#60a0da" },
    { id: 1, name: "Lv.2", min: 150,  glow: "#60a0da" },
    { id: 2, name: "Lv.3", min: 400,  glow: "#5a9ad6" },
    { id: 3, name: "Lv.4", min: 800,  glow: "#6aa8e0" },
    { id: 4, name: "Lv.5", min: 1400, glow: "#7ab8ee" },
    { id: 5, name: "Lv.6", min: 2200, glow: "#7ab8ee" },
    { id: 6, name: "Lv.7", min: 3400, glow: "#7ab8ee" }
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

  /* ---------- 점수 추이: 전망 제출일(forecast_date) 누적 XP ----------
     각 제출 라운드까지 누적된 데이터로 XP를 재계산 → 시간에 따른 점수 변화. */
  function xpTrend(data) {
    var recs = (data && data.records) || [];
    var dates = {};
    recs.forEach(function (r) { if (r.forecast_date) dates[r.forecast_date] = 1; });
    var keys = Object.keys(dates).sort();
    return keys.map(function (d) {
      var sub = { records: recs.filter(function (r) { return r.forecast_date <= d; }) };
      var x = computeXP(sub);
      var pr = progress(x.xp);
      return { date: d, xp: x.xp, stage: pr.stage.id, evaluated: x.evaluated };
    });
  }

  root.Mascot = {
    STAGES: STAGES, computeXP: computeXP, stageFor: stageFor,
    progress: progress, xpTrend: xpTrend
  };
})(window);
