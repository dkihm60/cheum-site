/* CHEUM — 공통 스크립트 (세로/가로 보기 공용) */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var P = window.CHEUM_PROJECTS || [];
  var MH = window.CHEUM_MODELHOUSE || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return n.toLocaleString('ko-KR'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* 시공사 이름 정규화: ㈜·(주)·주식회사 표기와 KR산업/케이알산업 표기 차이를 합친다 */
  function clientKey(c) {
    var k = c.replace(/㈜|\(주\)|주식회사|\(사\)|\s/g, '');
    k = k.replace(/^케이알산업$/, 'KR산업');
    return k;
  }
  function clientLabel(c) { return c.replace(/㈜|\(주\)|주식회사|\(사\)/g, '').replace(/\s+/g, ' ').trim().replace(/^KR 산업$/, 'KR산업').replace(/^케이알산업$/, 'KR산업'); }
  var yearOf = function (p) { return p.y.slice(0, 4); };

  /* ---------- 수치 ---------- */
  var totalUnits = P.reduce(function (a, p) { return a + (p.u || 0); }, 0);
  var clientMap = {};
  P.forEach(function (p) { var k = clientKey(p.c); if (!clientMap[k]) clientMap[k] = clientLabel(p.c); });
  var clients = Object.keys(clientMap);
  var stats = { count: fmt(P.length), units: fmt(totalUnits), clients: fmt(clients.length) };
  $$('[data-stat]').forEach(function (el) { el.textContent = stats[el.getAttribute('data-stat')] || '–'; });

  /* ---------- 시공사 마퀴 ---------- */
  var mq = $('#marquee');
  if (mq) {
    var names = clients.map(function (k) { return clientMap[k]; });
    var html = names.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('');
    mq.innerHTML = html + html;
  }

  /* ---------- 연도별 막대 ---------- */
  var years = [];
  P.forEach(function (p) { var y = yearOf(p); if (years.indexOf(y) < 0) years.push(y); });
  years.sort();
  var byYear = {};
  years.forEach(function (y) { byYear[y] = P.filter(function (p) { return yearOf(p) === y; }); });

  var chart = $('#yearChart');
  if (chart) {
    var max = Math.max.apply(null, years.map(function (y) { return byYear[y].length; }));
    chart.style.setProperty('--n', years.length);
    chart.innerHTML =
      '<div class="bars-y">' + years.map(function (y) {
        var n = byYear[y].length;
        return '<button type="button" data-year="' + y + '" aria-label="' + y + '년 ' + n + '건만 보기"><span class="v">' + n + '</span><span class="col" style="height:' + (n / max * 100).toFixed(1) + '%"></span></button>';
      }).join('') + '</div>' +
      '<div class="yl">' + years.map(function (y) { return '<span>' + y.slice(2) + '</span>'; }).join('') + '</div>';
  }

  /* ---------- 공사실적 표 ---------- */
  var body = $('#projBody');
  var state = { cat: '', year: '', q: '', limit: 0 };
  var pageSize = body ? parseInt(body.getAttribute('data-page') || '0', 10) : 0;
  state.limit = pageSize;
  var ysel = $('#yearFilter');
  if (ysel) years.slice().reverse().forEach(function (y) {
    var o = document.createElement('option'); o.value = y; o.textContent = y + '년 (' + byYear[y].length + ')'; ysel.appendChild(o);
  });

  function tags(i) {
    if (!i || i === '-') return '<span class="tag">기타 공사</span>';
    return i.split(/[,/]\s*/).map(function (t) {
      var cls = /주방/.test(t) ? ' t-k' : /시스템/.test(t) ? ' t-s' : '';
      if (t === '일반' ) t = '일반가구';
      if (t === '주방') t = '주방가구';
      if (t === '시스템') t = '시스템가구';
      return '<span class="tag' + cls + '">' + esc(t) + '</span>';
    }).join('');
  }
  function filtered() {
    var q = state.q.trim().toLowerCase();
    return P.filter(function (p) {
      if (state.cat && p.i.indexOf(state.cat) < 0) return false;
      if (state.year && yearOf(p) !== state.year) return false;
      if (q && (p.c + ' ' + p.s).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).slice().reverse();
  }
  function renderProjects() {
    if (!body) return;
    var list = filtered();
    var shown = state.limit ? list.slice(0, state.limit) : list;
    body.innerHTML = shown.length ? shown.map(function (p) {
      return '<tr><td>' + esc(p.y) + '</td><td>' + esc(p.c) + '</td><td>' + esc(p.s) + '</td><td>' + tags(p.i) + '</td><td class="num">' + (p.u ? fmt(p.u) : '–') + '</td></tr>';
    }).join('') : '<tr class="empty"><td colspan="5">조건에 맞는 실적이 없습니다. 필터를 바꿔 보세요.</td></tr>';
    var units = list.reduce(function (a, p) { return a + (p.u || 0); }, 0);
    var meta = $('#projShown');
    if (meta) meta.textContent = list.length + '건 중 ' + shown.length + '건 표시 · ' + fmt(units) + '세대';
    var more = $('#projMore');
    if (more) more.hidden = !state.limit || shown.length >= list.length;
    $$('#yearChart button').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-year') === state.year); });
  }
  function reset() { state.limit = pageSize; renderProjects(); }
  $$('.chip[data-cat]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.chip[data-cat]').forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      state.cat = b.getAttribute('data-cat'); reset();
    });
  });
  if (ysel) ysel.addEventListener('change', function () { state.year = ysel.value; reset(); });
  if (chart) chart.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-year]'); if (!b) return;
    var y = b.getAttribute('data-year');
    state.year = state.year === y ? '' : y;
    if (ysel) ysel.value = state.year;
    reset();
  });
  var search = $('#projSearch');
  if (search) search.addEventListener('input', function () { state.q = search.value; reset(); });
  var moreBtn = $('#projMore');
  if (moreBtn) moreBtn.addEventListener('click', function () { state.limit += pageSize; renderProjects(); });
  renderProjects();

  /* ---------- 모델하우스 ---------- */
  var mh = $('#mhBody');
  if (mh) mh.innerHTML = MH.slice().reverse().map(function (r) {
    return '<tr><td>' + r.y + '</td><td>' + esc(r.c) + '</td><td>' + esc(r.s) + '</td><td>' + esc(r.i) + '</td></tr>';
  }).join('');

  /* ---------- 제품 탭 ---------- */
  $$('.tabs [role="tab"]').forEach(function (t) {
    t.addEventListener('click', function () {
      var key = t.getAttribute('data-tab');
      $$('.tabs [role="tab"]').forEach(function (x) { x.setAttribute('aria-selected', x === t); });
      $$('[data-panel]').forEach(function (p) {
        var on = p.getAttribute('data-panel') === key;
        p.hidden = !on;
        if (on) p.scrollLeft = 0;
      });
    });
  });
  $$('[data-rail]').forEach(function (b) {
    b.addEventListener('click', function () {
      var rail = $$('.rail[data-panel]').filter(function (r) { return !r.hidden; })[0];
      if (rail) rail.scrollBy({ left: parseInt(b.getAttribute('data-rail'), 10) * rail.clientWidth * 0.7, behavior: 'smooth' });
    });
  });

  /* ---------- 모바일 메뉴 ---------- */
  var tog = $('.nav-toggle'), nav = $('#nav');
  if (tog && nav) {
    tog.addEventListener('click', function () {
      var open = tog.getAttribute('aria-expanded') !== 'true';
      tog.setAttribute('aria-expanded', open); tog.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      nav.classList.toggle('is-open', open);
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { tog.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }); });
  }

  /* ---------- 라이트박스 ---------- */
  var lb = $('.lightbox');
  if (lb) {
    var lbImg = $('img', lb), lbCap = $('.lb-cap', lb), group = [], idx = 0;
    var capOf = function (img) {
      var f = img.closest('figure'); var c = f && $('figcaption', f);
      return (c && c.textContent) || img.alt || '';
    };
    var show = function (i) {
      idx = (i + group.length) % group.length;
      lbImg.src = group[idx].currentSrc || group[idx].src; lbImg.alt = group[idx].alt;
      lbCap.textContent = capOf(group[idx]) + '  ·  ' + (idx + 1) + ' / ' + group.length;
    };
    document.addEventListener('click', function (e) {
      var img = e.target.closest('.gallery img, .zoom');
      if (!img) return;
      var g = img.closest('.gallery');
      group = g ? $$('img', g) : [img];
      lb.hidden = false; show(group.indexOf(img)); $('.lb-close', lb).focus();
    });
    var close = function () { lb.hidden = true; lbImg.removeAttribute('src'); };
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', function () { show(idx - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); show(idx - 1); }
      else if (e.key === 'ArrowRight') { e.stopPropagation(); show(idx + 1); }
    }, true);
  }

  /* ---------- 등장 효과 (세로 보기) ---------- */
  if ('IntersectionObserver' in window && !document.body.classList.contains('h-mode')) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });

    /* 현재 섹션 메뉴 표시 */
    var links = $$('#nav a[href^="#"]');
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { so.observe(s); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 세로 보기: 위아래 화살표로 한 화면씩 이동 ---------- */
  var vnav = $('.v-nav');
  if (vnav && !document.body.classList.contains('h-mode')) {
    var hdrH = function () { var h = $('.site-header'); return h ? h.getBoundingClientRect().height : 0; };
    var vStops = function () {
      var hh = hdrH(), view = window.innerHeight - hh, s = [0];
      var max = document.documentElement.scrollHeight - window.innerHeight;
      $$('main > section:not(.marquee), .site-footer').forEach(function (sec) {
        var top = sec.getBoundingClientRect().top + window.scrollY - hh;
        var h = sec.offsetHeight;
        s.push(top);
        for (var y = top + view * 0.85; y < top + h - view; y += view * 0.85) s.push(y);
      });
      s = s.map(function (v) { return Math.max(0, Math.min(max, Math.round(v))); }).sort(function (a, b) { return a - b; });
      return s.filter(function (v, i) { return i === 0 || v - s[i - 1] > 40; });
    };
    var vStep = function (dir) {
      var cur = window.scrollY, s = vStops(), t = null, i;
      if (dir > 0) { for (i = 0; i < s.length; i++) if (s[i] > cur + 8) { t = s[i]; break; } }
      else { for (i = s.length - 1; i >= 0; i--) if (s[i] < cur - 8) { t = s[i]; break; } }
      if (t !== null) window.scrollTo({ top: t, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    $$('[data-v]', vnav).forEach(function (b) { b.addEventListener('click', function () { vStep(parseInt(b.getAttribute('data-v'), 10)); }); });
    var vUpd = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      $('[data-v="-1"]', vnav).hidden = window.scrollY < 8;
      $('[data-v="1"]', vnav).hidden = window.scrollY > max - 8;
    };
    window.addEventListener('scroll', vUpd, { passive: true }); vUpd();
  }

  window.CHEUM = { renderProjects: renderProjects };
})();
