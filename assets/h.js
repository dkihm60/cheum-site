/* CHEUM — 페이지 보기 (가로·세로 공용)
   body.h-mode          : 16장의 페이지를 좌→우로 나열
   body.h-mode.v-mode   : 같은 16장을 위→아래로 나열
   휠 한 번 · 화살표 한 번 = 한 페이지. PC에서는 페이지마다 한 화면에 맞춰 잘림 없음 */
(function () {
  'use strict';
  var track = document.getElementById('hTrack');
  if (!track) return;
  var V = document.body.classList.contains('v-mode');           /* 세로 배치 여부 */
  var SCROLL = V ? 'scrollTop' : 'scrollLeft';
  var panels = Array.prototype.slice.call(track.querySelectorAll('.panel'));
  var bar = document.querySelector('.h-prog i');
  var countEl = document.querySelector('.h-count');
  var nameEl = document.querySelector('.h-name');
  var dotsEl = document.querySelector('.h-dots');
  var sidePrev = document.querySelector('.h-side.prev');
  var sideNext = document.querySelector('.h-side.next');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#nav a[href^="#"]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  var view = function () { return V ? track.clientHeight : track.clientWidth; };       /* 한 화면 크기 */
  var total = function () { return V ? track.scrollHeight : track.scrollWidth; };
  var maxScroll = function () { return total() - view(); };
  var desktop = function () { return window.innerWidth > 860; };

  panels.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', (p.getAttribute('data-name') || '') + ' 페이지로 이동');
    b.addEventListener('click', function () { go(i); });
    dotsEl.appendChild(b);
  });
  var dots = Array.prototype.slice.call(dotsEl.children);

  /* 패널 위치 (확대·축소된 패널도 화면 기준으로 계산) */
  function pos(p) {
    var r = p.getBoundingClientRect(), t = track.getBoundingClientRect();
    return V ? { x: r.top - t.top + track.scrollTop, w: r.height }
             : { x: r.left - t.left + track.scrollLeft, w: r.width };
  }

  /* 한 화면에 맞추기: PC에서 내용이 화면 높이를 넘는 페이지는 비율로 줄여 잘리지 않게 함 */
  function fit() {
    var keep = current();
    var tw = track.clientWidth, th = track.clientHeight;
    panels.forEach(function (p) {
      p.style.zoom = ''; p.style.width = ''; p.style.height = '';
      if (!desktop() || p.classList.contains('p-gallery')) return;
      var z = 1;
      for (var k = 0; k < 8; k++) {
        var over = p.scrollHeight / p.clientHeight;
        if (over <= 1.005) break;
        z = Math.max(0.5, z / over * 0.985);
        p.style.zoom = z; p.style.width = (tw / z) + 'px'; p.style.height = (th / z) + 'px';
        if (z === 0.5) break;
      }
    });
    track[SCROLL] = Math.min(pos(panels[keep]).x, maxScroll());
    update();
  }

  /* 멈출 위치(페이지) 목록: 각 페이지의 시작점 (휴대폰 세로 보기처럼 화면보다 긴 페이지는 화면 단위로 나눔) */
  function stops() {
    var vw = view(), max = maxScroll(), s = [];
    panels.forEach(function (p) {
      var q = pos(p), x = q.x, end = x + q.w;
      s.push(x);
      if (q.w > vw + 40) {
        var stepLen = Math.round(vw * 0.85);
        for (var y = x + stepLen; y < end - vw; y += stepLen) s.push(y);
        s.push(end - vw);
      }
    });
    s = s.map(function (v) { return Math.max(0, Math.min(max, Math.round(v))); });
    s.sort(function (a, b) { return a - b; });
    return s.filter(function (v, i) { return i === 0 || v - s[i - 1] > 4; });
  }

  function current() {
    var x = track[SCROLL] + view() * 0.35, idx = 0;
    panels.forEach(function (p, i) { if (pos(p).x <= x) idx = i; });
    return idx;
  }

  /* 이동 중 잠금: 애니메이션이 끝나고 휠 입력이 잠시 멈춰야 다음 이동을 받음 (트랙패드 관성 흡수) */
  var busy = false, animDone = true, lastWheel = 0, doneTimer = null;
  function moveTo(x) {
    busy = true; animDone = false;
    var o = { behavior: reduce ? 'auto' : 'smooth' };
    o[V ? 'top' : 'left'] = x;
    track.scrollTo(o);
    clearTimeout(doneTimer);
    doneTimer = setTimeout(function () { animDone = true; }, reduce ? 50 : 700);
  }
  if ('onscrollend' in window) track.addEventListener('scrollend', function () { animDone = true; });

  function step(dir) {
    var cur = track[SCROLL], s = stops(), target = null;
    if (dir > 0) { for (var i = 0; i < s.length; i++) if (s[i] > cur + 8) { target = s[i]; break; } }
    else { for (var j = s.length - 1; j >= 0; j--) if (s[j] < cur - 8) { target = s[j]; break; } }
    if (target !== null) moveTo(target);
  }
  function go(i) {
    i = Math.max(0, Math.min(panels.length - 1, i));
    moveTo(Math.min(pos(panels[i]).x, maxScroll()));
  }

  function update() {
    var max = maxScroll(), cur = track[SCROLL];
    bar.style.transform = 'scaleX(' + (max > 0 ? cur / max : 0) + ')';
    var i = current();
    countEl.innerHTML = '<b>' + pad(i + 1) + '</b> / ' + pad(panels.length);
    nameEl.textContent = panels[i].getAttribute('data-name') || '';
    dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i); });
    var id = panels[i].id;
    navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
    if (sidePrev) sidePrev.hidden = cur < 8;
    if (sideNext) sideNext.hidden = cur > max - 8;
  }
  track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
  var rt = null;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fit, 150); });
  window.addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  /* 안쪽에서 스크롤되는 상자(공사실적 표 등)는 그 상자를 먼저 스크롤. 페이지 자체는 제외 */
  function canScroll(el, d, axis) {
    while (el && el !== track) {
      if (el.classList && el.classList.contains('panel') && desktop()) { el = el.parentElement; continue; }
      var s = getComputedStyle(el);
      if (axis === 'y' && /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if (d > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        if (d < 0 && el.scrollTop > 0) return true;
      }
      if (axis === 'x' && /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1) {
        if (d > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
        if (d < 0 && el.scrollLeft > 0) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  var acc = 0;
  track.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return;
    var horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    var d = horiz ? e.deltaX : e.deltaY;
    if (canScroll(e.target, d, horiz ? 'x' : 'y')) return;
    if (V && horiz) return;                      /* 세로 보기에서 옆으로 쓸기는 무시 */
    e.preventDefault();
    var now = Date.now(), gap = now - lastWheel;
    lastWheel = now;
    if (busy) {
      if (animDone && gap > 220) busy = false;   /* 새 휠 동작 */
      else return;                               /* 같은 동작의 남은 입력·관성은 무시 */
    }
    if (gap > 220) acc = 0;
    acc += d;
    if (Math.abs(acc) >= 25) { step(acc > 0 ? 1 : -1); acc = 0; }
  }, { passive: false });

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    var lb = document.querySelector('.lightbox');
    if (lb && !lb.hidden) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); step(1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); step(-1); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); moveTo(maxScroll()); }
  });

  Array.prototype.slice.call(document.querySelectorAll('[data-h]')).forEach(function (b) {
    b.addEventListener('click', function () { step(b.getAttribute('data-h') === 'next' ? 1 : -1); });
  });

  /* 메뉴·버튼의 #링크를 페이지 이동으로 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var idx = id === 'top' ? 0 : panels.findIndex(function (p) { return p.id === id; });
    if (idx < 0) return;
    e.preventDefault();
    go(idx);
  });

  /* 마우스 드래그 (가로 보기만): 놓으면 드래그 방향의 다음 페이지로 */
  if (!V) {
    var drag = null;
    track.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || e.target.closest('a,button,input,select,table,img,.table-wrap')) return;
      drag = { x: e.clientX, left: track.scrollLeft };
      track.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', function (e) {
      if (!drag) return;
      track.scrollLeft = drag.left - (e.clientX - drag.x);
    });
    window.addEventListener('mouseup', function (e) {
      if (!drag) return;
      var d = e.clientX - drag.x, start = drag.left;
      drag = null; track.style.cursor = '';
      track.scrollLeft = start;
      if (Math.abs(d) >= 30) step(d < 0 ? 1 : -1);
    });
  }

  /* 시작 위치: 주소의 #페이지 */
  var start = location.hash ? panels.findIndex(function (p) { return '#' + p.id === location.hash; }) : -1;
  if (start > 0) track[SCROLL] = pos(panels[start]).x;
  fit();
})();
