/* ===== لوحةُ تحكّم معرضِ الهويات ===== */
(function () {
  'use strict';

  var OWNER = 'haydarvsky', REPO = 'brand', BRANCH = 'main';
  var TOKEN_KEY = 'br_token', DATA_PATH = 'data/brands.json';

  var MOCK = /[?&]mock=1/.test(location.search);
  var gh = null;
  var state = { brands: [], pending: {}, deletes: [], editing: null, dirty: false, pages: [] };

  var el = {};
  ['gate', 'app', 'token', 'tokenSave', 'tryMock', 'who', 'save', 'dirty', 'mock', 'rows', 'newBtn',
    'edTitle', 'drop', 'file', 'fname', 'name', 'id', 'sector', 'sectors', 'year', 'tagline', 'about',
    'cols', 'addCol', 'fromLogo', 'bg', 'bgHex', 'logoFit', 'fonts', 'dels', 'link', 'pages',
    'featured', 'hidden', 'apply', 'cancel', 'del', 'tilePrev', 'pcard', 'status']
    .forEach(function (k) { el[k] = document.getElementById(k); });

  var AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function arNum(n) { return String(n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function say(m, k) {
    el.status.textContent = m; el.status.className = 'status show' + (k ? ' ' + k : '');
    if (k) setTimeout(function () { el.status.className = 'status'; }, 5200);
  }
  function markDirty(v) { state.dirty = v; el.dirty.hidden = !v; el.save.disabled = !v; }
  function slug(s) {
    return String(s || '').trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 30);
  }

  /* ---------- الإقلاع ---------- */
  function boot() {
    if (MOCK) return startMock();
    var t = localStorage.getItem(TOKEN_KEY);
    if (!t) { el.gate.hidden = false; return; }
    connect(t);
  }
  function startMock() {
    el.mock.hidden = false; el.app.hidden = false;
    el.who.textContent = 'تجربةٌ محلّية — لا يُنشَرُ شيء';
    fetch(DATA_PATH, { cache: 'no-cache' }).then(function (r) { return r.json(); })
      .then(function (d) { state.brands = d.brands || []; renderRows(); fillLists(); blankForm(); })
      .catch(function () { state.brands = []; renderRows(); blankForm(); });
  }
  function connect(token) {
    gh = new GhApi({ owner: OWNER, repo: REPO, branch: BRANCH, token: token });
    say('جارٍ التحقّقُ من الرمز…');
    gh.check().then(function (info) {
      if (!info.canPush) throw new Error('الرمزُ لا يملكُ صلاحيةَ الكتابة');
      localStorage.setItem(TOKEN_KEY, token);
      el.gate.hidden = true; el.app.hidden = false;
      el.who.textContent = (info.user ? info.user + ' · ' : '') + info.repo;
      say('متّصل ✓', 'ok');
      return load();
    }).catch(function (e) {
      el.gate.hidden = false; el.app.hidden = true;
      say('تعذّرَ الاتصال: ' + e.message, 'bad');
    });
  }
  function load() {
    return Promise.all([gh.readText(DATA_PATH), gh.tree().catch(function () { return new Map(); })])
      .then(function (r) {
        state.brands = r[0] ? (JSON.parse(r[0].text).brands || []) : [];
        state.pages = Array.from(r[1].keys()).filter(function (p) {
          return /\.html?$/i.test(p) && p !== 'index.html' && p !== 'admin.html';
        });
        renderRows(); fillLists(); blankForm();
      });
  }

  function fillLists() {
    var secs = {}; state.brands.forEach(function (b) { if (b.sector) secs[b.sector] = 1; });
    el.sectors.innerHTML = Object.keys(secs).map(function (s) { return '<option value="' + esc(s) + '">'; }).join('');
    el.pages.innerHTML = state.pages.map(function (p) { return '<option value="' + esc(p) + '">'; }).join('');
  }

  /* ---------- القائمة ---------- */
  function renderRows() {
    if (!state.brands.length) { el.rows.innerHTML = '<p class="hint">لا هويةَ بعد — ابدأْ بـ«هويةٌ جديدة».</p>'; return; }
    el.rows.innerHTML = state.brands.map(function (b, i) {
      var sw = (b.colors || []).slice(0, 5).map(function (c) {
        return '<i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + esc(c) + ';margin-inline-start:3px"></i>';
      }).join('');
      return '<div class="row' + (state.editing === i ? ' sel' : '') + (b.hidden ? ' hid' : '') + '" draggable="true" data-i="' + i + '">'
        + '<span class="grip" title="اسحبْ للترتيب">⠿</span>'
        + '<span class="tx"><b>' + esc(b.name || '(بلا اسم)') + '</b>'
        + '<i>' + esc(b.sector || '—') + (b.year ? ' · ' + arNum(b.year) : '') + ' ' + sw + '</i></span>'
        + '<span class="acts">'
        + '<button class="icobtn star' + (b.featured ? ' star-on' : '') + '" data-act="feat" title="بطاقةٌ عريضة">'
        + '<svg viewBox="0 0 24 24" ' + (b.featured ? 'fill="currentColor" stroke="none"' : '') + '><path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"/></svg></button>'
        + '<button class="icobtn" data-act="hide" title="' + (b.hidden ? 'أظهرْ' : 'أخفِ') + '">'
        + (b.hidden
          ? '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.3A8 8 0 0 1 21 12a17 17 0 0 1-2.2 2.8M6.2 6.6A16 16 0 0 0 3 12a8 8 0 0 0 11 6.6"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/></svg>')
        + '</button>'
        + '<button class="icobtn" data-act="edit" title="عدّلْ"><svg viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>'
        + '<button class="icobtn del" data-act="del" title="احذفْ"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></button>'
        + '</span></div>';
    }).join('');
  }

  el.rows.addEventListener('click', function (e) {
    var row = e.target.closest('.row'); if (!row) return;
    var i = +row.dataset.i, btn = e.target.closest('[data-act]'), act = btn && btn.dataset.act;
    if (act === 'feat') { state.brands.forEach(function (b, k) { b.featured = (k === i) ? !b.featured : false; }); markDirty(true); renderRows(); return; }
    if (act === 'hide') { state.brands[i].hidden = !state.brands[i].hidden; markDirty(true); renderRows(); return; }
    if (act === 'del') {
      var b = state.brands[i];
      if (!confirm('حذفُ «' + (b.name || '') + '» من المعرض؟')) return;
      if (b.logo && !/^https?:/.test(b.logo)) state.deletes.push(b.logo);
      state.brands.splice(i, 1); order(); state.editing = null; markDirty(true); renderRows(); blankForm(); return;
    }
    edit(i);
  });

  var dragI = null;
  el.rows.addEventListener('dragstart', function (e) { var r = e.target.closest('.row'); if (!r) return; dragI = +r.dataset.i; r.classList.add('drag'); });
  el.rows.addEventListener('dragover', function (e) {
    e.preventDefault(); var r = e.target.closest('.row'); if (!r) return;
    [].forEach.call(el.rows.children, function (c) { c.classList.remove('over'); }); r.classList.add('over');
  });
  el.rows.addEventListener('drop', function (e) {
    e.preventDefault(); var r = e.target.closest('.row'); if (!r || dragI == null) return;
    var m = state.brands.splice(dragI, 1)[0]; state.brands.splice(+r.dataset.i, 0, m);
    order(); dragI = null; markDirty(true); renderRows();
  });
  el.rows.addEventListener('dragend', function () { [].forEach.call(el.rows.children, function (c) { c.classList.remove('drag', 'over'); }); dragI = null; });
  function order() { state.brands.forEach(function (b, i) { b.order = i; }); }

  /* ---------- المحرّر ---------- */
  var draft = null, colors = [];

  function blank() {
    return {
      id: '', name: '', tagline: '', sector: '', year: String(new Date().getFullYear()),
      about: '', logo: '', logoFit: 'contain', bg: '#0F4C3A', colors: [], fonts: [],
      deliverables: [], link: '', featured: false, hidden: false, order: state.brands.length
    };
  }
  function blankForm() { state.editing = null; draft = blank(); fill(); renderRows(); }
  function edit(i) { state.editing = i; draft = JSON.parse(JSON.stringify(state.brands[i])); fill(); renderRows(); }

  function fill() {
    el.edTitle.textContent = state.editing == null ? 'هويةٌ جديدة' : 'تعديلُ هوية';
    el.del.hidden = state.editing == null;
    el.name.value = draft.name || '';
    el.id.value = draft.id || '';
    el.sector.value = draft.sector || '';
    el.year.value = draft.year || '';
    el.tagline.value = draft.tagline || '';
    el.about.value = draft.about || '';
    el.bg.value = /^#[0-9a-f]{6}$/i.test(draft.bg || '') ? draft.bg : '#0F4C3A';
    el.bgHex.value = el.bg.value.toUpperCase();
    el.logoFit.value = draft.logoFit || 'contain';
    el.fonts.value = (draft.fonts || []).join('، ');
    el.dels.value = (draft.deliverables || []).join('، ');
    el.link.value = draft.link || '';
    el.featured.checked = !!draft.featured;
    el.hidden.checked = !!draft.hidden;
    colors = (draft.colors || []).slice();
    renderCols();
    el.fname.hidden = !draft.logo;
    el.fname.textContent = draft.logo ? 'الشعار: ' + draft.logo : '';
    el.drop.classList.toggle('has', !!draft.logo);
    el.fromLogo.hidden = !draft.logo || /\.svg$/i.test(draft.logo);
    preview();
  }

  function renderCols() {
    el.cols.innerHTML = colors.map(function (c, i) {
      return '<span class="colchip"><input type="color" value="' + esc(c) + '" data-i="' + i + '">'
        + '<code>' + esc(c.toUpperCase()) + '</code>'
        + '<button type="button" data-rm="' + i + '" title="أزِلْ">×</button></span>';
    }).join('') || '<span class="sm" style="color:rgba(42,26,15,.45)">لا ألوانَ بعد</span>';
  }
  el.cols.addEventListener('input', function (e) {
    var inp = e.target.closest('input[type=color]'); if (!inp) return;
    colors[+inp.dataset.i] = inp.value.toUpperCase();
    inp.parentNode.querySelector('code').textContent = inp.value.toUpperCase();
    markDirty(true); preview();
  });
  el.cols.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    colors.splice(+b.dataset.rm, 1); renderCols(); markDirty(true); preview();
  });
  el.addCol.addEventListener('click', function () { colors.push('#0F4C3A'); renderCols(); preview(); });

  el.bg.addEventListener('input', function () { el.bgHex.value = el.bg.value.toUpperCase(); preview(); });
  el.bgHex.addEventListener('input', function () {
    var v = el.bgHex.value.trim();
    if (/^#?[0-9a-f]{6}$/i.test(v)) { el.bg.value = (v[0] === '#' ? v : '#' + v); preview(); }
  });

  function read() {
    draft.name = el.name.value.trim();
    draft.id = el.id.value.trim() || slug(draft.name) || ('brand-' + state.brands.length);
    draft.sector = el.sector.value.trim();
    draft.year = String(parseInt(el.year.value, 10) || '');
    draft.tagline = el.tagline.value.trim();
    draft.about = el.about.value.trim();
    draft.bg = el.bg.value.toUpperCase();
    draft.logoFit = el.logoFit.value;
    draft.colors = colors.slice();
    draft.fonts = el.fonts.value.split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean);
    draft.deliverables = el.dels.value.split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean);
    draft.link = el.link.value.trim();
    draft.featured = el.featured.checked;
    draft.hidden = el.hidden.checked;
  }

  function logoSrc() {
    if (!draft.logo) return '';
    var p = state.pending[draft.logo];
    if (!p) return draft.logo;
    if (p.base64) return 'data:image/png;base64,' + p.base64;
    if (p.text) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(p.text);
    return draft.logo;
  }

  function preview() {
    read();
    var src = logoSrc();
    el.tilePrev.style.background = draft.bg;
    el.tilePrev.innerHTML = src
      ? '<img src="' + esc(src) + '"' + (draft.logoFit === 'cover' ? ' class="cover"' : '') + ' alt="">'
      : '<div class="word">' + esc(draft.name || 'اسمُ العلامة') + '</div>';
    var sw = (draft.colors || []).map(function (c) { return '<i style="flex:1;display:block;background:' + esc(c) + '"></i>'; }).join('');
    el.pcard.innerHTML =
      (draft.sector ? '<div class="k">' + esc(draft.sector) + (draft.year ? ' · ' + arNum(draft.year) : '') + '</div>' : '')
      + '<h4>' + esc(draft.name || 'اسمُ العلامة') + '</h4>'
      + (draft.tagline ? '<p class="t">' + esc(draft.tagline) + '</p>' : '')
      + (sw ? '<div style="display:flex;height:12px;border-radius:100px;overflow:hidden;margin-top:6px">' + sw + '</div>' : '');
  }

  ['name', 'id', 'sector', 'year', 'tagline', 'about', 'fonts', 'dels', 'link'].forEach(function (k) {
    el[k].addEventListener('input', preview);
  });
  el.logoFit.addEventListener('change', preview);
  el.featured.addEventListener('change', preview);
  el.hidden.addEventListener('change', preview);

  el.apply.addEventListener('click', function () {
    read();
    if (!draft.name) { el.name.classList.add('err'); el.name.focus(); say('اسمُ العلامةِ مطلوب', 'bad'); return; }
    el.name.classList.remove('err');
    if (draft.featured) state.brands.forEach(function (b) { b.featured = false; });
    if (state.editing == null) { state.brands.push(draft); state.editing = state.brands.length - 1; }
    else state.brands[state.editing] = draft;
    order(); markDirty(true); renderRows(); fillLists();
    draft = JSON.parse(JSON.stringify(state.brands[state.editing]));
    el.edTitle.textContent = 'تعديلُ هوية'; el.del.hidden = false;
    say('أُثبِتَ في القائمة — اضغطْ «حفظٌ ونشر» ليظهرَ في المعرض', 'ok');
  });
  el.cancel.addEventListener('click', blankForm);
  el.newBtn.addEventListener('click', blankForm);
  el.del.addEventListener('click', function () {
    if (state.editing == null) return;
    if (!confirm('حذفُ «' + (state.brands[state.editing].name || '') + '»؟')) return;
    state.brands.splice(state.editing, 1); order(); state.editing = null; markDirty(true); renderRows(); blankForm();
  });

  /* ---------- الشعار ---------- */
  el.drop.addEventListener('click', function () { el.file.click(); });
  el.drop.addEventListener('dragover', function (e) { e.preventDefault(); el.drop.classList.add('on'); });
  el.drop.addEventListener('dragleave', function () { el.drop.classList.remove('on'); });
  el.drop.addEventListener('drop', function (e) {
    e.preventDefault(); el.drop.classList.remove('on');
    var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) takeLogo(f);
  });
  el.file.addEventListener('change', function () { if (el.file.files[0]) takeLogo(el.file.files[0]); });

  function takeLogo(f) {
    read();
    var id = draft.id || slug(draft.name) || ('brand-' + Date.now());
    var isSvg = /\.svg$/i.test(f.name) || f.type === 'image/svg+xml';
    if (isSvg) {
      var fr = new FileReader();
      fr.onload = function () {
        var path = 'logos/' + id + '.svg';
        state.pending[path] = { text: String(fr.result) };
        draft.logo = path; afterLogo(f, path);
      };
      fr.readAsText(f, 'utf-8');
      return;
    }
    var png = /\.png$/i.test(f.name) || f.type === 'image/png';
    ImgTools.compress(f, { maxEdge: 1200, quality: 0.9, type: png ? 'image/png' : 'image/jpeg' })
      .then(function (r) {
        var path = 'logos/' + id + (png ? '.png' : '.jpg');
        state.pending[path] = { base64: r.base64 };
        draft.logo = path;
        /* لونُ اللوحِ يُقترَحُ من الصورةِ إن لم يُغيَّرْ بعد */
        if (el.bg.value.toUpperCase() === '#0F4C3A') {
          ImgTools.dominantColor(f).then(function (c) {
            el.bg.value = c; el.bgHex.value = c.toUpperCase(); preview();
          }).catch(function () { });
        }
        afterLogo(f, path);
      })
      .catch(function () { say('تعذّرَ تجهيزُ الصورة', 'bad'); });
  }
  function afterLogo(f, path) {
    el.fname.hidden = false;
    el.fname.textContent = 'الشعار: ' + path + ' · ' + ImgTools.fmtSize(f.size);
    el.drop.classList.add('has');
    el.fromLogo.hidden = /\.svg$/i.test(path);
    markDirty(true); preview();
    say('جُهِّزَ الشعارُ — يُرفَعُ مع الحفظ', 'ok');
  }

  /* استخراجُ ألوانٍ من الشعارِ النقطي */
  el.fromLogo.addEventListener('click', function () {
    var src = logoSrc(); if (!src) return;
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () {
      ImgTools.dominantColor(im).then(function (c) {
        colors.push(c.toUpperCase()); renderCols(); markDirty(true); preview();
        say('أُضيفَ لونٌ سائدٌ من الشعار', 'ok');
      });
    };
    im.src = src;
  });

  /* ---------- الحفظُ ---------- */
  el.save.addEventListener('click', function () {
    if (MOCK) {
      say('وضعُ التجربة: كان سيُنشَرُ ' + arNum(Object.keys(state.pending).length + 1) + ' ملفاً و'
        + arNum(state.brands.length) + ' هويةً', 'ok');
      markDirty(false); return;
    }
    if (!gh) return;
    el.save.disabled = true; order();
    var files = [{ path: DATA_PATH, text: JSON.stringify({ updated: new Date().toISOString().slice(0, 10), brands: state.brands }, null, 2) + '\n' }];
    Object.keys(state.pending).forEach(function (p) {
      var v = state.pending[p];
      files.push(v.base64 != null ? { path: p, base64: v.base64 } : { path: p, text: v.text });
    });
    gh.commit({
      message: 'معرضُ الهويات: تحديثُ البيانات' + (files.length > 1 ? ' ورفعُ ' + (files.length - 1) + ' ملفاً' : ''),
      files: files, deletes: state.deletes.slice(),
      onProgress: function (p) {
        if (p.stage === 'upload') say('رفعُ الملفات… ' + arNum(p.done) + '/' + arNum(p.total));
        else if (p.stage === 'tree') say('بناءُ الشجرة…');
        else if (p.stage === 'commit') say('تسجيلُ الالتزام…');
      }
    }).then(function () {
      state.pending = {}; state.deletes = []; markDirty(false);
      say('نُشِرَ ✓ يظهرُ المعرضُ المحدَّثُ بعد نحوِ دقيقة', 'ok');
    }).catch(function (e) {
      el.save.disabled = false; say('فشلَ النشر: ' + e.message, 'bad');
    });
  });

  addEventListener('beforeunload', function (e) { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  el.tokenSave.addEventListener('click', function () {
    var t = el.token.value.trim(); if (!t) { el.token.classList.add('err'); return; }
    el.token.classList.remove('err'); connect(t);
  });
  el.token.addEventListener('keydown', function (e) { if (e.key === 'Enter') el.tokenSave.click(); });
  el.tryMock.addEventListener('click', function () { location.search = '?mock=1'; });

  boot();
})();
