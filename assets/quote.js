/* 견적의뢰 — 고객 화면: 조회 → (등록 업체) 비밀번호 확인 / (미등록) 신규등록 → 입력·수정·삭제 */
(function () {
  'use strict';
  var C = window.Cheum, F = window.CheumForm, esc = C.esc;
  var $ = function (s) { return document.querySelector(s); };
  var stage = $('#stage'), qs = $('#qs'), SCOPE = 'customer';
  var company = null, form = null;

  if (!C.ready) $('#notReady').hidden = false;

  function say(t, ok) { var m = $('#qsMsg'); m.className = 'q-msg' + (t ? (ok ? ' ok' : ' err') : ''); m.textContent = t || ''; }
  function tok() { return C.token(SCOPE); }
  function dropSession() {
    var t = tok(); C.token(SCOPE, null); company = null; form = null;
    if (t) C.rpc('logout', { p_token: t }).catch(function () { /* 무시 */ });
  }
  function reset() { dropSession(); stage.innerHTML = ''; }
  function expired(e) {
    if (e && e.code === 'AUTH_REQUIRED') { reset(); say('접속 시간이 만료되었습니다. 다시 조회해 주세요.'); return true; }
    return false;
  }
  function busy(b, on, label) { b.disabled = on; if (label) b.textContent = label; }

  /* ---------- 조회 ---------- */
  qs.addEventListener('input', function () { if (/^[0-9\s-]+$/.test(qs.value)) qs.value = C.fmtBiz(qs.value); });
  $('#qsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = qs.value.trim(), b = e.target.querySelector('button');
    say(''); if (!C.ready) { say('서비스 준비 중입니다. 전화로 문의해 주세요.'); return; }
    reset(); busy(b, true, '조회 중…');
    C.rpc('lookup_company', { p_q: q }).then(function (r) {
      if (!r.items.length) return newFlow(r, q);
      if (r.items.length === 1) return found(r.items[0]);
      return candidates(r.items);
    }).catch(function (er) { say(er.message); }).then(function () { busy(b, false, '조회'); });
  });

  /* ---------- 비밀번호 한 칸 (공용) ---------- */
  function pwStep(host, label, onOk) {
    host.insertAdjacentHTML('beforeend',
      '<form class="q-pwstep" novalidate><div class="q-f"><label for="stepPw">비밀번호 <i>*</i></label><div class="q-inline">' +
      '<input id="stepPw" type="password" maxlength="64" autocomplete="' + (label === '다음' ? 'new-password' : 'current-password') + '" placeholder="' + (label === '다음' ? '사용하실 비밀번호 (4자 이상)' : '비밀번호') + '">' +
      '<button type="button" class="q-btn q-btn-line q-btn-sm2" data-show aria-pressed="false">보기</button>' +
      '<button type="submit" class="q-btn q-btn-red">' + label + '</button></div>' +
      '<em class="q-pwmsg" aria-live="polite"></em></div></form>');
    var f = host.querySelector('.q-pwstep'), inp = f.querySelector('input'), m = f.querySelector('.q-pwmsg'), sb = f.querySelector('[type=submit]');
    function pm(t) { m.textContent = t || ''; m.className = 'q-pwmsg' + (t ? ' err' : ''); }
    f.querySelector('[data-show]').addEventListener('click', function () {
      var on = inp.type === 'password'; inp.type = on ? 'text' : 'password'; this.textContent = on ? '숨김' : '보기';
    });
    inp.addEventListener('input', function () { pm(''); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (inp.value.length < 4) { pm('비밀번호는 4자 이상 입력하세요.'); inp.focus(); return; }
      busy(sb, true);
      Promise.resolve(onOk(inp.value, pm, f)).then(function (keep) { if (keep !== 'done') busy(sb, false); }, function (er) { pm(er.message); busy(sb, false); });
    });
    inp.focus({ preventScroll: true });
    return f;
  }

  /* ---------- 여러 건 조회됨 ---------- */
  function candidates(items) {
    stage.innerHTML = '<div class="q-card"><span class="q-tag">조회 결과 ' + items.length + '건</span><p class="q-hint" style="margin:6px 0 10px">해당하는 업체를 선택하세요.</p><ul class="q-list">' +
      items.map(function (it, i) {
        return '<li><b>' + esc(it.name) + '</b><span>' + esc(it.biz_masked) + ' · ' + esc(it.address) + '</span><button type="button" class="q-btn q-btn-line q-btn-sm" data-i="' + i + '">선택</button></li>';
      }).join('') + '</ul></div>';
    stage.querySelectorAll('[data-i]').forEach(function (b) { b.addEventListener('click', function () { found(items[+b.getAttribute('data-i')]); }); });
  }

  /* ---------- 등록된 업체: 회사정보만 보여주고 비밀번호 확인 ---------- */
  function found(it) {
    stage.innerHTML = '<div class="q-card q-found"><span class="q-tag">등록된 업체</span><h2>' + esc(it.name) + '</h2>' +
      '<dl class="q-dl"><dt>사업자번호</dt><dd class="num">' + esc(it.biz_masked) + '</dd><dt>주소</dt><dd>' + esc(it.address) + '</dd>' +
      '<dt>전화 / FAX</dt><dd class="num">' + esc(it.phone || '-') + ' / ' + esc(it.fax || '-') + '</dd>' +
      '<dt>등록 사업장</dt><dd>' + it.site_count + '건</dd></dl>' +
      '<p class="q-hint">사업장·첨부파일은 <b>비밀번호 확인 후</b> 볼 수 있습니다. 비밀번호를 잊으셨다면 031-676-5611 로 재설정을 요청해 주세요.</p></div>';
    var card = stage.firstChild;
    if (!it.has_account) { card.insertAdjacentHTML('beforeend', '<p class="q-msg err">로그인 계정이 없는 업체입니다. 031-676-5611 로 문의해 주세요.</p>'); return; }
    pwStep(card, '확인', function (pw, pm) {
      return C.rpc('company_login', { p_ref: it.ref, p_password: pw }).then(function (r) {
        if (!r.ok) throw new Error(r.error === 'LOCKED' ? '비밀번호가 5회 틀려 10분간 잠겼습니다. 잠시 후 다시 시도해 주세요.' : r.error === 'NO_ACCOUNT' ? '로그인 계정이 없습니다. 031-676-5611 로 문의해 주세요.' : '비밀번호가 맞지 않습니다.');
        C.token(SCOPE, r.token); return editor('');
      });
    });
  }

  /* ---------- 미등록: 신규등록 ---------- */
  function newFlow(r, q) {
    if (r.mode === 'biz' && !r.valid) { say('사업자등록번호가 올바르지 않습니다. 번호를 다시 확인해 주세요.'); return; }
    var what = r.mode === 'biz' ? '사업자등록번호 <b class="num">' + esc(C.fmtBiz(r.biz_no)) + '</b>' : '회사명 ‘<b>' + esc(q) + '</b>’';
    stage.innerHTML = '<div class="q-card q-banner"><span class="q-tag new">신규등록</span><h2>등록되지 않은 업체입니다. <em>신규등록</em>입니다.</h2>' +
      '<p class="q-hint">' + what + '(으)로 등록된 자료가 없습니다. 사용하실 <b>비밀번호</b>를 먼저 입력한 뒤 자료를 입력해 주세요. 이후 수정·삭제 때 이 비밀번호를 사용합니다.</p></div>';
    var card = stage.firstChild;
    pwStep(card, '다음', function (pw, pm, f) {
      f.querySelector('input').disabled = true; f.querySelector('[data-show]').disabled = true; f.querySelector('[type=submit]').hidden = true;
      var host = document.createElement('div'); host.className = 'q-card'; stage.appendChild(host);
      var data = r.mode === 'biz' ? { biz_no: r.biz_no } : { name: q };
      form = F.create(host, { mode: 'new', data: data, pw: pw });
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'q-btn q-btn-red'; btn.textContent = '견적의뢰 등록';
      form.actions.appendChild(btn);
      btn.addEventListener('click', function () {
        busy(btn, true, '등록 중…'); form.say('');
        form.payload(function (t) { form.say(t, true); }).then(function (p) {
          return C.rpc('register_company', { p: p }).then(function (res) {
            return C.rpc('login', { p_username: res.username, p_password: pw }).then(function (lg) {
              if (!lg.ok) throw new Error('등록은 되었으나 자동 로그인에 실패했습니다. 다시 조회해 주세요.');
              C.token(SCOPE, lg.token); return editor('견적의뢰가 등록되었습니다. 아래에서 사업장·첨부파일을 추가·수정할 수 있습니다.');
            });
          });
        }).catch(function (er) { if (!er.input) form.say(er.message); }).then(function () { btn.disabled = false; btn.textContent = '견적의뢰 등록'; });
      });
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return 'done';
    });
  }

  /* ---------- 비밀번호 확인 후: 추가 / 수정 / 삭제 ---------- */
  function editor(note) {
    return C.rpc('my_company', { p_token: tok() }).then(function (c) {
      company = c; var files = c.sites.reduce(function (n, s) { return n + s.files.length; }, 0);
      stage.innerHTML =
        '<div class="q-sub"><span class="q-who"><b>' + esc(c.name) + '</b> · ' + C.fmtBiz(c.biz_no) + ' · 사업장 ' + c.sites.length + '건 · 첨부파일 ' + files + '개</span>' +
        '<button type="button" class="q-btn q-btn-line q-btn-sm" data-act="logout">로그아웃</button></div>' +
        (note ? '<p class="q-msg ok" role="status">' + esc(note) + '</p>' : '') +
        '<div class="q-card"><div id="edHost"></div></div>' +
        '<div class="q-card q-danger"><h2 class="q-h2">회사정보 삭제</h2><p class="q-hint" id="delHint"></p>' +
        '<button type="button" class="q-btn q-btn-red" id="delCo">회사정보 삭제</button><p class="q-msg" id="delMsg" role="alert"></p></div>';
      stage.querySelector('[data-act="logout"]').addEventListener('click', function () { reset(); say('로그아웃되었습니다.', true); qs.focus(); });

      form = F.create($('#edHost'), {
        mode: 'edit', data: c,
        onDeleteSite: function (id) { return C.rpc('delete_site', { p_token: tok(), p_site_id: id }).catch(function (e) { expired(e); throw e; }); },
        onSitesChange: updateDel,
        onChangePassword: function (pw) { return C.rpc('set_company_password', { p_token: tok(), p_new: pw }).catch(function (e) { expired(e); throw e; }); }
      });
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'q-btn q-btn-red'; btn.textContent = '회사정보 수정';
      form.actions.appendChild(btn);
      btn.addEventListener('click', function () {
        busy(btn, true, '수정 중…'); form.say('');
        form.payload(function (t) { form.say(t, true); }).then(function (p) {
          return C.rpc('save_company', { p_token: tok(), p: p }).then(function () { return editor('회사정보가 수정되었습니다.'); });
        }).catch(function (er) { if (!expired(er) && !er.input) form.say(er.message); busy(btn, false, '회사정보 수정'); });
      });
      $('#delCo').addEventListener('click', function () {
        var m = $('#delMsg'); m.className = 'q-msg'; m.textContent = '';
        if (form.savedSites() > 0) return;
        if (!confirm('‘' + c.name + '’ 회사정보와 로그인 계정을 삭제할까요?\n삭제하면 복구할 수 없습니다.')) return;
        C.rpc('delete_company', { p_token: tok() }).then(function () {
          reset(); stage.innerHTML = '<div class="q-card q-done"><h2>삭제되었습니다.</h2><p>회사정보와 로그인 계정이 삭제되었습니다. 다시 이용하시려면 위에서 새로 조회해 주세요.</p></div>';
          say('', true);
        }).catch(function (er) { if (!expired(er)) { m.className = 'q-msg err'; m.textContent = er.message; } });
      });
      updateDel();
      if (note) window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (er) { if (!expired(er)) say(er.message); });
  }

  /* 회사정보 삭제는 사업장 자료를 모두 삭제한 뒤에만 가능 */
  function updateDel() {
    var n = form.savedSites(), b = $('#delCo'), h = $('#delHint');
    b.disabled = n > 0;
    h.innerHTML = n > 0
      ? '등록된 사업장 자료가 <b>' + n + '건</b> 남아 있습니다. 회사정보는 <b>사업장 자료를 먼저 모두 삭제</b>(각 사업장의 ‘삭제’ 버튼)한 뒤에 삭제할 수 있습니다.'
      : '사업장 자료가 모두 삭제되었습니다. 이제 회사정보를 삭제할 수 있습니다. 삭제하면 로그인 계정도 함께 삭제됩니다.';
  }
})();
