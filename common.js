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

  function bridgeFields() {
    Object.keys(FIELD_KEYS).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var key = FIELD_KEYS[id];
      var stored = null;
      try { stored = sessionStorage.getItem(key); } catch (e) { /* file:// 등 */ }
      if (stored !== null && stored !== "") el.value = stored;      // 포털 값으로 채움
      el.addEventListener("change", function () {                   // 수정 시 다시 공유
        try { sessionStorage.setItem(key, el.value); } catch (e) {}
      });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bridgeFields);
  } else {
    bridgeFields();
  }

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
    var res = await fetch(url, { headers: headers(cfg.token, "application/vnd.github.raw+json") });
    if (!res.ok) throw new Error(explain(res.status));
    var buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  /** sessionStorage에 저장된 현재 설정 읽기 */
  function currentConfig() {
    function g(k, d) { try { return sessionStorage.getItem(k) || d; } catch (e) { return d; } }
    return {
      owner: g("gh_owner", "jeongmmo"),
      repo:  g("gh_repo",  "research-data"),
      ref:   g("gh_ref",   ""),
      token: g("gh_token", ""),
      path:  g("gh_path",  "")
    };
  }

  function saveConfig(cfg) {
    try {
      sessionStorage.setItem("gh_owner", cfg.owner || "");
      sessionStorage.setItem("gh_repo",  cfg.repo  || "");
      sessionStorage.setItem("gh_ref",   cfg.ref   || "");
      sessionStorage.setItem("gh_token", cfg.token || "");
      if (cfg.path !== undefined) sessionStorage.setItem("gh_path", cfg.path || "");
    } catch (e) {}
  }

  /** Actions가 만든 사전계산 결과 읽기: results/<name>.json
      ① 같은 출처(GitHub Pages) 상대경로 시도 → ② GitHub API 폴백(비공개 저장소) */
  async function loadResults(cfg, name) {
    try {
      var r = await fetch("./results/" + name + ".json", { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch (e) { /* file:// 또는 Pages 미사용 → API로 */ }
    var bytes = await fetchFile(cfg, "results/" + name + ".json");
    return JSON.parse(new TextDecoder("utf-8").decode(bytes));
  }

  root.GHCommon = {
    loadResults: loadResults,
    repoInfo: repoInfo,
    listDataFiles: listDataFiles,
    fetchFile: fetchFile,
    currentConfig: currentConfig,
    saveConfig: saveConfig,
    headers: headers
  };
})(window);
