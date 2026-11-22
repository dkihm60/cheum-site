/* 견적의뢰 입력 폼 (신규등록·수정 공용 / 고객 화면·관리자 화면에서 같이 사용) */
(function () {
  'use strict';
  var C = window.Cheum;
  var seq = 0;

  /* 파일명은 20자까지만 표시하고 넘으면 ... 로 줄임(전체 이름은 마우스를 올리면 표시) */
  function shortName(n) { n = String(n || ''); return n.length > 20 ? n.slice(0, 20) + '...' : n; }

  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function siteTpl(id) {
    return '<section class="q-site">' +
      '<div class="q-site-hd"><b class="q-site-no">사업장</b><span class="q-site-ops">' +
      '<button type="button" class="q-btn q-btn-st q-btn-sm" data-act="add-site">+ 사업장 추가</button>' +
      '<button type="button" class="q-link q-del" data-act="del-site">삭제</button></span></div>' +
      '<div class="q-grid q-gs">' +
      '<div class="q-f"><label for="sn' + id + '">사업장명 <i>*</i></label><input id="sn' + id + '" name="site_name" maxlength="100" placeholder="예: OO아파트 신축현장"></div>' +
      '<div class="q-f q-fcell"><span class="q-lbl">첨부된 파일 <small class="q-fcount"></small></span><ul class="q-files" aria-label="첨부된 파일"></ul></div>' +
      '<div class="q-f"><label for="sm' + id + '">담당자 <i>*</i></label><input id="sm' + id + '" name="manager" maxlength="50" autocomplete="off"></div>' +
      '<div class="q-f"><label for="sc' + id + '">연락처 <i>*</i></label><input id="sc' + id + '" name="contact" inputmode="tel" maxlength="14" placeholder="010-0000-0000" autocomplete="off"></div>' +
      '</div>' +
      '<div class="q-files-box"><div class="q-fr"><span class="q-lbl">첨부파일</span>' +
      '<button type="button" class="q-btn q-btn-line q-btn-sm" data-act="pick">+ 파일 선택</button><input type="file" multiple hidden>' +
      '<small>도면·견적요청서 등 · pdf, 이미지, hwp, doc, xls, dwg 등 · 파일당 ' + C.MAX_MB + 'MB 이하</small></div></div>' +
      '</section>';
  }

  function tpl(mode, fixedPw) {
    var isNew = mode === 'new', pwInline = isNew && !fixedPw;
    return '<form class="q-form" novalidate autocomplete="off">' +
      '<fieldset class="q-sec q-co"><legend><span class="q-no">1</span>의뢰회사 정보<span class="q-leg-act"></span></legend>' +
      (pwInline
        ? '<div class="q-grid q-gn"><div class="q-f"><label for="qf-name">의뢰회사명 <i>*</i></label><input id="qf-name" name="name" maxlength="100" autocomplete="organization"></div>' +
          '<div class="q-f q-pwf"><label for="qf-pw">비밀번호 <i>*</i></label><div class="q-inline">' +
          '<input id="qf-pw" name="password" type="password" maxlength="64" autocomplete="new-password" placeholder="4자 이상">' +
          '<button type="button" class="q-btn q-btn-line q-btn-sm2" data-act="pwshow" aria-pressed="false">보기</button>' +
          '<em class="q-pwmsg" aria-live="polite">4자 이상 · 수정/삭제 시 로그인에 사용</em></div></div></div>'
        : '<div class="q-grid q-g1"><div class="q-f"><label for="qf-name">의뢰회사명 <i>*</i></label><input id="qf-name" name="name" maxlength="100" autocomplete="organization"></div></div>') +
      '<div class="q-grid q-g3">' +
      '<div class="q-f"><label for="qf-biz">사업자등록번호 <i>*</i></label>' +
      '<input id="qf-biz" name="biz_no" inputmode="numeric" maxlength="12" placeholder="000-00-00000">' +
      '<small><em class="q-badge" data-biz aria-live="polite"></em> 입력 즉시 번호를 검증합니다</small></div>' +
      '<div class="q-f"><label for="qf-phone">회사 전화번호 <i>*</i></label><input id="qf-phone" name="phone" inputmode="tel" maxlength="14" placeholder="031-000-0000" autocomplete="tel"></div>' +
      '<div class="q-f"><label for="qf-fax">FAX 번호</label><input id="qf-fax" name="fax" inputmode="tel" maxlength="14" placeholder="02-000-0000"></div>' +
      '</div>' +
      '<div class="q-f q-addr"><span class="q-lbl">주소 <i>*</i></span>' +
      '<div class="q-inline"><input name="zipcode" class="q-zip" readonly placeholder="우편번호" aria-label="우편번호"><button type="button" class="q-btn q-btn-sm2" data-act="addr">주소 검색</button>' +
      '<input name="address" readonly placeholder="‘주소 검색’을 눌러 주소를 선택하세요" aria-label="주소"></div>' +
      '<input name="address_detail" maxlength="100" placeholder="상세주소 (동·호수, 층 등)" aria-label="상세주소"></div>' +
      (isNew ? '' :
      '<div class="q-pwtoggle"><button type="button" class="q-link" data-act="pwopen" aria-expanded="false" aria-controls="qf-pwbox">비밀번호 변경 ▾</button></div>' +
      '<div class="q-pwbox" id="qf-pwbox" hidden><div class="q-grid q-g3 q-g3b">' +
      '<div class="q-f"><label for="qf-pw">새 비밀번호</label><input id="qf-pw" name="password" type="password" maxlength="64" autocomplete="new-password" placeholder="4자 이상"></div>' +
      '<div class="q-f"><label for="qf-pw2">새 비밀번호 확인</label><input id="qf-pw2" name="password2" type="password" maxlength="64" autocomplete="new-password"></div></div>' +
      '<div class="q-pwact"><button type="button" class="q-btn q-btn-red q-btn-sm" data-act="pwsave">수정</button><button type="button" class="q-btn q-btn-line q-btn-sm" data-act="pwcancel">취소</button>' +
      '<em class="q-pwmsg q-pwbox-msg" aria-live="polite">‘수정’을 눌러야 비밀번호가 변경됩니다.</em></div></div>') +
      '</div></fieldset>' +

      '<fieldset class="q-sec q-st"><legend><span class="q-no">2</span>사업장 정보 <small>한 회사에 여러 사업장을 등록할 수 있습니다</small></legend>' +
      '<div class="q-sites"></div>' +
      '<div class="q-nosite" hidden>등록된 사업장이 없습니다. <button type="button" class="q-btn q-btn-st q-btn-sm" data-act="add-site">+ 사업장 추가</button></div></fieldset>' +
      '<p class="q-msg" role="alert" aria-live="assertive"></p>' +
      '</form>';
  }

  function create(host, opt) {
    opt = opt || {};
    var mode = opt.mode || 'new', data = opt.data || null;
    var form = el(tpl(mode, !!opt.pw));
    host.innerHTML = ''; host.appendChild(form);
    var $ = function (sel) { return form.querySelector(sel); };
    var sitesEl = $('.q-sites'), msg = $('.q-msg');
    var daumReady = true;

    function say(t, ok) { msg.textContent = t || ''; msg.className = 'q-msg' + (t ? (ok ? ' ok' : ' err') : ''); }
    function field(name, root) { return (root || form).querySelector('[name="' + name + '"]'); }
    function fail(t, input) { var e = new Error(t); e.input = input; throw e; }

    /* ---- 사업자번호 즉시 검증 ---- */
    var biz = field('biz_no'), badge = $('[data-biz]');
    function bizCheck() {
      biz.value = C.fmtBiz(biz.value);
      var d = C.digits(biz.value);
      if (!d) { badge.textContent = ''; badge.className = 'q-badge'; biz.removeAttribute('aria-invalid'); return; }
      if (d.length < 10) { badge.textContent = d.length + '/10'; badge.className = 'q-badge'; return; }
      var ok = C.validBiz(d);
      badge.textContent = ok ? '✓ 유효한 번호' : '✗ 번호를 확인하세요';
      badge.className = 'q-badge ' + (ok ? 'ok' : 'bad');
      biz.setAttribute('aria-invalid', ok ? 'false' : 'true');
    }
    biz.addEventListener('input', bizCheck);

    ['phone', 'fax'].forEach(function (n) {
      field(n).addEventListener('blur', function (e) { e.target.value = C.fmtPhone(e.target.value); });
    });

    /* ---- 사업장 ---- */
    function renumber() {
      var list = sitesEl.querySelectorAll('.q-site');
      list.forEach(function (s, i) {
        s.querySelector('.q-site-no').textContent = '사업장 ' + (i + 1);
        s.querySelector('[data-act="del-site"]').hidden = mode === 'new' && list.length < 2;
        s.querySelector('[data-act="add-site"]').hidden = i !== list.length - 1;
      });
      $('.q-nosite').hidden = list.length > 0;
    }
    function renderFiles(s) {
      var ul = s.querySelector('.q-files');
      ul.innerHTML = s._files.map(function (f, i) {
        var full = f.file_path ? f.file_name : f.file.name;
        var name = f.file_path
          ? '<a href="' + C.esc(C.fileUrl(f.file_path)) + '" target="_blank" rel="noopener" title="' + C.esc(full) + '">' + C.esc(shortName(full)) + '</a>'
          : '<span title="' + C.esc(full) + '">' + C.esc(shortName(full)) + '</span> <small class="q-pend">(등록 시 업로드)</small>';
        return '<li>' + name + ' <small>' + C.size(f.file_size != null ? f.file_size : f.file.size) + '</small>' +
          '<button type="button" class="q-link q-del" data-act="rm-file" data-i="' + i + '" aria-label="파일 제거">제거</button></li>';
      }).join('');
      s.querySelector('.q-fcount').textContent = s._files.length ? '(' + s._files.length + ')' : '';
    }
    function addSite(d) {
      var s = el(siteTpl(++seq));
      s._files = []; s._id = d && d.id || '';
      if (d) {
        field('site_name', s).value = d.site_name || '';
        field('manager', s).value = d.manager || '';
        field('contact', s).value = d.contact || '';
        (d.files || []).forEach(function (f) { s._files.push({ id: f.id, file_name: f.file_name, file_path: f.file_path, file_size: f.file_size }); });
      }
      sitesEl.appendChild(s); renderFiles(s); renumber();
      return s;
    }

    /* ---- 이벤트 ---- */
    form.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act'), s = b.closest('.q-site');
      if (act === 'add-site') { var n = addSite(); n.scrollIntoView({ block: 'center', behavior: 'smooth' }); field('site_name', n).focus({ preventScroll: true }); }
      else if (act === 'del-site') {
        if (s._id && opt.onDeleteSite) {
          if (!confirm('이 사업장과 첨부파일 정보를 삭제할까요?\n삭제하면 복구할 수 없습니다.')) return;
          b.disabled = true;
          opt.onDeleteSite(s._id).then(function () {
            s.remove(); renumber(); say('사업장이 삭제되었습니다.', true);
            if (opt.onSitesChange) opt.onSitesChange();
          }).catch(function (er) { b.disabled = false; say(er.message); });
        } else if (mode !== 'new' || sitesEl.children.length > 1) {
          if (s._id && !confirm('이 사업장을 삭제할까요? (저장하면 확정됩니다)')) return;
          s.remove(); renumber(); if (opt.onSitesChange) opt.onSitesChange();
        }
      }
      else if (act === 'pick') s.querySelector('input[type=file]').click();
      else if (act === 'rm-file') { s._files.splice(+b.getAttribute('data-i'), 1); renderFiles(s); }
      else if (act === 'addr') openAddr();
      else if (act === 'pwopen') pwToggle($('.q-pwbox').hidden);
      else if (act === 'pwcancel') pwToggle(false);
      else if (act === 'pwsave') changePw(b);
      else if (act === 'pwshow') {
        var pi = field('password'), on = pi.type === 'password';
        pi.type = on ? 'text' : 'password'; b.textContent = on ? '숨김' : '보기'; b.setAttribute('aria-pressed', on);
      }
    });
    form.addEventListener('change', function (e) {
      if (e.target.type !== 'file') return;
      var s = e.target.closest('.q-site'), errs = [];
      Array.prototype.forEach.call(e.target.files, function (f) {
        var er = C.checkFile(f); if (er) errs.push(er); else s._files.push({ file: f });
      });
      e.target.value = ''; renderFiles(s); say(errs.join('\n'));
    });
    function pwToggle(open) {
      var box = $('.q-pwbox'), t = $('[data-act="pwopen"]');
      box.hidden = !open; t.setAttribute('aria-expanded', open); t.textContent = open ? '비밀번호 변경 닫기 ▴' : '비밀번호 변경 ▾';
      field('password').value = ''; field('password2').value = '';
      var m = $('.q-pwbox-msg'); m.textContent = '‘수정’을 눌러야 비밀번호가 변경됩니다.'; m.className = 'q-pwmsg q-pwbox-msg';
      if (open) field('password').focus();
    }
    function changePw(btn) {
      var m = $('.q-pwbox-msg'), p1 = field('password').value, p2 = field('password2').value;
      function bad(t, el) { m.textContent = t; m.className = 'q-pwmsg q-pwbox-msg err'; if (el) el.focus(); }
      if (p1.length < 4) return bad('새 비밀번호는 4자 이상 입력하세요.', field('password'));
      if (p1 !== p2) return bad('비밀번호 확인이 일치하지 않습니다.', field('password2'));
      if (!opt.onChangePassword) return bad('비밀번호를 변경할 수 없습니다.');
      btn.disabled = true;
      opt.onChangePassword(p1).then(function () { pwToggle(false); say('비밀번호가 변경되었습니다.', true); },
        function (er) { bad(er.message); }).then(function () { btn.disabled = false; });
    }
    var pwm = $('.q-pwmsg:not(.q-pwbox-msg)'), pwHint = pwm ? pwm.textContent : '';
    function pwSay(t) { if (pwm) { pwm.textContent = t || pwHint; pwm.className = 'q-pwmsg' + (t ? ' err' : ''); } }
    form.addEventListener('input', function (e) {
      if (e.target.name === 'password' && mode === 'new') pwSay('');
      if (e.target.getAttribute('aria-invalid') === 'true' && e.target !== biz) e.target.removeAttribute('aria-invalid');
    });
    form.addEventListener('focusout', function (e) {
      if (e.target.name === 'contact') e.target.value = C.fmtPhone(e.target.value);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    /* ---- 주소 검색 (카카오(다음) 우편번호 서비스) ---- */
    function openAddr() {
      var zip = field('zipcode'), adr = field('address');
      if (!(window.daum && window.daum.Postcode)) {
        zip.readOnly = false; adr.readOnly = false; adr.placeholder = '주소를 직접 입력하세요';
        say('주소 검색 서비스를 불러오지 못했습니다. 주소를 직접 입력해 주세요.'); adr.focus(); return;
      }
      new window.daum.Postcode({
        oncomplete: function (d) {
          var a = d.userSelectedType === 'R' ? d.roadAddress : d.jibunAddress;
          if (d.userSelectedType === 'R' && d.buildingName && d.apartment === 'Y') a += ' (' + d.buildingName + ')';
          zip.value = d.zonecode; adr.value = a; adr.removeAttribute('aria-invalid');
          say(''); field('address_detail').focus();
        }
      }).open();
    }

    /* ---- 값 채우기 ---- */
    if (data) {
      ['name', 'zipcode', 'address', 'address_detail'].forEach(function (n) { field(n).value = data[n] || ''; });
      field('biz_no').value = C.fmtBiz(data.biz_no); field('phone').value = C.fmtPhone(data.phone); field('fax').value = C.fmtPhone(data.fax);
      bizCheck();
      if (data.id) (data.sites || []).forEach(function (s) { addSite(s); }); else addSite();
      renumber();
    } else addSite();

    /* ---- 검증 + 파일 업로드 → 서버로 보낼 payload ---- */
    function validate() {
      var v = function (n, t, root) { var i = field(n, root); if (!i.value.trim()) fail(t, i); return i.value.trim(); };
      v('name', '의뢰회사명을 입력하세요.');
      var pwEl = mode === 'new' ? field('password') : null;
      if (pwEl && pwEl.value.length < 4) { var pe = new Error('비밀번호는 4자 이상 입력하세요.'); pe.input = pwEl; pe.inline = true; throw pe; }
      if (!C.validBiz(biz.value)) fail('사업자등록번호가 올바르지 않습니다. 번호를 다시 확인해 주세요.', biz);
      v('address', '‘주소 검색’으로 주소를 입력하세요.', null);
      v('phone', '회사 전화번호를 입력하세요.');
      if (C.digits(field('phone').value).length < 8) fail('회사 전화번호를 끝까지 입력하세요.', field('phone'));
      var sites = sitesEl.querySelectorAll('.q-site');
      if (!sites.length && mode === 'new') fail('사업장을 1개 이상 입력하세요.');
      sites.forEach(function (s, i) {
        var tag = '사업장 ' + (i + 1) + ' — ';
        v('site_name', tag + '사업장명을 입력하세요.', s); v('manager', tag + '담당자를 입력하세요.', s);
        v('contact', tag + '담당자 연락처를 입력하세요.', s);
        if (C.digits(field('contact', s).value).length < 9) fail(tag + '연락처를 끝까지 입력하세요.', field('contact', s));
      });
    }
    function payload(onProgress) {
      try { validate(); } catch (err) {
        if (err.input) { err.input.setAttribute('aria-invalid', 'true'); err.input.scrollIntoView({ block: 'center', behavior: 'smooth' }); err.input.focus({ preventScroll: true }); }
        if (err.inline) { pwSay(err.message); say(''); } else say(err.message);
        return Promise.reject(err);
      }
      var pend = [];
      sitesEl.querySelectorAll('.q-site').forEach(function (s) { s._files.forEach(function (f) { if (f.file) pend.push(f); }); });
      var done = 0;
      var chain = pend.reduce(function (p, f) {
        return p.then(function () {
          if (onProgress) onProgress('파일 업로드 중… (' + (++done) + '/' + pend.length + ')');
          return C.upload(f.file).then(function (r) { f.file_name = r.file_name; f.file_path = r.file_path; f.file_size = r.file_size; delete f.file; });
        });
      }, Promise.resolve());
      return chain.then(function () {
        var pwEl2 = mode === 'new' ? field('password') : null;
        var out = {
          id: data && data.id || null,
          name: field('name').value.trim(), biz_no: C.digits(biz.value),
          zipcode: field('zipcode').value.trim(), address: field('address').value.trim(),
          address_detail: field('address_detail').value.trim(),
          phone: field('phone').value.trim(), fax: field('fax').value.trim(),
          sites: Array.prototype.map.call(sitesEl.querySelectorAll('.q-site'), function (s) {
            return {
              id: s._id || null, site_name: field('site_name', s).value.trim(), manager: field('manager', s).value.trim(),
              contact: field('contact', s).value.trim(),
              files: s._files.map(function (f) { return { id: f.id || null, file_name: f.file_name, file_path: f.file_path, file_size: f.file_size }; })
            };
          })
        };
        if (opt.pw) out.password = opt.pw; else if (pwEl2 && pwEl2.value) out.password = pwEl2.value;
        return out;
      });
    }
    function focusSite(id) {
      var s = Array.prototype.filter.call(sitesEl.querySelectorAll('.q-site'), function (x) { return x._id === id; })[0];
      if (s) s.scrollIntoView({ block: 'center' });
    }
    function savedSites() { return Array.prototype.filter.call(sitesEl.querySelectorAll('.q-site'), function (x) { return x._id; }).length; }
    return { el: form, say: say, payload: payload, focusSite: focusSite, savedSites: savedSites, actions: form.querySelector('.q-leg-act') };
  }

  window.CheumForm = { create: create };
})();
