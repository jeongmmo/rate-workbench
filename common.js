/* =====================================================================
   common.js — 공통 모듈 (포털 + 분석 페이지 3종이 공유)
   역할 1) 세션 브리지: 포털에서 입력한 owner/repo/ref/token/path를
           sessionStorage로 공유 → 각 분석 페이지가 자동으로 이어받음
   역할 2) GitHub API 헬퍼: 저장소 확인, 데이터 파일 목록, 파일 다운로드
   주의: 토큰은 sessionStorage에만 저장 (탭/브라우저 종료 시 소멸,
         디스크에 영구 저장되지 않음). file:// 로 열면 페이지 간
         공유가 되지 않으므로 GitHub Pages 또는 로컬 서버로 서빙할 것.
   ===================================================================== */
(function (root) {
  "use strict";

  /* ---------- 1. 세션 브리지 ---------- */
  var FIELD_KEYS = {
    ghOwner: "gh_owner",
    ghRepo:  "gh_repo",
    ghRef:   "gh_ref",
    ghToken: "gh_token",
    ghPath:  "gh_path"
  };

  /* 저장 계층: localStorage("이 브라우저에 기억" 모드, 탭과 무관하게 공유)
     → 없으면 sessionStorage(탭 한정). 읽기는 둘 다, 쓰기는 현재 모드를 따름 */
  function storeGet(key) {
    try {
      var v = localStorage.getItem(key);
      if (v !== null) return v;
    } catch (e) {}
    try { return sessionStorage.getItem(key); } catch (e) {}
    return null;
  }
  function storeSet(key, val) {
    var remember = false;
    try { remember = localStorage.getItem("gh_remember") === "1"; } catch (e) {}
    try {
      if (remember) { localStorage.setItem(key, val); sessionStorage.removeItem(key); }
      else { sessionStorage.setItem(key, val); localStorage.removeItem(key); }
    } catch (e) {}
  }
  function storeClearAll() {
    Object.keys(FIELD_KEYS).forEach(function (id) {
      var k = FIELD_KEYS[id];
      try { localStorage.removeItem(k); } catch (e) {}
      try { sessionStorage.removeItem(k); } catch (e) {}
    });
    try { localStorage.removeItem("gh_remember"); } catch (e) {}
  }

  var _userCleared = {};   // 사용자가 "지우기"로 명시적으로 비운 칸은 자동 복원 안 함

  function fillFields() {
    if (!document.body) return;
    Object.keys(FIELD_KEYS).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var stored = storeGet(FIELD_KEYS[id]);
      // 저장값이 있고, 칸이 비었고, 사용자가 일부러 지운 게 아니면 복원
      if (stored && !el.value && !_userCleared[id]) {
        el.value = stored;
        el.dispatchEvent(new Event("input",  { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (!el.dataset.ghBridged) {
        el.dataset.ghBridged = "1";
        el.addEventListener("change", function () {
          if (el.value) { _userCleared[id] = false; storeSet(FIELD_KEYS[id], el.value); }
        });
      }
    });
  }

  // DOM 준비 시 1차 채움
  function start() {
    fillFields();
    // 모듈 스크립트가 칸을 비우거나 늦게 그려도 즉시 되채우도록 DOM 변화를 감시
    try {
      var mo = new MutationObserver(function () { fillFields(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      // 입력칸이 코드로 비워지는 경우까지 잡기 위해 짧은 폴링을 잠시 가동(5초)
      var ticks = 0;
      var iv = setInterval(function () { fillFields(); if (++ticks > 50) clearInterval(iv); }, 100);
    } catch (e) { setTimeout(fillFields, 300); setTimeout(fillFields, 1000); }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else { start(); }
  window.addEventListener("load", fillFields);

  // 모듈의 "토큰 지우기" 버튼이 눌리면, 그 칸은 자동 복원 대상에서 제외
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t) return;
    var label = (t.textContent || "") + (t.id || "") + (t.className || "");
    if (/지우|clear|wipe|forget/i.test(label)) {
      Object.keys(FIELD_KEYS).forEach(function (id) { _userCleared[id] = true; });
    }
  }, true);

  /* ---------- 2. GitHub API 헬퍼 ---------- */
  var DATA_EXT = /\.(xlsx|xlsm|csv|tsv|txt)$/i;

  function headers(token, accept) {
    var h = { Accept: accept || "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28" };
    if (token) h.Authorization = "Bearer " + token;
    return h;
  }

  function explain(status) {
    if (status === 401) return "인증 실패(401): 토큰이 잘못되었거나 만료되었습니다.";
    if (status === 403) return "권한/요청한도 문제(403): 토큰 권한 또는 API rate limit을 확인하세요.";
    if (status === 404) return "찾을 수 없음(404): owner/repo/경로 오타, 또는 fine-grained PAT의 Repository access에 이 저장소가 빠진 경우입니다(비공개 저장소는 권한이 없으면 404로 보입니다).";
    return "HTTP " + status;
  }

  /** 저장소 메타 확인 → {defaultBranch, isPrivate, fullName} */
  async function repoInfo(cfg) {
    var res = await fetch("https://api.github.com/repos/" +
      encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo),
      { headers: headers(cfg.token) });
    if (!res.ok) throw new Error(explain(res.status));
    var j = await res.json();
    return { defaultBranch: j.default_branch, isPrivate: j.private, fullName: j.full_name };
  }

  /** 저장소 전체에서 데이터 파일(.xlsx/.xlsm/.csv/.tsv/.txt) 목록 → [{path,size}] */
  async function listDataFiles(cfg) {
    var ref = cfg.ref;
    if (!ref) ref = (await repoInfo(cfg)).defaultBranch;
    var res = await fetch("https://api.github.com/repos/" +
      encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo) +
      "/git/trees/" + encodeURIComponent(ref) + "?recursive=1",
      { headers: headers(cfg.token) });
    if (!res.ok) throw new Error(explain(res.status));
    var j = await res.json();
    return (j.tree || [])
      .filter(function (n) { return n.type === "blob" && DATA_EXT.test(n.path); })
      .map(function (n) { return { path: n.path, size: n.size || 0 }; })
      .sort(function (a, b) { return a.path.localeCompare(b.path); });
  }

  /** 파일 1개 다운로드 → Uint8Array (xlsx 파싱 라이브러리에 그대로 전달 가능) */
  async function fetchFile(cfg, path) {
    var url = "https://api.github.com/repos/" +
      encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo) +
      "/contents/" + path.split("/").map(encodeURIComponent).join("/") +
      (cfg.ref ? "?ref=" + encodeURIComponent(cfg.ref) : "");
    // 캐시버스팅: GitHub CDN이 푸시 후 오래된 results를 주는 것을 방지
    url += (url.indexOf("?") >= 0 ? "&" : "?") + "_=" + Date.now();
    var res = await fetch(url, {
      headers: headers(cfg.token, "application/vnd.github.raw+json"),
      cache: "no-store"
    });
    if (!res.ok) throw new Error(explain(res.status));
    var buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  /** sessionStorage에 저장된 현재 설정 읽기 */
  function currentConfig() {
    function g(k, d) { var v = storeGet(k); return (v !== null && v !== "") ? v : d; }
    return {
      owner: g("gh_owner", "jeongmmo"),
      repo:  g("gh_repo",  "research-data"),
      ref:   g("gh_ref",   ""),
      token: g("gh_token", ""),
      path:  g("gh_path",  "")
    };
  }

  function saveConfig(cfg, remember) {
    if (remember !== undefined) {
      try { localStorage.setItem("gh_remember", remember ? "1" : "0"); } catch (e) {}
    }
    storeSet("gh_owner", cfg.owner || "");
    storeSet("gh_repo",  cfg.repo  || "");
    storeSet("gh_ref",   cfg.ref   || "");
    storeSet("gh_token", cfg.token || "");
    if (cfg.path !== undefined) storeSet("gh_path", cfg.path || "");
  }

  /** Actions가 만든 사전계산 결과 읽기: results/<name>.json
      ① 같은 출처(GitHub Pages) 상대경로 시도 → ② GitHub API 폴백(비공개 저장소) */
  async function loadResults(cfg, name) {
    try {
      var r = await fetch("./results/" + name + ".json?_=" + Date.now(), { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch (e) { /* file:// 또는 Pages 미사용 → API로 */ }
    var bytes = await fetchFile(cfg, "results/" + name + ".json");
    return JSON.parse(new TextDecoder("utf-8").decode(bytes));
  }

  /** 저장소에 파일 커밋(생성/갱신): base64 내용 + 커밋 메시지.
      쓰기 권한(Contents: Read and write) 토큰 필요. 성공 시 commit URL 반환 */
  async function putFile(cfg, path, base64Content, message) {
    var base = "https://api.github.com/repos/" +
      encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo) +
      "/contents/" + path.split("/").map(encodeURIComponent).join("/");
    // 기존 파일 sha 조회 (없으면 신규 생성)
    var sha = null;
    var meta = await fetch(base + (cfg.ref ? "?ref=" + encodeURIComponent(cfg.ref) : ""),
      { headers: headers(cfg.token) });
    if (meta.ok) sha = (await meta.json()).sha;
    else if (meta.status !== 404) throw new Error(explain(meta.status));
    var body = { message: message, content: base64Content };
    if (sha) body.sha = sha;
    if (cfg.ref) body.branch = cfg.ref;
    var res = await fetch(base, {
      method: "PUT",
      headers: Object.assign(headers(cfg.token), { "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404)
        throw new Error("쓰기 권한 없음(" + res.status + "): 토큰의 Contents 권한이 Read and write인지, " +
          "Repository access에 이 저장소가 포함됐는지 확인하세요.");
      throw new Error(explain(res.status));
    }
    var j = await res.json();
    return j.commit && j.commit.html_url;
  }

  /** 입력칸 값보다 저장된 값을 우선 반환 (모듈이 토큰 읽을 때 사용) */
  function field(id) {
    var key = FIELD_KEYS[id];
    var v = key ? storeGet(key) : null;
    if (v) return v;
    var el = document.getElementById(id);
    return el ? el.value : "";
  }

  root.GHCommon = {
    loadResults: loadResults,
    field: field,
    putFile: putFile,
    clearStored: storeClearAll,
    repoInfo: repoInfo,
    listDataFiles: listDataFiles,
    fetchFile: fetchFile,
    currentConfig: currentConfig,
    saveConfig: saveConfig,
    headers: headers
  };
})(window);
