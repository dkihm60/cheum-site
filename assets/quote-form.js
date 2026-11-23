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
      '<div class="q-site-hd"><b class="q-site-no">사업장</b><span class="q-dirty-tag" hidden>● 저장 안 됨</span><span class="q-site-ops">' +
      '<button type="button" class="q-btn q-btn-red q-btn-sm" data-act="save-site" hidden>저장</button>' +
      '<button type="button" class="q-btn q-btn-st q-btn-sm" data-act="add-site">+ 사업장 추가</button>' +
      '<button type="button" class="q-link q-del" data-act="del-site">삭제</button></span></div>' +
      '<div class="q-grid q-gs">' +
      '<div class="q-f"><label for="sn' + id + '">사업장명 <i>*</i></label><input id="sn' + id + '" name="site_name" maxlength="100" placeholder="예: OO아파트 신축현장"></div>' +
      '<div class="q-f"><label for="sm' + id + '">담당자 <i>*</i></label><input id="sm' + id + '" name="manager" maxlength="50" autocomplete="off"></div>' +
      '<div class="q-f"><label for="sc' + id + '">연락처 <i>*</i></label><input id="sc' + id + '" name="contact" inputmode="tel" maxlength="14" placeholder="010-0000-0000" autocomplete="off"></div>' +
      '</div>' +
      '<div class="q-boardbox">' +
      '<div class="q-board-hd"><span class="q-lbl">첨부파일 <small class="q-fcount"></small></span>' +
      '<button type="button" class="q-btn q-btn-st q-btn-sm" data-act="pick">+ 파일 추가</button><input type="file" multiple hidden></div>' +
      '<div class="q-board-wrap"><table class="q-board"><thead><tr><th class="c-no">번호</th><th>파일명</th><th class="c-sz">크기</th><th class="c-dl">다운로드</th><th class="c-rm">삭제</th></tr></thead><tbody></tbody></table></div>' +
      '<div class="q-board-ft">여러 개를 한 번에 선택하거나 이 표에 끌어놓아 추가 · pdf, 이미지, hwp, doc, xls, dwg 등 · 파일당 ' + C.MAX_MB + 'MB 이하</div>' +
      '</div>' +
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
    if (opt.fullNames) form.classList.add('q-full');
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
      var tb = s.querySelector('.q-board tbody');
      tb.innerHTML = s._files.length ? s._files.map(function (f, i) {
        var saved = !!f.file_path, full = saved ? f.file_name : f.file.name;
        var dl = saved
          ? '<a class="q-btn q-btn-line q-btn-sm q-dlbtn" href="' + C.esc(C.fileUrl(f.file_path, full)) + '" download="' + C.esc(full) + '" rel="noopener" aria-label="' + C.esc(full) + ' 다운로드">다운로드</a>'
          : '<span class="q-pend">저장 후 가능</span>';
        return '<tr><td class="c-no">' + (i + 1) + '</td><td class="c-nm" title="' + C.esc(full) + '">' + C.esc(opt.fullNames ? full : shortName(full)) +
          (saved ? '' : ' <small class="q-pend">(' + (opt.onSaveSite ? '저장 시 업로드' : '등록 시 업로드') + ')</small>') + '</td>' +
          '<td class="c-sz">' + C.size(f.file_size != null ? f.file_size : f.file.size) + '</td><td class="c-dl">' + dl + '</td>' +
          '<td class="c-rm"><button type="button" class="q-link q-del" data-act="rm-file" data-i="' + i + '" aria-label="파일 삭제">삭제</button></td></tr>';
      }).join('') : '<tr><td colspan="5" class="q-board-empty">첨부된 파일이 없습니다. ‘+ 파일 추가’로 여러 개를 올릴 수 있습니다.</td></tr>';
      s.querySelector('.q-fcount').textContent = s._files.length ? '(' + s._files.length + '개)' : '';
    }
    /* 파일 여러 개 추가: 파일 선택(복수) 또는 끌어놓기. 형식·크기·중복 검사 */
    function addFiles(s, list) {
      var errs = [], added = 0;
      Array.prototype.forEach.call(list, function (f) {
        var er = C.checkFile(f); if (er) { errs.push(er); return; }
        var dup = s._files.some(function (x) { return x.file ? (x.file.name === f.name && x.file.size === f.size) : (x.file_name === f.name && +x.file_size === f.size); });
        if (dup) { errs.push('"' + f.name + '" — 이미 추가된 파일입니다.'); return; }
        s._files.push({ file: f }); added++;
      });
      renderFiles(s); if (added) setDirty(s, true);
      say(errs.join('\n') || (added ? added + '개 파일이 추가되었습니다.' + (opt.onSaveSite && mode !== 'new' ? ' ‘저장’을 누르면 업로드됩니다.' : '') : ''), !errs.length && !!added);
    }
    function setDirty(s, on) {
      if (!opt.onSaveSite || mode === 'new') return;
      s.classList.toggle('q-dirty', on); s.querySelector('.q-dirty-tag').hidden = !on;
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
      sitesEl.appendChild(s);
      s.querySelector('[data-act="save-site"]').hidden = !(opt.onSaveSite && mode !== 'new');
      renderFiles(s); renumber();
      if (!d && opt.onSaveSite && mode !== 'new') setDirty(s, true);       // 새 사업장은 저장 전까지 '저장 안 됨'
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
      else if (act === 'rm-file') { s._files.splice(+b.getAttribute('data-i'), 1); renderFiles(s); setDirty(s, true); }
      else if (act === 'save-site') saveSite(s, b);
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
      addFiles(e.target.closest('.q-site'), e.target.files); e.target.value = '';
    });
    form.addEventListener('dragover', function (e) { var bw = e.target.closest && e.target.closest('.q-boardbox'); if (bw) { e.preventDefault(); bw.classList.add('q-drag'); } });
    form.addEventListener('dragleave', function (e) { var bw = e.target.closest && e.target.closest('.q-boardbox'); if (bw && !bw.contains(e.relatedTarget)) bw.classList.remove('q-drag'); });
    form.addEventListener('drop', function (e) {
      var bw = e.target.closest && e.target.closest('.q-boardbox'); if (!bw) return;
      e.preventDefault(); bw.classList.remove('q-drag'); addFiles(bw.closest('.q-site'), e.dataTransfer.files);
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
      var st = e.target.closest && e.target.closest('.q-site'); if (st) setDirty(st, true);
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
      field('address').title = data.address || '';
      field('biz_no').value = C.fmtBiz(data.biz_no); field('phone').value = C.fmtPhone(data.phone); field('fax').value = C.fmtPhone(data.fax);
      bizCheck();
      if (data.id) (data.sites || []).forEach(function (s) { addSite(s); }); else addSite();
      renumber();
    } else addSite();

    /* ---- 검증 + 파일 업로드 → 서버로 보낼 payload ---- */
    var v = function (n, t, root) { var i = field(n, root); if (!i.value.trim()) fail(t, i); return i.value.trim(); };
    function validateSite(s) {
      var i = Array.prototype.indexOf.call(sitesEl.querySelectorAll('.q-site'), s), tag = '사업장 ' + (i + 1) + ' — ';
      v('site_name', tag + '사업장명을 입력하세요.', s); v('manager', tag + '담당자를 입력하세요.', s);
      v('contact', tag + '담당자 연락처를 입력하세요.', s);
      if (C.digits(field('contact', s).value).length < 9) fail(tag + '연락처를 끝까지 입력하세요.', field('contact', s));
    }
    function validate() {
      v('name', '의뢰회사명을 입력하세요.');
      var pwEl = mode === 'new' ? field('password') : null;
      if (pwEl && pwEl.value.length < 4) { var pe = new Error('비밀번호는 4자 이상 입력하세요.'); pe.input = pwEl; pe.inline = true; throw pe; }
      if (!C.validBiz(biz.value)) fail('사업자등록번호가 올바르지 않습니다. 번호를 다시 확인해 주세요.', biz);
      v('address', '‘주소 검색’으로 주소를 입력하세요.', null);
      v('phone', '회사 전화번호를 입력하세요.');
      if (C.digits(field('phone').value).length < 8) fail('회사 전화번호를 끝까지 입력하세요.', field('phone'));
      var sites = sitesEl.querySelectorAll('.q-site');
      if (!sites.length && mode === 'new') fail('사업장을 1개 이상 입력하세요.');
      if (!(opt.onSaveSite && mode !== 'new')) sites.forEach(validateSite);       // 사업장별 저장 방식이면 회사정보 수정 때는 사업장 검증 안 함
    }
    function showErr(err) {
      if (err.input) { err.input.setAttribute('aria-invalid', 'true'); err.input.scrollIntoView({ block: 'center', behavior: 'smooth' }); err.input.focus({ preventScroll: true }); }
      if (err.inline) { pwSay(err.message); say(''); } else say(err.message);
    }
    /* 선택해 둔 파일을 올리고(저장소), 서버에 보낼 사업장 데이터 반환 */
    function uploadSite(s, onProgress) {
      var pend = s._files.filter(function (f) { return f.file; }), done = 0;
      return pend.reduce(function (p, f) {
        return p.then(function () {
          if (onProgress) onProgress('파일 업로드 중… (' + (++done) + '/' + pend.length + ')');
          return C.upload(f.file).then(function (r) { f.file_name = r.file_name; f.file_path = r.file_path; f.file_size = r.file_size; delete f.file; });
        });
      }, Promise.resolve());
    }
    function sitePayload(s) {
      return {
        id: s._id || null, site_name: field('site_name', s).value.trim(), manager: field('manager', s).value.trim(),
        contact: field('contact', s).value.trim(),
        files: s._files.map(function (f) { return { id: f.id || null, file_name: f.file_name, file_path: f.file_path, file_size: f.file_size }; })
      };
    }
    /* 사업장 1건 저장: 검증 → 파일 업로드 → 서버 저장 → 화면 갱신 */
    function saveSite(s, btn) {
      if (!opt.onSaveSite) return;
      try { validateSite(s); } catch (err) { showErr(err); return; }
      btn.disabled = true; btn.textContent = '저장 중…'; say('');
      uploadSite(s, function (t) { say(t, true); }).then(function () { return opt.onSaveSite(sitePayload(s)); }).then(function (res) {
        s._id = res.id;
        s._files = (res.files || []).map(function (f) { return { id: f.id, file_name: f.file_name, file_path: f.file_path, file_size: f.file_size }; });
        renderFiles(s); setDirty(s, false);
        say('‘' + field('site_name', s).value.trim() + '’ 사업장이 저장되었습니다.', true);
        if (opt.onSitesChange) opt.onSitesChange();
      }).catch(function (er) { say(er.message); }).then(function () { btn.disabled = false; btn.textContent = '저장'; });
    }
    function payload(onProgress) {
      try { validate(); } catch (err) { showErr(err); return Promise.reject(err); }
      var chain = Promise.resolve(), perSite = opt.onSaveSite && mode !== 'new';
      if (!perSite) sitesEl.querySelectorAll('.q-site').forEach(function (s) { chain = chain.then(function () { return uploadSite(s, onProgress); }); });
      return chain.then(function () {
        var pwEl2 = mode === 'new' ? field('password') : null;
        var out = {
          id: data && data.id || null,
          name: field('name').value.trim(), biz_no: C.digits(biz.value),
          zipcode: field('zipcode').value.trim(), address: field('address').value.trim(),
          address_detail: field('address_detail').value.trim(),
          phone: field('phone').value.trim(), fax: field('fax').value.trim()
        };
        if (!perSite) out.sites = Array.prototype.map.call(sitesEl.querySelectorAll('.q-site'), sitePayload);   // 사업장별 저장 방식이면 회사정보만 전송
        if (opt.pw) out.password = opt.pw; else if (pwEl2 && pwEl2.value) out.password = pwEl2.value;
        return out;
      });
    }
    function focusSite(id) {
      var s = Array.prototype.filter.call(sitesEl.querySelectorAll('.q-site'), function (x) { return x._id === id; })[0];
      if (s) s.scrollIntoView({ block: 'center' });
    }
    function counts() {
      var l = Array.prototype.filter.call(sitesEl.querySelectorAll('.q-site'), function (x) { return x._id; });
      return { sites: l.length, files: l.reduce(function (n, x) { return n + x._files.filter(function (f) { return f.id; }).length; }, 0) };
    }
    function savedSites() { return Array.prototype.filter.call(sitesEl.querySelectorAll('.q-site'), function (x) { return x._id; }).length; }
    return { el: form, say: say, payload: payload, focusSite: focusSite, savedSites: savedSites, counts: counts, actions: form.querySelector('.q-leg-act') };
  }

  window.CheumForm = { create: create };
})();
