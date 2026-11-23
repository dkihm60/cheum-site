/* 관리자 화면 — 업체 조회(일괄/업체별)·수정·삭제, 사용자 관리 */
(function () {
  'use strict';
  var C = window.Cheum, F = window.CheumForm, esc = C.esc;
  var app = document.getElementById('app');
  var SCOPE = 'admin';
  var BUILD = '2026-11-23 i · 새로고침 시 재로그인';
  var S = { tab: 'co', view: 'all', q: '', companies: [], users: [], me: '' };

  function tok() { return C.token(SCOPE); }
  function call(fn, args) {
    args = args || {}; args.p_token = tok();
    return C.rpc(fn, args).catch(function (e) {
      if (e.code === 'AUTH_REQUIRED') { C.token(SCOPE, null); loginView('접속 시간이 만료되었습니다. 다시 로그인해 주세요.'); }
      throw e;
    });
  }

  /* ---------------- 로그인 ---------------- */
  function loginView(note) {
    app.innerHTML = '<div class="q-card q-login" style="margin-top:40px"><h2>관리자 로그인</h2>' +
      (C.ready ? '' : '<div class="q-note"><b>서비스 연결 전입니다.</b> assets/quote-config.js 에 Supabase 정보를 입력해야 합니다.</div>') +
      '<form novalidate><div class="q-f"><label for="a-id">아이디</label><input id="a-id" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
      '<div class="q-f"><label for="a-pw">비밀번호</label><input id="a-pw" type="password" autocomplete="new-password"></div>' +
      '<p class="q-msg ' + (note ? 'err' : '') + '" role="alert">' + esc(note || '') + '</p>' +
      '<button class="q-btn q-btn-red" style="width:100%" type="submit">로그인</button></form></div>';
    var f = app.querySelector('form'), m = f.querySelector('.q-msg');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = f.querySelector('button'); b.disabled = true;
      C.rpc('login', { p_username: f.querySelector('#a-id').value, p_password: f.querySelector('#a-pw').value }).then(function (r) {
        if (!r.ok) throw new Error(r.error === 'LOCKED' ? '로그인 시도가 5회 실패하여 10분간 잠겼습니다.' : '아이디 또는 비밀번호가 맞지 않습니다.');
        if (r.role !== 'admin') {
          C.rpc('logout', { p_token: r.token }).catch(function () { /* 무시 */ });
          throw new Error('관리자 계정이 아닙니다.');
        }
        C.token(SCOPE, r.token); S.me = r.username; return refresh();
      }).catch(function (er) { m.className = 'q-msg err'; m.textContent = er.message; b.disabled = false; });
    });
  }

  /* ---------------- 데이터 ---------------- */
  function refresh() {
    return Promise.all([call('list_companies'), call('list_users')]).then(function (r) {
      S.companies = r[0]; S.users = r[1];
      shell();
    });
  }

  /* ---------------- 껍데기 ---------------- */
  function shell() {
    var nSites = S.companies.reduce(function (n, c) { return n + c.sites.length; }, 0);
    app.innerHTML =
      '<div class="q-top"><div class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div><h1>견적의뢰 관리</h1>' +
      '<p class="q-count">업체 <b>' + S.companies.length + '</b>곳 · 사업장 <b>' + nSites + '</b>개 · 로그인: <b>' + esc(S.me || 'admin') +
      '</b> <button class="q-link" data-act="pw">비밀번호 변경</button> <button class="q-link" data-act="logout">로그아웃</button></p></div>' +
      '<div class="q-tabs" role="tablist"><button role="tab" data-t="co" aria-selected="' + (S.tab === 'co') + '">업체 조회</button>' +
      '<button role="tab" data-t="us" aria-selected="' + (S.tab === 'us') + '">사용자 관리</button></div>' +
      '<div id="body"></div><p class="q-foot">관리자 화면 버전 ' + esc(BUILD) + '</p>';
    app.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { S.tab = b.getAttribute('data-t'); shell(); }); });
    app.querySelector('[data-act="logout"]').addEventListener('click', function () {
      var t = tok(); C.token(SCOPE, null); if (t) C.rpc('logout', { p_token: t }).catch(function () { /* 무시 */ }); loginView();
    });
    app.querySelector('[data-act="pw"]').addEventListener('click', pwDialog);
    (S.tab === 'co' ? companyTab : userTab)(document.getElementById('body'));
  }

  /* ---------------- 업체 조회 ---------------- */
  function match(c) {
    var q = S.q.trim().toLowerCase(); if (!q) return true;
    var qd = C.digits(q);
    var hay = [c.name].concat(c.sites.map(function (s) { return s.site_name + ' ' + s.manager + ' ' + s.contact; })).join(' ').toLowerCase();
    return hay.indexOf(q) >= 0 || (qd && C.digits(c.biz_no).indexOf(qd) >= 0);
  }
  function companyTab(body) {
    body.innerHTML = '<div class="q-tools">' +
      '<div class="q-seg"><button data-v="all" aria-pressed="' + (S.view === 'all') + '">일괄 조회</button><button data-v="one" aria-pressed="' + (S.view === 'one') + '">업체별 조회</button></div>' +
      '<input class="q-in" type="search" id="srch" placeholder="회사명·사업자번호·사업장·담당자 검색" value="' + esc(S.q) + '" aria-label="검색" autocomplete="off">' +
      '<span class="q-count" id="cnt"></span>' +
      '<button class="q-btn q-btn-red" style="margin-left:auto" data-act="new">+ 업체 신규등록</button></div><div id="res"></div>';
    body.querySelectorAll('[data-v]').forEach(function (b) { b.addEventListener('click', function () { S.view = b.getAttribute('data-v'); companyTab(body); }); });

    /* 검색칸은 다시 그리지 않고(=한글 조합이 끊기지 않게) 결과 영역만 갱신한다.
       한글은 조합(composition)이 끝난 뒤에 검색한다. */
    var s = body.querySelector('#srch'), composing = false;
    s.addEventListener('compositionstart', function () { composing = true; });
    s.addEventListener('compositionend', function () { composing = false; S.q = s.value; refreshList(); });
    s.addEventListener('input', function (e) { if (composing || e.isComposing) return; S.q = s.value; refreshList(); });
    body.querySelector('[data-act="new"]').addEventListener('click', function () { companyDialog(); });
    refreshList();
  }

  /* 조회 조건에 맞게 건수·업체 선택목록·결과표만 갱신 (검색칸은 그대로 둠) */
  function refreshList() {
    var body = document.getElementById('body'); if (!body || S.tab !== 'co') return;
    var list = S.companies.filter(match);
    var cnt = body.querySelector('#cnt'); if (cnt) cnt.textContent = list.length + '건';
    drawResult(body, list);
  }

  function filesHtml(files) {
    return files.length ? '<ul>' + files.map(function (f) { return '<li><a href="' + esc(C.fileUrl(f.file_path, f.file_name)) + '" download="' + esc(f.file_name) + '" rel="noopener" title="클릭하면 다운로드">↓ ' + esc(f.file_name) + '</a></li>'; }).join('') + '</ul>' : '<span class="q-count">-</span>';
  }
  /* 20자까지만 표시, 넘으면 ... (전체는 마우스를 올리면 표시) */
  function cut20(t) { t = String(t || '').trim(); return t.length > 20 ? t.slice(0, 20) + '...' : t; }
  function addr(c) { return (c.zipcode ? '(' + c.zipcode + ') ' : '') + c.address + ' ' + (c.address_detail || ''); }
  function drawResult(body, list) {
    var res = body.querySelector('#res');
    if (S.view === 'one') {
      res.innerHTML = list.length ? '<div class="q-tw"><table class="q-t" style="min-width:820px"><thead><tr><th>회사명</th><th>사업자번호</th><th>전화번호</th><th>주소</th><th>사업장</th><th>상세조회</th></tr></thead><tbody>' +
        list.map(function (c) {
          return '<tr><td><b>' + esc(c.name) + '</b></td><td class="num">' + C.fmtBiz(c.biz_no) + '</td><td class="num">' + esc(c.phone) + '</td>' +
            '<td title="' + esc(addr(c).trim()) + '">' + esc(cut20(addr(c))) + '</td><td>' + c.sites.length + '건</td>' +
            '<td class="ops"><button class="q-btn q-btn-sm" data-detail="' + c.id + '">상세조회</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="q-card q-empty">조회된 업체가 없습니다.</div>';
    } else {
      res.innerHTML = list.length ? '<div class="q-tw"><table class="q-t"><thead><tr><th>회사명</th><th>사업자번호</th><th>전화번호</th><th>주소</th><th>사업장명</th><th>담당자</th><th>연락처</th><th>파일</th><th>상세조회</th></tr></thead><tbody>' +
        list.map(function (c) {
          var n = Math.max(c.sites.length, 1), rows = '';
          for (var i = 0; i < n; i++) {
            var s = c.sites[i];
            rows += '<tr' + (i === 0 ? ' class="co-first"' : '') + '>' +
              (i === 0 ? '<td class="co" rowspan="' + n + '"><b>' + esc(c.name) + '</b></td><td class="co num" rowspan="' + n + '">' + C.fmtBiz(c.biz_no) + '</td><td class="co num" rowspan="' + n + '">' + esc(c.phone) +
                '</td><td class="co" rowspan="' + n + '" title="' + esc(addr(c).trim()) + '">' + esc(cut20(addr(c))) + '</td>' : '') +
              (s ? '<td>' + esc(s.site_name) + '</td><td>' + esc(s.manager) + '</td><td class="num">' + esc(s.contact) + '</td><td>' + filesHtml(s.files) + '</td>'
                 : '<td colspan="4" class="q-count">사업장 없음</td>') +
              (i === 0 ? '<td class="co ops" rowspan="' + n + '"><button class="q-btn q-btn-sm" data-detail="' + c.id + '">상세조회</button></td>' : '') + '</tr>';
          }
          return rows;
        }).join('') + '</tbody></table></div>' : '<div class="q-card q-empty">조회된 업체가 없습니다.</div>';
    }
    res.querySelectorAll('[data-detail]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = S.companies.filter(function (x) { return x.id === b.getAttribute('data-detail'); })[0];
        if (c) detailDialog(c);
      });
    });
  }

  /* ---------------- 팝업 ---------------- */
  function dialog(title, cls) {
    var d = document.createElement('dialog'); d.className = 'q-dlg ' + (cls || '');
    d.innerHTML = '<div class="q-dlg-hd"><h2>' + esc(title) + '</h2><button type="button" aria-label="닫기" data-x>×</button></div><div class="q-dlg-bd"></div>';
    document.body.appendChild(d);
    d.querySelector('[data-x]').addEventListener('click', function () { d.close(); });
    d.addEventListener('close', function () { d.remove(); });
    d.showModal();
    return { d: d, bd: d.querySelector('.q-dlg-bd') };
  }
  function reloadCompany(id) {
    return Promise.all([call('list_companies'), call('list_users')]).then(function (r) {
      S.companies = r[0]; S.users = r[1];
      return S.companies.filter(function (x) { return x.id === id; })[0];
    });
  }
  /* 상세조회: 업체가 직접 처리하는 화면과 동일(회사정보 수정, 사업장·첨부파일 추가·삭제, 비밀번호 변경, 회사정보 삭제) */
  function detailDialog(c0, dlg0, note) {
    var dlg = dlg0 || dialog('상세조회 — ' + c0.name), c = c0, form;
    dlg.bd.innerHTML =
      '<div class="q-sub"><span class="q-who"><b>' + esc(c.name) + '</b> · ' + C.fmtBiz(c.biz_no) + ' · 로그인 아이디 ' + esc(c.username || '(계정 없음)') +
      ' · 사업장 ' + c.sites.length + '건</span></div>' +
      '<p class="q-fulladdr"><b>주소</b> ' + esc(addr(c).trim()) + ' · <b>전화</b> ' + esc(c.phone) + (c.fax ? ' · <b>FAX</b> ' + esc(c.fax) : '') + '</p>' +
      (note ? '<p class="q-msg ok" role="status">' + esc(note) + '</p>' : '') +
      '<div class="q-eh"></div>' +
      '<div class="q-card q-danger" style="margin:14px 0 0"><h2 class="q-h2">회사정보 삭제</h2><p class="q-hint" data-dh></p>' +
      '<button type="button" class="q-btn q-btn-red" data-delco>회사정보 삭제</button><p class="q-msg" data-dm role="alert"></p></div>';
    form = F.create(dlg.bd.querySelector('.q-eh'), { mode: 'edit', data: c, fullNames: true,
      onDeleteSite: function (id) { return call('delete_site', { p_site_id: id }); },
      onSitesChange: upd,
      onSaveSite: function (site) { return call('save_site', { p: site, p_company_id: c.id }); },
      onChangePassword: function (pw) { return call('set_company_password', { p_company_id: c.id, p_new: pw }); } });
    var save = document.createElement('button'); save.type = 'button'; save.className = 'q-btn q-btn-red'; save.textContent = '회사정보 수정';
    form.actions.appendChild(save);
    save.addEventListener('click', function () {
      save.disabled = true; form.say('');
      form.payload(function (t) { form.say(t, true); }).then(function (p) { return call('save_company', { p: p }); })
        .then(function () { form.say('회사정보가 수정되었습니다. (사업장 자료는 각 사업장의 ‘저장’ 버튼으로 저장합니다)', true); refreshView(); })
        .catch(function (e) { if (!e.input) form.say(e.message); }).then(function () { save.disabled = false; });
    });
    var del = dlg.bd.querySelector('[data-delco]');
    function upd() {
      var n = form.savedSites();
      del.disabled = n > 0;
      dlg.bd.querySelector('[data-dh]').innerHTML = n > 0
        ? '등록된 사업장 자료가 <b>' + n + '건</b> 남아 있습니다. 회사정보는 <b>사업장 자료를 먼저 모두 삭제</b>(각 사업장의 ‘삭제’ 버튼)한 뒤에 삭제할 수 있습니다.'
        : '사업장 자료가 모두 삭제되었습니다. 이제 회사정보를 삭제할 수 있습니다. 삭제하면 업체 로그인 계정도 함께 삭제됩니다.';
      if (!first) refreshView();
    }
    var first = true;
    del.addEventListener('click', function () {
      var m = dlg.bd.querySelector('[data-dm]'); m.className = 'q-msg'; m.textContent = '';
      if (form.savedSites() > 0) return;
      if (!confirm('‘' + c.name + '’ 회사정보와 로그인 계정을 삭제할까요?\n삭제하면 복구할 수 없습니다.')) return;
      call('delete_company', { p_id: c.id }).then(function () { dlg.d.close(); return refresh(); })
        .catch(function (e) { m.className = 'q-msg err'; m.textContent = e.message; });
    });
    upd(); first = false;
    return dlg;
  }
  /* 팝업을 열어 둔 채 뒤쪽 목록만 최신으로 */
  function refreshView() { reloadCompanyList().then(function () { refreshList(); }); }
  function reloadCompanyList() { return call('list_companies').then(function (r) { S.companies = r; }); }

  /* 업체 신규등록(관리자) */
  function companyDialog() {
    var dlg = dialog('업체 신규등록');
    dlg.bd.innerHTML = '<div class="q-eh"></div>';
    var form = F.create(dlg.bd.querySelector('.q-eh'), { mode: 'new' });
    form.actions.innerHTML = '<button type="button" class="q-btn q-btn-line" data-x2>취소</button><button type="button" class="q-btn q-btn-red" data-save>등록</button>';
    dlg.bd.querySelector('[data-x2]').addEventListener('click', function () { dlg.d.close(); });
    var b = dlg.bd.querySelector('[data-save]');
    b.addEventListener('click', function () {
      b.disabled = true; form.say('');
      form.payload(function (t) { form.say(t, true); }).then(function (p) { return call('save_company', { p: p }); })
        .then(function () { dlg.d.close(); return refresh(); })
        .catch(function (e) { if (!e.input) form.say(e.message); b.disabled = false; });
    });
  }
  function pwDialog() {
    var dlg = dialog('비밀번호 변경', 'sm');
    dlg.bd.innerHTML = '<form novalidate><div class="q-f" style="margin-bottom:12px"><label for="p0">현재 비밀번호</label><input id="p0" type="password" autocomplete="current-password"></div>' +
      '<div class="q-f" style="margin-bottom:12px"><label for="p1">새 비밀번호 (4자 이상)</label><input id="p1" type="password" autocomplete="new-password"></div>' +
      '<div class="q-f"><label for="p2">새 비밀번호 확인</label><input id="p2" type="password" autocomplete="new-password"></div><p class="q-msg" role="alert"></p>' +
      '<div class="q-actions"><button class="q-btn q-btn-red" type="submit">변경</button></div></form>';
    var f = dlg.bd.querySelector('form'), m = f.querySelector('.q-msg');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var n1 = f.querySelector('#p1').value;
      if (n1 !== f.querySelector('#p2').value) { m.className = 'q-msg err'; m.textContent = '새 비밀번호 확인이 일치하지 않습니다.'; return; }
      call('change_password', { p_old: f.querySelector('#p0').value, p_new: n1 })
        .then(function () { m.className = 'q-msg ok'; m.textContent = '비밀번호가 변경되었습니다.'; })
        .catch(function (er) { m.className = 'q-msg err'; m.textContent = er.message; });
    });
  }

  /* ---------------- 사용자 관리 ---------------- */
  function userTab(body) {
    body.innerHTML = '<div class="q-tools"><span class="q-count">사용자 ' + S.users.length + '명 · 업체는 신규등록 시 자동으로 이 목록에 추가됩니다.</span>' +
      '<button class="q-btn q-btn-red" style="margin-left:auto" data-act="add">+ 사용자 등록</button></div>' +
      '<div class="q-tw"><table class="q-t" style="min-width:680px"><thead><tr><th>아이디</th><th>구분</th><th>업체</th><th>등록일</th><th>관리</th></tr></thead><tbody>' +
      S.users.map(function (u) {
        return '<tr><td class="num"><b>' + esc(u.username) + '</b></td><td><span class="q-role ' + u.role + '">' + (u.role === 'admin' ? '관리자' : '업체') + '</span></td>' +
          '<td>' + esc(u.company_name || '-') + '</td><td class="num">' + esc(String(u.created_at || '').slice(0, 10)) + '</td>' +
          '<td class="ops"><button class="q-btn q-btn-sm" data-u="' + u.id + '">수정</button><button class="q-btn q-btn-line q-btn-sm" data-ud="' + u.id + '">삭제</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    body.querySelector('[data-act="add"]').addEventListener('click', function () { userDialog(null); });
    body.querySelectorAll('[data-u]').forEach(function (b) {
      b.addEventListener('click', function () { userDialog(S.users.filter(function (u) { return u.id === b.getAttribute('data-u'); })[0]); });
    });
    body.querySelectorAll('[data-ud]').forEach(function (b) {
      b.addEventListener('click', function () {
        var u = S.users.filter(function (x) { return x.id === b.getAttribute('data-ud'); })[0];
        if (!u || !confirm('사용자 ‘' + u.username + '’를 삭제할까요?' + (u.company_id ? '\n(업체 정보는 남고 로그인 계정만 삭제됩니다)' : ''))) return;
        call('delete_user', { p_id: u.id }).then(refresh).catch(function (e) { alert(e.message); });
      });
    });
  }
  function userDialog(u) {
    var dlg = dialog(u ? '사용자 수정' : '사용자 등록', 'sm');
    dlg.bd.innerHTML = '<form novalidate><div class="q-f" style="margin-bottom:12px"><label for="u-id">아이디' + (u ? '' : ' <i>*</i>') + '</label><input id="u-id" value="' + esc(u ? u.username : '') + '" autocomplete="off"></div>' +
      '<div class="q-f" style="margin-bottom:12px"><label for="u-pw">비밀번호' + (u ? ' (변경 시에만)' : ' <i>*</i>') + '</label><input id="u-pw" type="password" autocomplete="new-password" placeholder="4자 이상"></div>' +
      '<div class="q-f" style="margin-bottom:12px"><label for="u-role">구분</label><select id="u-role"><option value="admin">관리자</option><option value="customer">업체</option></select></div>' +
      '<div class="q-f" id="u-co-w" style="margin-bottom:12px" hidden><label for="u-co">업체</label><select id="u-co">' +
      S.companies.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
      '<p class="q-msg" role="alert"></p><div class="q-actions"><button class="q-btn q-btn-red" type="submit">' + (u ? '저장' : '등록') + '</button></div></form>';
    var f = dlg.bd.querySelector('form'), m = f.querySelector('.q-msg'), role = f.querySelector('#u-role'), cw = f.querySelector('#u-co-w');
    role.value = u ? u.role : 'admin'; if (u && u.company_id) f.querySelector('#u-co').value = u.company_id;
    function sync() { cw.hidden = role.value !== 'customer'; }
    role.addEventListener('change', sync); sync();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      call('save_user', { p: { id: u ? u.id : null, username: f.querySelector('#u-id').value, password: f.querySelector('#u-pw').value, role: role.value, company_id: role.value === 'customer' ? f.querySelector('#u-co').value : null } })
        .then(function () { dlg.d.close(); return refresh(); })
        .catch(function (er) { m.className = 'q-msg err'; m.textContent = er.message; });
    });
  }

  /* ---------------- 시작 ---------------- */
  if (tok() && C.ready) refresh().catch(function () { loginView(); }); else loginView();
})();
