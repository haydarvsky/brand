/* ===== معرضُ الهوياتِ البصرية: العرضُ والتصفيةُ ونافذةُ التفاصيل ===== */
(function () {
  'use strict';

  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function arNum(n) { return String(n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  var elGrid = document.getElementById('grid'),
    elChips = document.getElementById('chips'),
    elCount = document.getElementById('count'),
    elEmpty = document.getElementById('empty'),
    sheet = document.getElementById('sheet'),
    sheetInner = document.getElementById('sheetInner');

  var ALL = [], sector = '', lastFocus = null;

  fetch('data/brands.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      ALL = (d.brands || []).filter(function (b) { return !b.hidden; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      chips(); render();
    })
    .catch(function () {
      elGrid.innerHTML = '<div class="empty"><b>تعذَّر تحميلُ الأعمال</b>أعِدْ تحديثَ الصفحة بعد قليل.</div>';
    });

  function chips() {
    var counts = {};
    ALL.forEach(function (b) { if (b.sector) counts[b.sector] = (counts[b.sector] || 0) + 1; });
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    if (!keys.length) return;
    elChips.innerHTML = '<button class="chip" type="button" data-s="" aria-pressed="true">الكلّ</button>'
      + keys.map(function (k) { return '<button class="chip" type="button" data-s="' + esc(k) + '" aria-pressed="false">' + esc(k) + '</button>'; }).join('');
    elChips.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      sector = b.dataset.s || '';
      [].forEach.call(elChips.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      render();
    });
  }

  function tileHtml(b, big) {
    var inner;
    if (b.logo) {
      inner = '<img src="' + esc(b.logo) + '" alt="شعار ' + esc(b.name) + '"'
        + (b.logoFit === 'cover' ? ' class="cover"' : '')
        + ' loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'word\',textContent:this.alt.replace(\'شعار \',\'\')}))">';
    } else {
      inner = '<div class="word">' + esc(b.name) + '</div>';
    }
    return '<div class="tile" style="--bg:' + esc(b.bg || '#0F4C3A') + '">'
      + inner
      + (b.year ? '<span class="year">' + arNum(b.year) + '</span>' : '')
      + '</div>';
  }

  function cardHtml(b, i) {
    var sw = (b.colors || []).slice(0, 6).map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join('');
    return '<button class="bcard' + (b.featured ? ' big' : '') + '" type="button" data-id="' + esc(b.id) + '" data-in style="--d:' + (Math.min(i, 8) * 55) + 'ms">'
      + tileHtml(b, b.featured)
      + '<div class="bbody">'
      + (b.sector ? '<div class="tag">' + esc(b.sector) + '</div>' : '')
      + '<h3>' + esc(b.name) + '</h3>'
      + (b.tagline ? '<p class="tl">' + esc(b.tagline) + '</p>' : '')
      + (sw ? '<div class="sw" aria-hidden="true">' + sw + '</div>' : '')
      + '<span class="go">تفاصيلُ الهوية <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg></span>'
      + '</div></button>';
  }

  function render() {
    var shown = ALL.filter(function (b) { return !sector || b.sector === sector; });
    elGrid.innerHTML = shown.map(cardHtml).join('');
    elEmpty.hidden = shown.length > 0;
    elCount.textContent = shown.length
      ? arNum(shown.length) + ' ' + (shown.length === 1 ? 'هوية' : (shown.length === 2 ? 'هويتان' : 'هويات'))
      + (sector ? ' في «' + sector + '»' : '')
      : '';
    reveal();
  }

  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;

  function reveal() {
    var fresh = document.querySelectorAll('main [data-in]:not(.in)');
    if (!io) { fresh.forEach(function (el) { el.classList.add('in'); }); return; }
    fresh.forEach(function (el) { io.observe(el); });
    setTimeout(function () { fresh.forEach(function (el) { el.classList.add('in'); }); }, 2600);
  }

  /* ---------- نافذةُ التفاصيل ---------- */
  elGrid.addEventListener('click', function (e) {
    var c = e.target.closest('.bcard'); if (!c) return;
    var b = ALL.filter(function (x) { return x.id === c.dataset.id; })[0];
    if (b) open(b, c);
  });

  function open(b, trigger) {
    lastFocus = trigger || null;
    var hero = b.logo
      ? '<img src="' + esc(b.logo) + '" alt="شعار ' + esc(b.name) + '"' + (b.logoFit === 'cover' ? ' class="cover"' : '') + '>'
      : '<div class="word">' + esc(b.name) + '</div>';
    var pal = (b.colors || []).map(function (c) {
      return '<button type="button" data-hex="' + esc(c) + '" title="انقرْ لنسخِ الرمز">'
        + '<i style="background:' + esc(c) + '"></i><span>' + esc(c.toUpperCase()) + '</span></button>';
    }).join('');
    var fonts = (b.fonts || []).map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('');
    var dels = (b.deliverables || []).map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('');

    sheetInner.innerHTML =
      '<div class="hero" style="--bg:' + esc(b.bg || '#0F4C3A') + '">' + hero + '</div>'
      + '<div class="body">'
      + (b.sector ? '<div class="tag">' + esc(b.sector) + (b.year ? ' — ' + arNum(b.year) : '') + '</div>' : '')
      + '<h2 id="sheetTitle">' + esc(b.name) + '</h2>'
      + (b.tagline ? '<div class="tag" style="color:rgba(42,26,15,.55);font-weight:400;font-size:17.5px">' + esc(b.tagline) + '</div>' : '')
      + (b.about ? '<p class="about">' + esc(b.about) + '</p>' : '')
      + (pal ? '<h4>لوحةُ الألوان <span class="copied" id="copied">نُسِخ ✓</span></h4><div class="pal">' + pal + '</div>' : '')
      + (fonts ? '<h4>الخطوط</h4><div class="pills">' + fonts + '</div>' : '')
      + (dels ? '<h4>ما سُلِّم</h4><div class="pills">' + dels + '</div>' : '')
      + (b.link ? '<a class="visit" href="' + esc(b.link) + '" target="_blank" rel="noopener">افتحْ لوحةَ الهوية'
        + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg></a>' : '')
      + '</div>';

    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
    var cl = sheet.querySelector('.close'); if (cl) cl.focus();
  }

  function close() {
    sheet.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet.classList.contains('open')) close(); });

  /* نسخُ رمزِ اللون */
  sheetInner.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hex]'); if (!b) return;
    var hex = b.dataset.hex;
    var done = function () {
      var tip = document.getElementById('copied');
      if (!tip) return;
      tip.classList.add('on'); setTimeout(function () { tip.classList.remove('on'); }, 1400);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(hex).then(done, done);
    else done();
  });

  /* ترويسةٌ تدخلُ مع الخطوط */
  var headIns = document.querySelectorAll('.head [data-in]');
  var started = false;
  function enterHead() {
    headIns.forEach(function (el) { el.classList.add('in'); });
    var r = document.querySelector('.head .rule'); if (r) r.classList.add('in');
    setTimeout(function () { headIns.forEach(function (el) { el.style.setProperty('--d', '0ms'); }); }, 1400);
  }
  function startOnce() { if (started) return; started = true; requestAnimationFrame(enterHead); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(startOnce);
  setTimeout(startOnce, 900);

  /* شريطُ التقدّم */
  var bar = document.querySelector('.progress i'), ticking = false;
  addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min((scrollY || 0) / max, 1) : 0) + ')';
      ticking = false;
    });
  }, { passive: true });
})();
