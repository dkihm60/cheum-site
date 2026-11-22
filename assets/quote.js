/* 견적의뢰 — 고객 화면 (신규등록 / 수정 / 삭제) */
(function () {
  'use strict';
  var C = window.Cheum, F = window.CheumForm;
  var $ = function (s) { return document.querySelector(s); };
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var panes = { new: $('#pane-new'), edit: $('#pane-edit'), del: $('#pane-del') };
  var company = null, editForm = null, current = 'new';
  var SCOPE = 'customer';

  if (!C.ready) $('#notReady').hidden = false;

  /* ---------- 탭 ---------- */
  function show(name) {
    current = name;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    });
    Object.keys(panes).forEach(function (k) { panes[k].hidden = k !== name; });
    if (name !== 'new') load(); else drawAuth();
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* 무시 */ }
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { show(t.getAttribute('data-tab')); });
    t.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(t), n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (n >= 0 && n < tabs.length) { tabs[n].focus(); show(tabs[n].getAttribute('data-tab')); }
    });
  });

  /* ---------- 신규등록 ---------- */
  var newForm, newBtn = document.createElement('button');
  newBtn.type = 'button'; newBtn.id = 'newSubmit'; newBtn.className = 'q-btn q-btn-red'; newBtn.textContent = '견적의뢰 등록';
  function mountNew() { newForm = F.create($('#newHost'), { mode: 'new' }); newForm.actions.appendChild(newBtn); }
  mountNew();
  newBtn.addEventListener('click', function () {
    if (!C.ready) { newForm.say('서비스 준비 중입니다. 전화로 문의해 주세요.'); return; }
    busy(newBtn, true, '등록 중…');
    newForm.say('');
    newForm.payload(function (t) { newForm.say(t, true); }).then(function (p) {
      return C.rpc('register_company', { p: p }).then(function (r) {
        $('#doneId').textContent = C.fmtBiz(r.username);
        $('#newCard').hidden = true; $('#newDone').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }).catch(function (e) { if (!e.input) newForm.say(e.message); })
      .then(function () { busy(newBtn, false, '견적의뢰 등록'); });
  });
  $('#doneAgain').addEventListener('click', function () {
    mountNew();
    $('#newCard').hidden = false; $('#newDone').hidden = true;
  });
  $('#doneEdit').addEventListener('click', function () { show('edit'); });

  function busy(b, on, label) { b.disabled = on; b.textContent = label; }

  /* ---------- 로그인(탭 줄 오른쪽) / 불러오기 ---------- */
  var slot = $('#authSlot');
  function say(host, t) { var m = host.querySelector('.q-msg'); if (m) { m.className = 'q-msg' + (t ? ' err' : ''); m.textContent = t || ''; } }
  function placeholder(host) {
    host.innerHTML = '<div class="q-card q-empty"><b>로그인 후 이용할 수 있습니다.</b><br>위쪽 탭 줄의 입력란에 사업자등록번호와 비밀번호를 입력하고 <b>로그인</b>을 눌러 주세요.' +
      '<br><small>아이디·비밀번호는 신규등록 완료 화면에서 안내해 드립니다. 분실 시 031-676-5611 로 재설정을 요청해 주세요.</small><p class="q-msg" role="alert"></p></div>';
  }
  function drawAuth() {
    if (current === 'new') { slot.hidden = true; slot.innerHTML = ''; return; }
    slot.hidden = false;
    if (company) {
      slot.innerHTML = '<span class="q-who"><b>' + C.esc(company.name) + '</b> · ' + C.fmtBiz(company.biz_no) + '</span><button type="button" class="q-btn q-btn-line q-btn-sm" data-act="logout">로그아웃</button>';
      slot.querySelector('[data-act="logout"]').addEventListener('click', function () {
        var t = C.token(SCOPE); C.token(SCOPE, null); company = null;
        if (t) C.rpc('logout', { p_token: t }).catch(function () { /* 무시 */ });
        load();
      });
      return;
    }
    slot.innerHTML = '<form class="q-login-inline" novalidate><input id="lg-id" inputmode="numeric" maxlength="12" placeholder="사업자번호 000-00-00000" aria-label="아이디(사업자등록번호)" autocomplete="username">' +
      '<input id="lg-pw" type="password" placeholder="비밀번호" aria-label="비밀번호" autocomplete="current-password">' +
      '<button class="q-btn q-btn-red q-btn-sm" type="submit">로그인</button></form>';
    var f = slot.querySelector('form'), id = f.querySelector('#lg-id');
    id.addEventListener('input', function () { id.value = C.fmtBiz(id.value); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var host = panes[current], b = f.querySelector('button');
      if (!C.ready) { say(host, '서비스 준비 중입니다.'); return; }
      b.disabled = true;
      C.rpc('login', { p_username: id.value, p_password: f.querySelector('#lg-pw').value }).then(function (r) {
        if (!r.ok) throw new Error(r.error === 'LOCKED' ? '로그인 시도가 5회 실패하여 10분간 잠겼습니다.' : '아이디 또는 비밀번호가 맞지 않습니다.');
        if (r.role !== 'customer') throw new Error('업체 계정으로 로그인해 주세요. (관리자는 관리자 페이지를 이용하세요)');
        C.token(SCOPE, r.token); return load(true);
      }).catch(function (er) { say(host, er.message); b.disabled = false; });
    });
  }

  function load(force) {
    var tok = C.token(SCOPE);
    if (!tok) { company = null; placeholder(panes.edit); placeholder(panes.del); drawAuth(); return Promise.resolve(); }
    if (company && !force) { render(); return Promise.resolve(); }
    return C.rpc('my_company', { p_token: tok }).then(function (c) { company = c; render(); })
      .catch(function (e) {
        C.token(SCOPE, null); company = null;
        placeholder(panes.edit); placeholder(panes.del); drawAuth();
        if (e.code && e.code !== 'AUTH_REQUIRED') alert(e.message);
      });
  }

  function render() { renderEdit(); renderDel(); drawAuth(); }

  /* ---------- 수정 ---------- */
  function renderEdit() {
    var host = panes.edit;
    host.innerHTML = '<div class="q-card"><div class="q-eh"></div></div>';
    editForm = F.create(host.querySelector('.q-eh'), { mode: 'edit', data: company });
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'q-btn q-btn-red'; btn.setAttribute('data-act', 'save'); btn.textContent = '수정 내용 저장';
    editForm.actions.appendChild(btn);
    btn.addEventListener('click', function () {
      busy(btn, true, '저장 중…'); editForm.say('');
      editForm.payload(function (t) { editForm.say(t, true); }).then(function (p) {
        return C.rpc('save_company', { p_token: C.token(SCOPE), p: p }).then(function () { return load(true); })
          .then(function () { var f2 = panes.edit.querySelector('.q-msg'); if (f2) { f2.className = 'q-msg ok'; f2.textContent = '수정 내용이 저장되었습니다.'; } window.scrollTo({ top: 0, behavior: 'smooth' }); });
      }).catch(function (e) { if (e.code === 'AUTH_REQUIRED') { C.token(SCOPE, null); load(); alert(e.message); } else if (!e.input) editForm.say(e.message); })
        .then(function () { btn.disabled = false; btn.textContent = '수정 내용 저장'; });
    });
  }

  /* ---------- 삭제 ---------- */
  function renderDel() {
    var host = panes.del;
    host.innerHTML =
      '<div class="q-card"><h2 style="font-size:18px;margin-bottom:6px">사업장 삭제</h2><p class="q-hint">삭제한 사업장과 첨부파일 정보는 복구할 수 없습니다.</p>' +
      '<ul class="q-list">' + (company.sites.length ? company.sites.map(function (s) {
        return '<li><b>' + C.esc(s.site_name) + '</b><span>' + C.esc(s.manager) + ' · ' + C.esc(s.contact) + ' · 파일 ' + s.files.length + '개</span>' +
          '<button type="button" class="q-btn q-btn-line q-btn-sm" data-site="' + s.id + '">삭제</button></li>';
      }).join('') : '<li><span>등록된 사업장이 없습니다.</span></li>') + '</ul></div>' +
      '<div class="q-card q-danger"><h2 style="font-size:18px;margin-bottom:6px">회사 전체 삭제</h2>' +
      '<p class="q-hint">‘' + C.esc(company.name) + '’의 회사 정보·모든 사업장·첨부파일 정보·로그인 계정이 함께 삭제됩니다.</p>' +
      '<div class="q-f" style="max-width:360px;margin-bottom:12px"><label for="del-ok">확인을 위해 <b>삭제</b>라고 입력하세요</label><input id="del-ok" autocomplete="off"></div>' +
      '<button type="button" class="q-btn q-btn-red" data-act="del-co">회사 전체 삭제</button><p class="q-msg" role="alert"></p></div>';
    var m = host.querySelector('.q-msg');
    host.querySelectorAll('[data-site]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('이 사업장을 삭제할까요?')) return;
        b.disabled = true;
        C.rpc('delete_site', { p_token: C.token(SCOPE), p_site_id: b.getAttribute('data-site') })
          .then(function () { return load(true); }).catch(function (e) { alert(e.message); b.disabled = false; });
      });
    });
    host.querySelector('[data-act="del-co"]').addEventListener('click', function () {
      if (host.querySelector('#del-ok').value.trim() !== '삭제') { m.className = 'q-msg err'; m.textContent = '확인란에 ‘삭제’를 입력하세요.'; return; }
      if (!confirm('정말 회사 전체를 삭제할까요? 되돌릴 수 없습니다.')) return;
      C.rpc('delete_company', { p_token: C.token(SCOPE) }).then(function () {
        C.token(SCOPE, null); company = null;
        host.innerHTML = '<div class="q-card q-done"><h2>삭제되었습니다.</h2><p>견적의뢰 정보와 로그인 계정이 모두 삭제되었습니다.</p></div>';
        panes.edit.innerHTML = ''; 
      }).catch(function (e) { m.className = 'q-msg err'; m.textContent = e.message; });
    });
  }

  var h = (location.hash || '').replace('#', '');
  if (h === 'edit' || h === 'del') show(h);
})();
