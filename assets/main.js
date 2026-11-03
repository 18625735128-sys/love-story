
/* ============================================================
   张鹏振 & 王学儿 —— 我们的故事
   内容默认值集中在 DEFAULT_CONTENT；
   运行时内容保存在浏览器 localStorage，不需要Supabase数据库
   点右下角「编辑」可以修改所有文字与照片。
   ============================================================ */
/* ---------- 默认内容 ---------- */
const DEFAULT_CONTENT = {
  couple: {
    a: "王学儿",
    b: "张鹏振",
    startDate: "2025-06-20",
  },
  hero: {
    image: "",
    tagline:
      "把那些没被相机拍到的、也没被谁记住的日子，\n一页一页，收在这里。",
  },
  copy: {
    heroEyebrow: "Our story · since",
    heroScroll: "往下翻，看看我们",
    counterLabel: "我们在一起",
    timelineTitle: "我们的时间线",
    timelineDesc: "有些日子过去了很久，可只要想起来，那天的温度还在。",
    albumTitle: "胶片里的我们",
    albumDesc: "点开任意一张，像从抽屉里抽出一张旧照片。",
    datesTitle: "还有多少天",
    datesDesc: "重要的日子，值得被提前期待。",
    lettersTitle: "写给你的信",
    lettersDesc: "有些话当面说不出口，就写在纸上。点一下信封，它就打开了。",
    footerText: "故事还在继续，未完待续。",
  },
  timeline: [
    {
      date: "2025-06-20",
      title: "我们相遇",
      text: "属于我们的故事，从这一天正式开始。",
      place: "",
      photo: null
    }
  ],
  album: [],
  countdowns: [
    {
      type: "annual",
      month: 6,
      day: 20,
      label: "恋爱周年",
      note: "属于我们的纪念日，岁岁年年。",
    }
  ],
  letters: [
    {
      to: "",
      date: "",
      title: "",
      body: "",
      sign: "",
    }
  ],
};
/* ============================================================
   工具
   ============================================================ */
const DAY_MS = 86400000;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pad = (n) => String(n).padStart(2, "0");
const clone = (v) => JSON.parse(JSON.stringify(v));
const esc = (v) =>
  String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const escAttr = (v) => esc(v).replace(/"/g, "&quot;").replace(/\n/g, "&#10;");
/** 支持 2021-10-16 / 2021.10.16 / 2021/10/16 */
function toDate(str) {
  const m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(String(str || "").trim());
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function diffDays(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}
function fmtDate(d) {
  return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
}
function nextAnnual(month, day, now) {
  const today = startOfDay(now);
  let target = new Date(now.getFullYear(), month - 1, day);
  if (startOfDay(target).getTime() < today.getTime()) {
    target = new Date(now.getFullYear() + 1, month - 1, day);
  }
  return target;
}
function todayInput() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null) cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}
/* ============================================================
   数据源：localStorage，无云同步
   ============================================================ */
const LOCAL_KEY = "couple_site_content_v1";
let CONTENT = null;
let savedSnapshot = "{}";
let daysTogether = 0;
let milestoneDays = 500;
let currentIndex = 0;

function normalizeContent(raw) {
  const base = clone(DEFAULT_CONTENT);
  if (!raw || typeof raw !== "object") return base;
  const c = Object.assign({}, base, raw);
  c.couple = Object.assign({}, base.couple, raw.couple || {});
  c.hero = Object.assign({}, base.hero, raw.hero || {});
  c.copy = Object.assign({}, base.copy, raw.copy || {});
  ["timeline", "album", "countdowns", "letters"].forEach((k) => {
    if (!Array.isArray(c[k])) c[k] = base[k];
  });
  c.timeline = c.timeline.map((it) => {
    const o = Object.assign({ date: "", title: "", text: "", place: "" }, it || {});
    if (o.photo && typeof o.photo === "object") {
      o.photo = { src: String(o.photo.src || ""), caption: String(o.photo.caption || "") };
      if (!o.photo.src) delete o.photo;
    } else {
      delete o.photo;
    }
    return o;
  });
  c.album = c.album.map((it) => ({
    src: String((it && it.src) || ""),
    caption: String((it && it.caption) || ""),
    date: String((it && it.date) || ""),
  }));
  c.countdowns = c.countdowns.map((it) => {
    const o = Object.assign({}, it || {});
    o.type = o.type === "milestone" ? "milestone" : "annual";
    o.month = Number(o.month) || 1;
    o.day = Number(o.day) || 1;
    o.step = Number(o.step) || 500;
    o.label = String(o.label || "");
    o.note = String(o.note || "");
    return o;
  });
  c.letters = c.letters.map((it) => {
    const o = Object.assign({}, it || {});
    o.body = Array.isArray(o.body) ? o.body.join("\n\n") : String(o.body || "");
    o.to = String(o.to || "");
    o.date = String(o.date || "");
    o.title = String(o.title || "");
    o.sign = String(o.sign || "");
    return o;
  });
  return c;
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function writeContent(content) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(content));
  } catch (e) {
    throw new Error("本机存储空间已满");
  }
  return "local";
}

/* ============================================================
   页面渲染
   ============================================================ */
function computeDays() {
  const start = toDate(CONTENT.couple.startDate);
  const now = new Date();
  return { start, days: Math.max(0, diffDays(start, now) + 1) };
}

function renderBasics() {
  const c = CONTENT;
  const { start } = computeDays();
  document.title = c.couple.a + " & " + c.couple.b + " · 我们的故事";
  $("#navBrandName").textContent = c.couple.a + " & " + c.couple.b;
  $("#heroNameA").textContent = c.couple.a;
  $("#heroNameB").textContent = c.couple.b;
  $("#heroEyebrowText").textContent = c.copy.heroEyebrow;
  $("#sinceText").textContent = fmtDate(start);
  $("#counterLabelText").textContent = c.copy.counterLabel;
  $("#heroScrollText").textContent = c.copy.heroScroll;
  $("#heroTagline").innerHTML = String(c.hero.tagline || "")
    .split("\n")
    .map(esc)
    .join("<br>");
  $("#timelineTitle").textContent = c.copy.timelineTitle;
  $("#timelineDesc").textContent = c.copy.timelineDesc;
  $("#albumTitle").textContent = c.copy.albumTitle;
  $("#albumDesc").textContent = c.copy.albumDesc;
  $("#datesTitle").textContent = c.copy.datesTitle;
  $("#datesDesc").textContent = c.copy.datesDesc;
  $("#lettersTitle").textContent = c.copy.lettersTitle;
  $("#lettersDesc").textContent = c.copy.lettersDesc;
  $("#footerText").textContent = c.copy.footerText;
  $("#yearNow").textContent = String(new Date().getFullYear());
  const media = $("#heroMedia");
  media.style.backgroundImage = c.hero.image ? 'url("' + c.hero.image + '")' : "none";
}

function countUpDays() {
  const el = $("#daysTogether");
  const n = daysTogether;
  const reduce = window.matchMedia("(prefers‑reduced‑motion: reduce)").matches;
  if (reduce || n <= 0) {
    el.textContent = n.toLocaleString("zh‑CN");
    return;
  }
  const duration = 1200;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(n * eased).toLocaleString("zh‑CN");
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderTimeline() {
  const list = $("#timelineList");
  $$(".tl__item", list).forEach((n) => n.remove());
  const frag = document.createDocumentFragment();
  CONTENT.timeline.forEach((item, i) => {
    const d = toDate(item.date);
    const side = i % 2 === 0 ? "left" : "right";
    const photo = item.photo && item.photo.src ? item.photo : null;
    const el = document.createElement("article");
    el.className = "tl__item tl__item--" + side;
    el.style.transitionDelay = (i % 3) * 0.06 + "s";
    const photoHtml = photo
      ? '<figure class="tl__photo"><img src="' +
        escAttr(photo.src) +
        '" alt="' +
        escAttr(photo.caption || item.title) +
        '" loading="lazy" /><figcaption>' +
        esc(photo.caption) +
        "</figcaption></figure>"
      : "";
    el.innerHTML =
      '<span class="tl__dot" aria‑hidden="true"></span>' +
      '<div class="tl__card">' +
      '<span class="tl__year">' + d.getFullYear() + "</span>" +
      '<span class="tl__date">' + pad(d.getMonth() + 1) + " / " + pad(d.getDate()) + "</span>" +
      "<h3>" + esc(item.title) + "</h3>" +
      "<p>" + esc(item.text) + "</p>" +
      (item.place ? '<span class="tl__place">' + esc(item.place) + "</span>" : "") +
      photoHtml +
      "</div>";
    frag.appendChild(el);
  });
  list.appendChild(frag);
}

function renderAlbum() {
  const grid = $("#albumGrid");
  grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  CONTENT.album.forEach((item, i) => {
    const fig = document.createElement("figure");
    fig.className = "album__item";
    fig.tabIndex = 0;
    fig.setAttribute("role", "button");
    fig.setAttribute("aria‑label", "查看照片：" + item.caption);
    fig.style.setProperty("--rot", (i % 3 === 0 ? -0.9 : i % 3 === 1 ? 0.7 : -0.4) + "deg");
    fig.innerHTML =
      '<img src="' + escAttr(item.src) + '" alt="' + escAttr(item.caption) +
      '" loading="lazy" />' +
      "<figcaption><span>" + esc(item.caption) + "</span><small>" +
      esc(item.date || "") + "</small></figcaption>";
    const open = () => openLightbox(i);
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    frag.appendChild(fig);
  });
  grid.appendChild(frag);
}

function buildCountdowns() {
  const grid = $("#countdownGrid");
  grid.innerHTML = "";
  const now = new Date();
  const start = computeDays().start;
  milestoneDays = Math.ceil(daysTogether / 500) * 500;
  CONTENT.countdowns.forEach((cfg) => {
    let target;
    let targetLabel;
    let isMilestone = false;
    if (cfg.type === "annual") {
      target = nextAnnual(cfg.month, cfg.day, now);
      targetLabel = fmtDate(target);
    } else {
      const step = cfg.step || 500;
      const nextN = Math.ceil(daysTogether / step) * step;
      const targetDayIndex = nextN - 1;
      target = new Date(start.getFullYear(), start.getMonth(), start.getDate() + targetDayIndex);
      targetLabel = "第 " + nextN.toLocaleString("zh‑CN") + " 天";
      milestoneDays = nextN;
      isMilestone = true;
    }
    const card = document.createElement("div");
    card.className = "countdown__card";
    card.innerHTML =
      '<p class="countdown__label">' + esc(cfg.label) + "</p>" +
      '<p class="countdown__date">' + esc(targetLabel) + "</p>" +
      '<div class="countdown__num"><span class="countdown__days">--</span><span class="countdown__unit">天</span></div>' +
      '<p class="countdown__clock"></p>' +
      '<p class="countdown__note">' + esc(cfg.note) + "</p>";
    card.dataset.target = String(target.getTime());
    card.dataset.label = targetLabel;
    card.dataset.milestone = isMilestone ? "1" : "0";
    grid.appendChild(card);
  });
  tickCountdowns();
}

function tickCountdowns() {
  const now = new Date();
  $$(".countdown__card", $("#countdownGrid")).forEach((card) => {
    const target = Number(card.dataset.target);
    if (!target) return;
    const daysPart = diffDays(now, new Date(target));
    const isToday =
      startOfDay(now).getTime() === startOfDay(new Date(target)).getTime();
    const daysEl = $(".countdown__days", card);
    const clockEl = $(".countdown__clock", card);
    if (isToday) {
      daysEl.textContent = "0";
      clockEl.textContent = "就是今天 · " + card.dataset.label;
      card.classList.add("is‑today");
      return;
    }
    daysEl.textContent = Math.max(0, daysPart).toLocaleString("zh‑CN");
    const rest = target - now;
    const h = Math.floor(rest / 3600000) % 24;
    const m = Math.floor(rest / 60000) % 60;
    const s = Math.floor(rest / 1000) % 60;
    clockEl.textContent = pad(h) + " : " + pad(m) + " : " + pad(s) + " 之后";
    card.classList.remove("is‑today");
  });
}

function renderStats() {
  const box = $("#stats");
  box.innerHTML = "";
  const items = [
    { num: daysTogether.toLocaleString("zh‑CN"), label: "在一起的天数" },
    { num: CONTENT.timeline.length, label: "个故事节点" },
    { num: CONTENT.album.length, label: "张胶片照片" },
    { num: milestoneDays.toLocaleString("zh‑CN"), label: "下一个纪念节点" },
  ];
  items.forEach((it) => {
    const div = document.createElement("div");
    div.className = "stats__item";
    div.innerHTML =
      '<span class="stats__num">' + esc(it.num) +
      '</span><span class="stats__label">' + esc(it.label) + "</span>";
    box.appendChild(div);
  });
}

function renderLetters() {
  const grid = $("#lettersGrid");
  grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  CONTENT.letters.forEach((letter) => {
    const el = document.createElement("details");
    el.className = "letter reveal";
    const paras = String(letter.body || "")
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => "<p>" + esc(p) + "</p>")
      .join("");
    el.innerHTML =
      "<summary>" +
      '<div class="letter__meta"><span class="letter__to">' + esc(letter.to) +
      "</span><span>" + esc(letter.date) + "</span></div>" +
      '<h3 class="letter__title">' + esc(letter.title) + "</h3>" +
      '<span class="letter__hint">展开这封信</span>' +
      "</summary>" +
      '<div class="letter__body">' + paras +
      '<div class="letter__sign">—— ' + esc(letter.sign) + "</div></div>";
    el.addEventListener("toggle", () => {
      const hint = $(".letter__hint", el);
      if (hint) hint.textContent = el.open ? "收起这封信" : "展开这封信";
    });
    frag.appendChild(el);
  });
  grid.appendChild(frag);
}

/* ============================================================
   动效 / 导航
   ============================================================ */
let revealIO = null;
function setupReveal() {
  if (revealIO) {
    revealIO.disconnect();
    revealIO = null;
  }
  const targets = $$(".reveal").concat($$(".tl__item"));
  const reduce = window.matchMedia("(prefers‑reduced‑motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("is‑in"));
    return;
  }
  revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is‑in");
          revealIO.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach((t) => revealIO.observe(t));
}

let navReady = false;
function setupNav() {
  if (navReady) return;
  navReady = true;
  const nav = $("#nav");
  const links = $$("[data‑nav]");
  const sections = links.map((a) => document.getElementById(a.dataset.nav)).filter(Boolean);
  const onScroll = () => {
    nav.classList.toggle("is‑scrolled", window.scrollY > 24);
    updateRail();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (!("IntersectionObserver" in window)) return;
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) =>
          a.classList.toggle("is‑active", a.dataset.nav === entry.target.id)
        );
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  sections.forEach((s) => spy.observe(s));
}

function updateRail() {
  const rail = $("#railProgress");
  const tl = $("#timelineList");
  if (!rail || !tl) return;
  const rect = tl.getBoundingClientRect();
  const total = tl.offsetHeight;
  const passed = window.innerHeight * 0.55 - rect.top;
  rail.style.height = Math.max(0, Math.min(total, passed)) + "px";
}

function renderAll() {
  CONTENT = normalizeContent(CONTENT);
  daysTogether = computeDays().days;
  renderBasics();
  $("#navDays").textContent = daysTogether.toLocaleString("zh‑CN");
  countUpDays();
  renderTimeline();
  renderAlbum();
  buildCountdowns();
  renderStats();
  renderLetters();
  setupReveal();
  updateRail();
}

/* ============================================================
   灯箱
   ============================================================ */
const lb = $("#lightbox");
const lbImg = $("#lbImg");
const lbCaption = $("#lbCaption");
const lbDate = $("#lbDate");
let lastFocus = null;
let currentIndex = 0;

function syncLightbox() {
  const item = CONTENT.album[currentIndex];
  if (!item) return;
  lbImg.src = item.src;
  lbImg.alt = item.caption;
  lbCaption.textContent = item.caption;
  lbDate.textContent = item.date || "";
}

function openLightbox(i) {
  if (!CONTENT.album.length) return;
  currentIndex = i;
  lastFocus = document.activeElement;
  syncLightbox();
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add("is‑open"));
  document.body.style.overflow = "hidden";
  $("#lbClose").focus();
}

function closeLightbox() {
  lb.classList.remove("is‑open");
  document.body.style.overflow = "";
  setTimeout(() => {
    lb.hidden = true;
    lbImg.removeAttribute("src");
  }, 380);
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}

function moveLightbox(step) {
  if (!CONTENT.album.length) return;
  currentIndex = (currentIndex + step + CONTENT.album.length) % CONTENT.album.length;
  const it = CONTENT.album[currentIndex];
  lbImg.src = it.src; lbCaption.textContent=it.caption; lbDate.textContent=it.date;
}

$("#lbClose").addEventListener("click", closeLightbox);
$("#lbPrev").addEventListener("click", () => moveLightbox(-1));
$("#lbNext").addEventListener("click", () => moveLightbox(1));
lb.addEventListener("click", (e) => {
  if (e.target === lb) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (lb.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") moveLightbox(-1);
  if (e.key === "ArrowRight") moveLightbox(1);
});

/* ============================================================
   编辑面板
   ============================================================ */
const ED = {
  open: false,
  tab: "basic",
  dirty: false,
};
const TABS = [
  { id: "basic", label: "基本信息" },
  { id: "story", label: "故事" },
  { id: "album", label: "相册" },
  { id: "dates", label: "纪念日" },
  { id: "letters", label: "情书" },
];

function toast(msg, isError) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle("is‑error", Boolean(isError));
  el.classList.add("is‑show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("is‑show"), 2800);
}

function buildFab() {
  const fab = document.createElement("button");
  fab.type = "button";
  fab.id = "editFab";
  fab.className = "edit‑fab";
  fab.innerHTML = '<span aria‑hidden="true">✎</span> 编辑';
  fab.addEventListener("click", openEditor);
  document.body.appendChild(fab);
}

function buildEditorDom() {
  const wrap = document.createElement("div");
  wrap.className = "editor";
  wrap.id = "editor";
  wrap.hidden = true;
  wrap.innerHTML =
    '<div class="editor__scrim" data‑ed‑close="1"></div>' +
    '<section class="editor__panel" role="dialog" aria‑modal="true" aria‑label="编辑内容">' +
    '<header class="editor__head">' +
    '<div><p class="editor__eyebrow">Edit</p><h2>编辑我们的故事</h2></div>' +
    '<button type="button" class="editor__close" id="edClose" aria‑label="关闭">&#215;</button>' +
    "</header>" +
    '<div class="editor__tabs" id="edTabs">' +
    TABS.map(
      (t) =>
        '<button type="button" data‑tab="' + t.id + '"' +
        (t.id === ED.tab ? ' class="is‑active"' : "") + ">" + t.label + "</button>"
    ).join("") +
    "</div>" +
    '<div class="editor__body" id="edBody"></div>' +
    '<footer class="editor__foot">' +
    '<button type="button" class="ed‑btn ed‑btn‑‑ghost" id="edReset">恢复示例</button>' +
    '<button type="button" class="ed‑btn ed‑btn‑‑primary" id="edSave">保存</button>' +
    "</footer>";
  document.body.appendChild(wrap);
  $("#edClose").addEventListener("click", () => closeEditor(false));
  $(".editor__scrim", wrap).addEventListener("click", () => closeEditor(false));
  $("#edTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data‑tab]");
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });
  $("#edSave").addEventListener("click", () => saveContent(true));
  $("#edReset").addEventListener("click", () => {
    if (!confirm("恢复成最初的示例内容？当前所有修改都会被替换（保存后生效）。")) return;
    CONTENT = clone(DEFAULT_CONTENT);
    ED.dirty = true;
    renderEditorBody();
    toast("已恢复示例内容，点「保存」后生效");
  });
  const body = $("#edBody");
  body.addEventListener("input", (e) => {
    const el = e.target;
    const path = el.dataset.path;
    if (!path) return;
    let value = el.value;
    if (el.dataset.number === "1") {
      value = el.value === "" ? 0 : Number(el.value);
    }
    setPath(CONTENT, path, value);
    ED.dirty = true;
    if (el.dataset.imgfor) updatePreview(el.dataset.imgfor);
    body.classList.add("is‑dirty");
  });
  body.addEventListener("change", (e) => {
    const sel = e.target.closest("select[data‑rerender]");
    if (sel) {
      setPath(CONTENT, sel.dataset.path, sel.value);
      ED.dirty = true;
      renderEditorBody(true);
      return;
    }
    const upload = e.target.closest("[data‑upload]");
    if (upload && upload.files && upload.files[0]) {
      toast("本地版不支持上传图片，请填写图片url");
      return;
    }
  });
  body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data‑act]");
    if (!btn) return;
    handleAction(btn);
  });
  document.addEventListener("keydown", (e) => {
    if (!ED.open) return;
    if (e.key === "Escape") closeEditor(false);
  });
}

function openEditor() {
  if (!ED.open) {
    ED.open = true;
    ED.dirty = false;
    const wrap = $("#editor");
    wrap.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => wrap.classList.add("is‑open"));
    $("#editFab").hidden = true;
    switchTab(ED.tab, true);
  }
}

function closeEditor(force) {
  if (ED.dirty && !force) {
    if (confirm("有还没保存的修改，要保存吗？\n点「取消」会放弃这次修改。")) {
      saveContent(true);
      return;
    }
    CONTENT = normalizeContent(JSON.parse(savedSnapshot));
    ED.dirty = false;
    renderAll();
  }
  const wrap = $("#editor");
  wrap.classList.remove("is‑open");
  wrap.hidden = true;
  ED.open = false;
  ED.dirty = false;
  document.body.style.overflow = "";
  const fab = $("#editFab");
  if (fab) fab.hidden = false;
  $("#edBody").classList.remove("is‑dirty");
}

async function saveContent(andClose) {
  const btn = $("#edSave");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "保存中…";
  }
  try {
    const where = await writeContent(CONTENT);
    savedSnapshot = JSON.stringify(CONTENT);
    ED.dirty = false;
    renderAll();
    toast(where === "cloud" ? "已保存到云端" : "已保存到这台设备");
    if (andClose) closeEditor(true);
  } catch (err) {
    toast(err.message || "保存失败", true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "保存";
    }
  }
}

function group(title, inner, hint) {
  return (
    '<section class="ed‑group">' +
    '<h3 class="ed‑group__title">' + esc(title) +
    (hint ? '<small>' + esc(hint) + "</small>" : "") +
    "</h3>" + inner + "</section>"
  );
}

function field(label, path, value, type) {
  return (
    '<label class="ed‑field"><span>' + esc(label) + "</span>" +
    '<input type="' + (type || "text") + '" data‑path="' + escAttr(path) +
    '" value="' + escAttr(value) + '" />' +
    "</label>"
  );
}

function area(label, path, value, rows) {
  return (
    '<label class="ed‑field"><span>' + esc(label) + "</span>" +
    '<textarea data‑path="' + escAttr(path) + '" rows="' + (rows || 3) + '">' +
    esc(value) +
    "</textarea></label>"
  );
}

function numField(label, path, value) {
  return (
    '<label class="ed‑field ed‑field‑‑num"><span>' + esc(label) + "</span>" +
    '<input type="number" min="1" data‑number="1" data‑path="' + escAttr(path) +
    '" value="' + escAttr(value) + '" />' +
    "</label>"
  );
}

function selectField(label, path, value, options, rerender) {
  return (
    '<label class="ed‑field"><span>' + esc(label) + "</span>" +
    '<select data‑path="' + escAttr(path) + '"' + (rerender ? ' data‑rerender="1"' : "") + ">" +
    options
      .map(
        (o) =>
          '<option value="' + escAttr(o.value) + '"' +
          (o.value === value ? " selected" : "") + ">" + esc(o.label) + "</option>"
      )
      .join("") +
    "</select></label>"
  );
}

function photoField(label, path, value) {
  const v = value || "";
  return (
    '<div class="ed‑photo" data‑photo="' + escAttr(path) + '">' +
    '<span class="ed‑photo__label">' + esc(label) + "</span>" +
    '<div class="ed‑photo__prev">' +
    (v
      ? '<img data‑preview="' + escAttr(path) + '" src="' + escAttr(v) + '" alt="" />'
      : '<span class="ed‑photo__empty">还没有照片</span>') +
    "</div>" +
    '<div class="ed‑photo__row">' +
    '<label class="ed‑btn ed‑btn‑‑sm">填写图片链接<input type="file" accept="image/*" data‑upload="' +
    escAttr(path) + '" hidden /></label>' +
    '<button type="button" class="ed‑btn ed‑btn‑‑sm ed‑btn‑‑danger" data‑act="clear‑photo" data‑path="' +
    escAttr(path) + '">移除</button>' +
    "</div>" +
    '<label class="ed‑field ed‑field‑‑tight"><span>或填图片地址</span>' +
    '<input type="text" data‑path="' + escAttr(path) + '" data‑imgfor="' + escAttr(path) +
    '" value="' + escAttr(v) + '" placeholder="https://…" /></label>' +
    "</div>"
  );
}

function updatePreview(path) {
  const wrap = document.querySelector('[data‑photo="' + path + '"]');
  if (!wrap) return;
  const prev = $(".ed‑photo__prev", wrap);
  if (!prev) return;
  const v = getPath(CONTENT, path);
  prev.innerHTML = v
    ? '<img data‑preview="' + escAttr(path) + '" src="' + escAttr(v) + '" alt="" />'
    : '<span class="ed‑photo__empty">还没有照片</span>';
}

function itemCard(list, index, total, title, inner) {
  return (
    '<div class="ed‑card">' +
    '<div class="ed‑card__head">' +
    '<span class="ed‑card__no">' + (index + 1) + "</span>" +
    '<strong class="ed‑card__title">' + esc(title) + "</strong>" +
    '<div class="ed‑card__acts">' +
    '<button type="button" data‑act="move" data‑list="' + list + '" data‑index="' + index +
    '" data‑dir="-1"' + (index === 0 ? " disabled" : "") + ' aria‑label="上移">↑</button>' +
    '<button type="button" data‑act="move" data‑list="' + list + '" data‑index="' + index +
    '" data‑dir="1"' + (index === total - 1 ? " disabled" : "") + ' aria‑label="下移">↓</button>' +
    '<button type="button" class="ed‑card__del" data‑act="del" data‑list="' + list +
    '" data‑index="' + index + '">删除</button>' +
    "</div></div>" +
    '<div class="ed‑card__body">' + inner + "</div></div>"
  );
}

function basicTab() {
  const c = CONTENT;
  return (
    group(
      "关于我们",
      field("名字 A", "couple.a", c.couple.a) +
        field("名字 B", "couple.b", c.couple.b) +
        field("在一起的日期", "couple.startDate", c.couple.startDate, "date")
    ) +
    group(
      "首屏",
      photoField("首屏大图", "hero.image", c.hero.image) +
        area("首屏文案（换行会保留）", "hero.tagline", c.hero.tagline, 3) +
        field("英文小字", "copy.heroEyebrow", c.copy.heroEyebrow) +
        field("滚动提示", "copy.heroScroll", c.copy.heroScroll) +
        field("天数的说明文字", "copy.counterLabel", c.copy.counterLabel)
    ) +
    group(
      "板块标题",
      field("故事 · 标题", "copy.timelineTitle", c.copy.timelineTitle) +
        area("故事 · 说明", "copy.timelineDesc", c.copy.timelineDesc, 2) +
        field("相册 · 标题", "copy.albumTitle", c.copy.albumTitle) +
        area("相册 · 说明", "copy.albumDesc", c.copy.albumDesc, 2) +
        field("纪念日 · 标题", "copy.datesTitle", c.copy.datesTitle) +
        area("纪念日 · 说明", "copy.datesDesc", c.copy.datesDesc, 2) +
        field("情书 · 标题", "copy.lettersTitle", c.copy.lettersTitle) +
        area("情书 · 说明", "copy.lettersDesc", c.copy.lettersDesc, 2)
    ) +
    group("页脚", area("页脚那句话", "copy.footerText", c.copy.footerText, 2))
  );
}

function storyTab() {
  const list = CONTENT.timeline;
  let html = list
    .map((it, i) =>
      itemCard(
        "timeline",
        i,
        list.length,
        it.title || "未命名",
        field("日期", "timeline." + i + ".date", it.date, "date") +
          field("标题", "timeline." + i + ".title", it.title) +
          field("地点", "timeline." + i + ".place", it.place) +
          area("正文", "timeline." + i + ".text", it.text, 4) +
          photoField(
            "这一段的照片（可不填）",
            "timeline." + i + ".photo.src",
            it.photo ? it.photo.src : ""
          ) +
          field(
            "照片说明",
            "timeline." + i + ".photo.caption",
            it.photo ? it.photo.caption : ""
          )
      )
    )
    .join("");
  html += '<button type="button" class="ed‑add" data‑act="add" data‑list="timeline">＋ 添加一个故事</button>';
  return group("故事节点", html + '<p class="ed‑help">上下箭头可以调整顺序。</p>');
}

function albumTab() {
  const list = CONTENT.album;
  let html = list
    .map((it, i) =>
      itemCard(
        "album",
        i,
        list.length,
        it.caption || "未命名",
        photoField("照片", "album." + i + ".src", it.src) +
          field("说明", "album." + i + ".caption", it.caption) +
          field("日期（文字，如 2023.02.14）", "album." + i + ".date", it.date)
      )
    )
    .join("");
  html += '<button type="button" class="ed‑add" data‑act="add" data‑list="album">＋ 添加一张照片</button>';
  return group("相册照片", html);
}

function datesTab() {
  const list = CONTENT.countdowns;
  let html = list
    .map((it, i) => {
      const typeFields =
        it.type === "annual"
          ? '<div class="ed‑row">' +
            numField("月份", "countdowns." + i + ".month", it.month) +
            numField("日", "countdowns." + i + ".day", it.day) +
            "</div>"
          : numField("每多少天一个节点", "countdowns." + i + ".step", it.step);
      return itemCard(
        "countdowns",
        i,
        list.length,
        it.label || "未命名",
        selectField("类型", "countdowns." + i + ".type", it.type, [
          { value: "annual", label: "每年一次" },
          { value: "milestone", label: "每 N 天一次" },
        ], true) +
          typeFields +
          field("名称", "countdowns." + i + ".label", it.label) +
          area("一句话说明", "countdowns." + i + ".note", it.note, 2)
      );
    })
    .join("");
  html += '<button type="button" class="ed‑add" data‑act="add" data‑list="countdowns">＋ 添加一个纪念日</button>';
  return group("纪念日", html);
}

function lettersTab() {
  const list = CONTENT.letters;
  let html = list
    .map((it, i) =>
      itemCard(
        "letters",
        i,
        list.length,
        it.title || "未命名",
        field("写给谁", "letters." + i + ".to", it.to) +
          field("日期（文字，如 2021.10.16）", "letters." + i + ".date", it.date) +
          field("标题", "letters." + i + ".title", it.title) +
          area("正文（空一行就是新的一段）", "letters." + i + ".body", it.body, 7) +
          field("署名", "letters." + i + ".sign", it.sign)
      )
    )
    .join("");
  html += '<button type="button" class="ed‑add" data‑act="add" data‑list="letters">＋ 添加一封信</button>';
  return group("情书", html);
}

function renderEditorBody(keepScroll) {
  const body = $("#edBody");
  if (!body) return;
  let html = "";
  if (ED.tab === "basic") html = basicTab();
  else if (ED.tab === "story") html = storyTab();
  else if (ED.tab === "album") html = albumTab();
  else if (ED.tab === "dates") html = datesTab();
  else if (ED.tab === "letters") html = lettersTab();
  const scrollTop = keepScroll ? body.scrollTop : 0;
  body.innerHTML = html;
  body.scrollTop = scrollTop;
}

function switchTab(id, force) {
  if (!force && ED.tab === id) return;
  ED.tab = id;
  $$("[data‑tab]").forEach((b) => b.classList.toggle("is‑active", b.dataset.tab === id));
  renderEditorBody(false);
  $("#edBody").classList.toggle("is‑dirty", ED.dirty);
}

const NEW_ITEM = {
  timeline: () => ({ date: todayInput(), title: "新的一段", place: "", text: "" }),
  album: () => ({ src: "", caption: "新的照片", date: "" }),
  countdowns: () => ({
    type: "annual",
    month: 1,
    day: 1,
    step: 500,
    label: "新的纪念日",
    note: "",
  }),
  letters: () => ({ to: "", date: "", title: "新的信", body: "", sign: "" }),
};

function handleAction(btn) {
  const act = btn.dataset.act;
  if (act === "add") {
    const list = btn.dataset.list;
    if (!NEW_ITEM[list]) return;
    CONTENT[list].push(NEW_ITEM[list]());
    ED.dirty = true;
    renderEditorBody();
    const body = $("#edBody");
    body.scrollTop = body.scrollHeight;
    $("#edBody").classList.add("is‑dirty");
    return;
  }
  if (act === "move" || act === "del") {
    const list = btn.dataset.list;
    const index = Number(btn.dataset.index);
    const arr = CONTENT[list];
    if (!Array.isArray(arr) || !arr[index]) return;
    if (act === "del") {
      if (!confirm("确定删除这一条吗？")) return;
      arr.splice(index, 1);
    } else {
      const dir = Number(btn.dataset.dir);
      const to = index + dir;
      if (to < 0 || to >= arr.length) return;
      const tmp = arr[index];
      arr[index] = arr[to];
      arr[to] = tmp;
    }
    ED.dirty = true;
    renderEditorBody(true);
    $("#edBody").classList.add("is‑dirty");
    return;
  }
  if (act === "clear‑photo") {
    const path = btn.dataset.path;
    setPath(CONTENT, path, "");
    ED.dirty = true;
    updatePreview(path);
    const input = document.querySelector('input[data‑imgfor="' + path + '"]');
    if (input) input.value = "";
    return;
  }
}

/* ============================================================
   小彩蛋：回到顶部 / 点星星飘心
   ============================================================ */
const PLACEHOLDER_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#e3d5c2" /><text x="50%" y="50%" font‑family="serif" font‑size="28" fill="#9b8874" text‑anchor="middle" dominant‑baseline="middle">照片走丢啦</text></svg>'
  );

function setupImageFallback() {
  window.addEventListener(
    "error",
    (e) => {
      const t = e.target;
      if (t && t.tagName === "IMG" && !t.dataset.fallback) {
        t.dataset.fallback = "1";
        t.src = PLACEHOLDER_IMG;
      }
    },
    true
  );
}

function buildBacktop() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "backtop";
  btn.setAttribute("aria‑label", "回到顶部");
  btn.innerHTML = "↑";
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.body.appendChild(btn);
  const onScroll = () => btn.classList.toggle("is‑show", window.scrollY > window.innerHeight * 0.8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function buildHintBubble() {
  let shown = false;
  try { shown = localStorage.getItem("couple_hint_shown_v1") === "1"; } catch (e) {}
  if (shown) return;
  const bubble = document.createElement("div");
  bubble.className = "hint‑bubble";
  bubble.innerHTML =
    "第一次来？点右下角「编辑」，<br />把这里的故事改成你们的。" +
    '<button type="button" class="hint‑bubble__close" aria‑label="知道了">×</button>';
  document.body.appendChild(bubble);
  const dismiss = () => {
    bubble.classList.remove("is‑show");
    try { localStorage.setItem("couple_hint_shown_v1", "1"); } catch (e) {}
    setTimeout(() => bubble.remove(), 400);
  };
  $(".hint‑bubble__close", bubble).addEventListener("click", dismiss);
  $("#editFab").addEventListener("click", dismiss, { once: true });
  setTimeout(() => bubble.classList.add("is‑show"), 900);
  setTimeout(dismiss, 12000);
}

function spawnHearts(x, y) {
  const glyphs = ["♥", "✦", "♡"];
  const colors = ["#b0554c", "#bd7a41", "#c98a5e"];
  for (let i = 0; i < 8; i++) {
    const p = document.createElement("span");
    p.className = "heart‑particle";
    p.textContent = glyphs[i % glyphs.length];
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.color = colors[i % colors.length];
    const angle = (Math.PI * (0.15 + Math.random() * 0.7));
    const dist = 50 + Math.random() * 70;
    p.style.setProperty("--dx", Math.cos(angle) * dist * (Math.random() > 0.5 ? 1 : -1) + "px");
    p.style.setProperty("--dy", -dist + "px");
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }
}

function setupStarEasterEgg() {
  const mark = $(".nav__mark");
  if (!mark) return;
  mark.style.cursor = "pointer";
  mark.addEventListener("click", (e) => {
    const r = mark.getBoundingClientRect();
    spawnHearts(r.left + r.width / 2, r.top + r.height / 2);
  });
}

/* ============================================================
   页面启动
   ============================================================ */
(function boot() {
  buildEditorDom();
  buildFab();
  buildBacktop();
  setupStarEasterEgg();
  setupImageFallback();
  const local = readLocal();
  CONTENT = normalizeContent(local || DEFAULT_CONTENT);
  savedSnapshot = JSON.stringify(CONTENT);
  renderAll();
  setupNav();
  setInterval(tickCountdowns, 1000);
  window.addEventListener("resize", updateRail, { passive: true });
  buildHintBubble();
})();
