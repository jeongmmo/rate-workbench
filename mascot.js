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
    var xp = 0, hits = 0, evaluated = 0, precise = 0, misses = 0, relieved = 0, beatRW = 0;
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
      // 랜덤워크 격파 보너스: 무변화 가정보다 정확하면 +6 (진짜 실력의 신호)
      if (r.anchor !== null && r.anchor !== undefined && r.realized !== null && r.realized !== undefined) {
        var rwErr = Math.abs(r.realized - r.anchor);
        if (ae < rwErr - 1e-9) { xp += 6; beatRW++; }
      }
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
      hitRate: evaluated ? hits / evaluated : 0, volRelieved: relieved, beatRW: beatRW,
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

  /* ---------- 랜덤워크 벤치마크 ----------
     랜덤워크 예측 = 전망 시점 시장값(anchor)을 무변화로 가정.
     "내 전망이 단순 무변화보다 나았는가"가 전망의 진짜 가치.
     스킬 스코어 = 1 − (내 MAE / 랜덤워크 MAE). 양수면 랜덤워크 이김. */
  function rwBenchmark(data) {
    var recs = (data && data.records) || [];
    var ev = recs.filter(function (r) {
      return r.realized !== null && r.realized !== undefined
        && r.anchor !== null && r.anchor !== undefined
        && r.forecast !== null && r.forecast !== undefined;
    });
    var sumMy = 0, sumRw = 0, beat = 0, lose = 0, tie = 0;
    var byVar = {};
    ev.forEach(function (r) {
      var myErr = Math.abs(r.realized - r.forecast);
      var rwErr = Math.abs(r.realized - r.anchor);
      sumMy += myErr; sumRw += rwErr;
      if (myErr < rwErr - 1e-9) beat++;
      else if (myErr > rwErr + 1e-9) lose++;
      else tie++;
      var v = r.variable;
      if (!byVar[v]) byVar[v] = { my: 0, rw: 0, beat: 0, n: 0 };
      byVar[v].my += myErr; byVar[v].rw += rwErr; byVar[v].n++;
      if (myErr < rwErr - 1e-9) byVar[v].beat++;
    });
    var perVar = Object.keys(byVar).sort().map(function (v) {
      var d = byVar[v];
      return {
        variable: v, n: d.n,
        myMAE: d.my / d.n, rwMAE: d.rw / d.n,
        skill: d.rw > 0 ? 1 - (d.my / d.rw) : 0,
        winRate: d.beat / d.n
      };
    });
    return {
      evaluated: ev.length, beat: beat, lose: lose, tie: tie,
      myMAE: ev.length ? sumMy / ev.length : 0,
      rwMAE: ev.length ? sumRw / ev.length : 0,
      skill: sumRw > 0 ? 1 - (sumMy / sumRw) : 0,
      winRate: ev.length ? beat / ev.length : 0,
      perVariable: perVar
    };
  }

  /* ---------- 회귀 벤치마크 (구조 모델) ----------
     툴킷의 회귀(예: 미국_10y = f(미국_3m, BEI))가 함의하는 값 vs 내 전망 vs 실현.
     회귀 예측은 평가 시점의 '실현된 설명변수'로 계산 → 구조적 관계가 유지됐는지 측정.
     tsData = us_term_structure.json (회귀 계수 + 월별 series 포함).
     현재 미국_10y만 산출 가능(설명변수가 series에 모두 존재). */
  function regBenchmark(data, tsData) {
    var out = { available: false, variable: "미국_10y", rows: [], note: "" };
    if (!tsData || !tsData.regressions || !tsData.series) { out.note = "회귀 결과 없음"; return out; }
    var reg = null;
    tsData.regressions.forEach(function (r) { if (r.y === "미국_10y") reg = r; });
    if (!reg || !reg.coef) { out.note = "미국_10y 회귀 없음"; return out; }
    var s = tsData.series, dates = s.dates, vals = s.values;
    // 설명변수가 series에 모두 있는지
    var Xs = reg.X.filter(function (x) { return x !== "const"; });
    var ok = Xs.every(function (x) { return vals[x]; });
    if (!ok) { out.note = "설명변수 series 부족"; return out; }
    function at(v, d) { var i = dates.indexOf(d); return i >= 0 ? vals[v][i] : null; }
    function predict(d) {
      var p = reg.coef.const || 0, miss = false;
      Xs.forEach(function (x) {
        var xv = at(x, d);
        if (xv === null || xv === undefined) miss = true;
        else p += (reg.coef[x] || 0) * xv;
      });
      return miss ? null : p;
    }
    var recs = (data && data.records) || [];
    var ev = recs.filter(function (r) {
      return r.variable === "미국_10y" && r.realized !== null && r.realized !== undefined
        && r.forecast !== null && r.forecast !== undefined;
    });
    var sumMy = 0, sumReg = 0, beatReg = 0, n = 0;
    ev.forEach(function (r) {
      var rp = predict(r.target_end);
      if (rp === null) return;
      var myErr = Math.abs(r.realized - r.forecast);
      var regErr = Math.abs(r.realized - rp);
      sumMy += myErr; sumReg += regErr; n++;
      if (myErr < regErr - 1e-9) beatReg++;
      out.rows.push({
        target: r.target, date: r.forecast_date,
        myForecast: r.forecast, regForecast: rp, realized: r.realized,
        myErr: myErr, regErr: regErr
      });
    });
    if (n > 0) {
      out.available = true;
      out.evaluated = n;
      out.myMAE = sumMy / n;
      out.regMAE = sumReg / n;
      out.skillVsReg = sumReg > 0 ? 1 - (sumMy / sumReg) : 0;
      out.beat = beatReg;
      out.regName = reg.name;
      out.r2 = reg.r2;
    } else {
      out.note = "평가 가능한 시점 없음";
    }
    return out;
  }

  root.Mascot = {
    STAGES: STAGES, computeXP: computeXP, stageFor: stageFor,
    progress: progress, xpTrend: xpTrend, rwBenchmark: rwBenchmark, regBenchmark: regBenchmark
  };
})(window);
