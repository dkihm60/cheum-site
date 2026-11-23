/* 채움 견적의뢰 — Supabase 호출 + 공통 유틸 (SDK 없이 fetch만 사용) */
(function () {
  'use strict';
  var cfg = window.CHEUM_SUPABASE || {};
  var BASE = String(cfg.url || '').replace(/\/+$/, '');
  var KEY = cfg.anonKey || '';
  var BUCKET = 'quote-files';
  /* 새 Publishable 키(sb_publishable_…)는 apikey 헤더로만 보내고, 예전 JWT형 anon 키는 Authorization 에도 보냅니다 */
  function hdr(extra) {
    var h = { apikey: KEY };
    if (/^eyJ/.test(KEY)) h.Authorization = 'Bearer ' + KEY;
    for (var k in extra) h[k] = extra[k];
    return h;
  }
  var MAX_MB = 30;
  var EXT_OK = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'xls', 'xlsx', 'doc', 'docx', 'hwp', 'hwpx', 'ppt', 'pptx', 'dwg', 'dxf', 'txt'];
  var MSG = {
    AUTH_REQUIRED: '로그인이 필요하거나 접속 시간이 만료되었습니다. 다시 로그인해 주세요.',
    FORBIDDEN: '권한이 없습니다.',
    LOCKED: '로그인 시도가 5회 실패하여 10분간 잠겼습니다. 잠시 후 다시 시도해 주세요.',
    BAD_LOGIN: '아이디 또는 비밀번호가 맞지 않습니다.'
  };

  function ls(k, v) {
    try {
      if (v === undefined) return sessionStorage.getItem(k);
      if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v);
    } catch (e) { /* 저장소를 못 쓰는 환경: 새로고침 시 다시 로그인 */ }
    return null;
  }
  var mem = {};
  function token(scope, v) {
    var k = 'cheum_tok_' + scope;
    if (v === undefined) return mem[k] || ls(k);
    mem[k] = v || null; ls(k, v || null);
    return v;
  }
  function msgOf(m) {
    m = String(m || '');
    if (m.indexOf('ERR:') === 0) return m.slice(4);
    return MSG[m] || '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }
  function rpc(fn, args) {
    if (!BASE || !KEY) return Promise.reject(new Error('서비스 연결 설정이 아직 되어 있지 않습니다.'));
    return fetch(BASE + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: hdr({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(args || {})
    }).then(function (res) {
      return res.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { /* 비 JSON */ }
        if (!res.ok) {
          var m = j && j.message, c = j && j.code, err;
          if (m && (m.indexOf('ERR:') === 0 || MSG[m])) err = new Error(msgOf(m));
          else if (c === 'PGRST202' || res.status === 404) err = new Error('서버(Supabase) 설정이 최신이 아닙니다. 관리자에게 문의해 주세요. [함수 없음: ' + fn + ' — SQL 스키마 재실행 필요]');
          else if (res.status === 401 || res.status === 403) err = new Error('서버 접근 키가 올바르지 않거나 권한이 없습니다. [' + res.status + ']');
          else err = new Error('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. [' + (c || res.status) + (m ? ': ' + String(m).slice(0, 80) : '') + ']');
          err.code = m; throw err;
        }
        return j;
      });
    }, function () { throw new Error('서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.'); });
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function extOf(n) { var m = /\.([A-Za-z0-9]{1,5})$/.exec(n || ''); return m ? m[1].toLowerCase() : ''; }
  function checkFile(f) {
    if (EXT_OK.indexOf(extOf(f.name)) < 0) return '"' + f.name + '" — 첨부할 수 없는 파일 형식입니다. (' + EXT_OK.join(', ') + ')';
    if (f.size > MAX_MB * 1024 * 1024) return '"' + f.name + '" — 파일 크기는 ' + MAX_MB + 'MB 이하만 가능합니다.';
    if (f.size === 0) return '"' + f.name + '" — 빈 파일입니다.';
    return '';
  }
  function upload(file) {
    var path = uuid() + '/' + uuid().replace(/-/g, '').slice(0, 16) + '.' + extOf(file.name);
    return fetch(BASE + '/storage/v1/object/' + BUCKET + '/' + path, {
      method: 'POST',
      headers: hdr({ 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }),
      body: file
    }).then(function (res) {
      if (!res.ok) throw new Error('"' + file.name + '" 업로드에 실패했습니다.');
      return { file_name: file.name, file_path: path, file_size: file.size };
    }, function () { throw new Error('"' + file.name + '" 업로드 중 연결이 끊어졌습니다.'); });
  }
  function fileUrl(path, name) { return BASE + '/storage/v1/object/public/' + BUCKET + '/' + path + (name ? '?download=' + encodeURIComponent(name) : ''); }

  /* 사업자등록번호 검증번호(체크섬) */
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function validBiz(s) {
    var d = digits(s); if (d.length !== 10) return false;
    var w = [1, 3, 7, 1, 3, 7, 1, 3, 5], sum = 0, i;
    for (i = 0; i < 9; i++) sum += +d[i] * w[i];
    sum += Math.floor(+d[8] * 5 / 10);
    return (10 - sum % 10) % 10 === +d[9];
  }
  function fmtBiz(s) {
    var d = digits(s).slice(0, 10);
    if (d.length > 5) return d.slice(0, 3) + '-' + d.slice(3, 5) + '-' + d.slice(5);
    if (d.length > 3) return d.slice(0, 3) + '-' + d.slice(3);
    return d;
  }
  function fmtPhone(s) {
    var d = digits(s).slice(0, 11);
    if (!d) return '';
    if (/^1[0-9]{3}/.test(d) && d.length <= 8) return d.length > 4 ? d.slice(0, 4) + '-' + d.slice(4) : d;
    var a = d.indexOf('02') === 0 ? 2 : 3;
    if (d.length <= a) return d;
    var rest = d.slice(a);
    if (rest.length <= 4) return d.slice(0, a) + '-' + rest;
    return d.slice(0, a) + '-' + rest.slice(0, rest.length - 4) + '-' + rest.slice(-4);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function size(n) {
    n = +n || 0; return n < 1024 ? n + 'B' : n < 1048576 ? Math.round(n / 1024) + 'KB' : (n / 1048576).toFixed(1) + 'MB';
  }

  window.Cheum = {
    ready: !!(BASE && KEY), rpc: rpc, upload: upload, fileUrl: fileUrl, checkFile: checkFile,
    token: token, validBiz: validBiz, fmtBiz: fmtBiz, fmtPhone: fmtPhone, digits: digits,
    esc: esc, size: size, EXT_OK: EXT_OK, MAX_MB: MAX_MB
  };
})();
