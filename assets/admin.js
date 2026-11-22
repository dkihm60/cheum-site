/* 관리자 화면 — 업체 조회(일괄/업체별)·수정·삭제, 사용자 관리 */
(function () {
  'use strict';
  var C = window.Cheum, F = window.CheumForm, esc = C.esc;
  var app = document.getElementById('app');
  var SCOPE = 'admin';
  var S = { tab: 'co', view: 'all', q: '', sel: '', companies: [], users: [], me: '' };

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
      '<form novalidate><div class="q-f"><label for="a-id">아이디</label><input id="a-id" autocomplete="username"></div>' +
      '<div class="q-f"><label for="a-pw">비밀번호</label><input id="a-pw" type="password" autocomplete="current-password"></div>' +
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
      if (S.sel && !S.companies.some(function (c) { return c.id === S.sel; })) S.sel = '';
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
      '<div id="body"></div>';
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
    var hay = [c.name, c.address, c.phone].concat(c.sites.map(function (s) { return s.site_name + ' ' + s.manager + ' ' + s.contact; })).join(' ').toLowerCase();
    return hay.indexOf(q) >= 0 || (qd && C.digits(c.biz_no).indexOf(qd) >= 0);
  }
  function companyTab(body) {
    var list = S.companies.filter(match);
    body.innerHTML = '<div class="q-tools">' +
      '<div class="q-seg"><button data-v="all" aria-pressed="' + (S.view === 'all') + '">일괄 조회</button><button data-v="one" aria-pressed="' + (S.view === 'one') + '">업체별 조회</button></div>' +
      '<input class="q-in" type="search" id="srch" placeholder="회사명·사업자번호·사업장·담당자 검색" value="' + esc(S.q) + '" aria-label="검색">' +
      (S.view === 'one' ? '<select class="q-in" id="pick" aria-label="업체 선택"><option value="">— 업체 선택 —</option>' +
        list.map(function (c) { return '<option value="' + c.id + '"' + (c.id === S.sel ? ' selected' : '') + '>' + esc(c.name) + ' (' + C.fmtBiz(c.biz_no) + ')</option>'; }).join('') + '</select>' : '') +
      '<span class="q-count">' + list.length + '건</span>' +
      '<button class="q-btn q-btn-red" style="margin-left:auto" data-act="new">+ 업체 신규등록</button></div><div id="res"></div>';
    body.querySelectorAll('[data-v]').forEach(function (b) { b.addEventListener('click', function () { S.view = b.getAttribute('data-v'); companyTab(body); }); });
    var s = body.querySelector('#srch');
    s.addEventListener('input', function () { S.q = s.value; var pos = s.selectionStart; companyTab(body); var n = body.querySelector('#srch'); n.focus(); n.setSelectionRange(pos, pos); });
    var pick = body.querySelector('#pick');
    if (pick) pick.addEventListener('change', function () { S.sel = pick.value; drawResult(body, list); });
    body.querySelector('[data-act="new"]').addEventListener('click', function () { companyDialog(null); });
    drawResult(body, list);
  }

  function filesHtml(files) {
    return files.length ? '<ul>' + files.map(function (f) { return '<li><a href="' + esc(C.fileUrl(f.file_path)) + '" target="_blank" rel="noopener">' + esc(f.file_name) + '</a></li>'; }).join('') + '</ul>' : '<span class="q-count">-</span>';
  }
  function drawResult(body, list) {
    var res = body.querySelector('#res');
    if (S.view === 'one') {
      var c = S.companies.filter(function (x) { return x.id === S.sel; })[0];
      if (!c) { res.innerHTML = '<div class="q-card q-empty">위에서 업체를 선택하세요.</div>'; return; }
      res.innerHTML = '<div class="q-card q-detail"><div class="q-sub"><h2>' + esc(c.name) + '</h2>' +
        '<span class="q-who"><button class="q-btn q-btn-sm" data-edit="' + c.id + '">업체 수정</button> <button class="q-btn q-btn-line q-btn-sm" data-delco="' + c.id + '">업체 삭제</button></span></div>' +
        '<dl class="q-dl"><dt>사업자번호</dt><dd class="num">' + C.fmtBiz(c.biz_no) + '</dd><dt>전화번호</dt><dd class="num">' + esc(c.phone) + '</dd>' +
        '<dt>FAX</dt><dd class="num">' + esc(c.fax || '-') + '</dd><dt>주소</dt><dd>' + esc((c.zipcode ? '(' + c.zipcode + ') ' : '') + c.address + ' ' + (c.address_detail || '')) + '</dd>' +
        '<dt>로그인 아이디</dt><dd class="num">' + esc(c.username || '(계정 없음)') + '</dd></dl>' +
        '<div class="q-tw"><table class="q-t" style="min-width:640px"><thead><tr><th>사업장명</th><th>담당자</th><th>연락처</th><th>파일</th><th>관리</th></tr></thead><tbody>' +
        (c.sites.length ? c.sites.map(function (s) {
          return '<tr><td>' + esc(s.site_name) + '</td><td>' + esc(s.manager) + '</td><td class="num">' + esc(s.contact) + '</td><td>' + filesHtml(s.files) + '</td>' +
            '<td class="ops"><button class="q-btn q-btn-sm" data-edit="' + c.id + '" data-site="' + s.id + '">수정</button><button class="q-btn q-btn-line q-btn-sm" data-delsite="' + s.id + '">삭제</button></td></tr>';
        }).join('') : '<tr><td colspan="5" class="q-empty">등록된 사업장이 없습니다.</td></tr>') + '</tbody></table></div></div>';
    } else {
      res.innerHTML = list.length ? '<div class="q-tw"><table class="q-t"><thead><tr><th>회사명</th><th>사업자번호</th><th>전화번호</th><th>주소</th><th>사업장명</th><th>담당자</th><th>연락처</th><th>파일</th><th>관리</th></tr></thead><tbody>' +
        list.map(function (c) {
          var n = Math.max(c.sites.length, 1), rows = '';
          for (var i = 0; i < n; i++) {
            var s = c.sites[i];
            rows += '<tr' + (i === 0 ? ' class="co-first"' : '') + '>' +
              (i === 0 ? '<td class="co" rowspan="' + n + '"><b>' + esc(c.name) + '</b></td><td class="co num" rowspan="' + n + '">' + C.fmtBiz(c.biz_no) + '</td><td class="co num" rowspan="' + n + '">' + esc(c.phone) +
                '</td><td class="co" rowspan="' + n + '">' + esc((c.zipcode ? '(' + c.zipcode + ') ' : '') + c.address + ' ' + (c.address_detail || '')) + '</td>' : '') +
              (s ? '<td>' + esc(s.site_name) + '</td><td>' + esc(s.manager) + '</td><td class="num">' + esc(s.contact) + '</td><td>' + filesHtml(s.files) + '</td>' +
                '<td class="ops"><button class="q-btn q-btn-sm" data-edit="' + c.id + '" data-site="' + s.id + '">수정</button><button class="q-btn q-btn-line q-btn-sm" data-delsite="' + s.id + '">삭제</button>' +
                (i === 0 ? '<br><button class="q-btn q-btn-sm" style="margin-top:4px" data-edit="' + c.id + '">업체수정</button><button class="q-btn q-btn-line q-btn-sm" style="margin:4px 0 0 4px" data-delco="' + c.id + '">업체삭제</button>' : '') + '</td>'
                : '<td colspan="4" class="q-count">사업장 없음</td><td class="ops"><button class="q-btn q-btn-sm" data-edit="' + c.id + '">업체수정</button><button class="q-btn q-btn-line q-btn-sm" data-delco="' + c.id + '">업체삭제</button></td>') + '</tr>';
          }
          return rows;
        }).join('') + '</tbody></table></div>' : '<div class="q-card q-empty">조회된 업체가 없습니다.</div>';
    }
    res.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = S.companies.filter(function (x) { return x.id === b.getAttribute('data-edit'); })[0];
        if (c) companyDialog(c, b.getAttribute('data-site'));
      });
    });
    res.querySelectorAll('[data-delco]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = S.companies.filter(function (x) { return x.id === b.getAttribute('data-delco'); })[0];
        if (!c) return;
        if (c.sites.length) { alert('사업장 자료가 ' + c.sites.length + '건 남아 있습니다.\n사업장 자료를 먼저 모두 삭제한 뒤에 업체(회사정보)를 삭제할 수 있습니다.'); return; }
        if (!confirm('‘' + c.name + '’ 업체를 삭제할까요?\n로그인 계정도 함께 삭제되며 복구할 수 없습니다.')) return;
        call('delete_company', { p_id: c.id }).then(refresh).catch(function (e) { alert(e.message); });
      });
    });
    res.querySelectorAll('[data-delsite]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('이 사업장을 삭제할까요? 복구할 수 없습니다.')) return;
        call('delete_site', { p_site_id: b.getAttribute('data-delsite') }).then(refresh).catch(function (e) { alert(e.message); });
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
  function companyDialog(c, siteId) {
    var dlg = dialog(c ? '업체 수정 — ' + c.name : '업체 신규등록');
    dlg.bd.innerHTML = '<div class="q-eh"></div>';
    var form = F.create(dlg.bd.querySelector('.q-eh'), { mode: c ? 'edit' : 'new', data: c,
      onDeleteSite: function (id) { return call('delete_site', { p_site_id: id }); },
      onChangePassword: function (pw) { return call('set_company_password', { p_company_id: c && c.id, p_new: pw }); } });
    form.actions.innerHTML = '<button type="button" class="q-btn q-btn-line" data-x2>취소</button><button type="button" class="q-btn q-btn-red" data-save>' + (c ? '저장' : '등록') + '</button>';
    if (c && siteId) setTimeout(function () { form.focusSite(siteId); }, 50);
    dlg.bd.querySelector('[data-x2]').addEventListener('click', function () { dlg.d.close(); });
    var b = dlg.bd.querySelector('[data-save]');
    b.addEventListener('click', function () {
      b.disabled = true; form.say('');
      form.payload(function (t) { form.say(t, true); }).then(function (p) { return call('save_company', { p: p }); })
        .then(function (r) {
          dlg.d.close();
          return refresh();
        })
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
