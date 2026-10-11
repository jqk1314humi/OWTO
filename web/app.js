/* ============================================================
   AI 物料作战矩阵 · 渲染与交互
   ============================================================ */
(function () {
  "use strict";
  const DATA = window.SITE_DATA || [];
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 分页路由：<body data-page="板块id"> 时只渲染该板块 ---------------- */
  const PAGE = document.body.dataset.page || "";
  const PAGE_FILES = {
    "主图": "main.html",
    "详情页": "detail.html",
    "单页": "leaflet.html",
    "短视频": "video.html",
    "海报": "poster.html",
    "朋友圈种草贴": "social.html",
  };
  const fileOf = s => PAGE_FILES[s.id] || ("#" + s.id);

  /* ---------------- 导航 ---------------- */
  const nav = $("#mainnav");
  nav.innerHTML = DATA.map((s, i) =>
    `<a href="${fileOf(s)}" data-target="${s.id}"><span class="n">${s.index}</span>${s.label}</a>`
  ).join("");
  if (PAGE) $$("#mainnav a").forEach(a => a.classList.toggle("active", a.dataset.target === PAGE));

  /* ---------------- HERO 概览卡（仅首页渲染） ---------------- */
  const heroCardsEl = $("#heroCards");
  if (heroCardsEl) {
    const totalImgs = DATA.reduce((a, s) => a + s.imgCount, 0);
    const totalGroups = DATA.reduce((a, s) => a + s.groups.length, 0);
    heroCardsEl.innerHTML = DATA.map(s => `
      <a class="hcard reveal" href="${fileOf(s)}">
        <span class="hc-idx">${s.index} / ${s.en}</span>
        <span class="hc-name">${s.label}</span>
        <span class="hc-en">${s.groups.length} VERSIONS</span>
        <span class="hc-count">${s.vidCount ? s.vidCount + " VID" : s.imgCount + " IMG"}</span>
      </a>`).join("");

    const stats = [
      { num: DATA.length, suffix: "", label: "大物料类型" },
      { num: totalGroups, suffix: "", label: "个迭代方案版本" },
      { num: totalImgs, suffix: "", label: "张 AI 生成素材" },
      { num: 5, suffix: "", label: "款 AI 工具协同" },
    ];
    $("#heroStats").innerHTML = stats.map((st, i) =>
      `<div class="hstat"><b data-count="${st.num}">0</b><span>${String(i + 1).padStart(2, "0")} · ${st.label}</span></div>`
    ).join("");
  }

  /* ---------------- 文本块工具 ---------------- */
  function esc(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  const PROMPT_RE = /你是一[名个]|请生成|请基于|请你帮|口令|负面提示词|【角色设定】|【生成内容】|局部重绘|生成一[张个]/;

  function textBlock(b) {
    if (b.r === "h") return `<div class="block block-h">${esc(b.v)}</div>`;
    if (b.v.length > 150) {
      const isPrompt = PROMPT_RE.test(b.v);
      const tag = isPrompt ? "PROMPT 指令" : "文案内容";
      return `<details class="prompt">
        <summary>
          <span class="prompt-tag ${isPrompt ? "" : "is-copy"}">${tag}</span>
          <span class="prompt-preview">${esc(b.v.slice(0, 110))}…</span>
          <span class="prompt-toggle"><span class="open-label">展开</span><span class="close-label">收起</span></span>
        </summary>
        <div class="prompt-full">${esc(b.v)}</div>
      </details>`;
    }
    return `<div class="block block-p">${esc(b.v)}</div>`;
  }

  function imgHTML(src, w, h, idxInGroup, ribbon, extraCls) {
    return `<div class="g-item ${extraCls || ""}" data-gidx="${idxInGroup}">
      ${ribbon ? `<span class="g-ribbon">${ribbon}</span>` : ""}
      <img src="${encodeURI(src)}" alt="" loading="lazy" decoding="async"
           style="aspect-ratio:${w}/${h}" width="${w}" height="${h}">
      <div class="g-cap"><span>点击查看大图</span><span class="g-zoom">ZOOM ⤢</span></div>
    </div>`;
  }

  function videoHTML(src) {
    return `<figure class="g-video">
      <video controls preload="metadata" playsinline src="${encodeURI(src)}"></video>
      <figcaption><span>AI 生成成片 · 可直接播放</span><span class="g-zoom">▶ PLAY</span></figcaption>
    </figure>`;
  }

  /* ---------------- 区块渲染 ---------------- */
  const sectionsEl = $("#sections");

  DATA.forEach((s, si) => {
    if (!PAGE || s.id !== PAGE) return; // 仅分页渲染对应板块；首页只保留 hero 门户
    const sec = document.createElement("section");
    sec.className = "section";
    sec.id = s.id;

    let timeline = "";
    s.groups.forEach((g, gi) => {
      const verLabel = g.final ? "最终版" : (gi === 0 ? "初版" : "V" + gi);
      const isCopyDoc = s.id === "详情页" && g.title.includes("文案");
      const isFinalPage = s.id === "详情页" && g.final;

      // 收集组内全部图片（供灯箱按组浏览）
      const groupImgs = g.blocks.filter(b => b.t === "img");
      let gImgCursor = 0;

      let body = "";
      if (isCopyDoc) {
        let inner = "";
        for (let i = 0; i < g.blocks.length; i++) {
          const b = g.blocks[i];
          if (b.t === "text") inner += textBlock(b);
          else inner += imagePool(s, g, [b], gImgCursor++) ;
        }
        body = `<details class="doc-panel" ${gi === 0 ? "open" : ""}>
          <summary>
            <span class="dp-ico">DOC</span>
            <span class="dp-title"><b>${esc(g.title)}</b><span>${esc(g.note)}</span></span>
            <span class="dp-open"></span>
          </summary>
          <div class="dp-body">${inner}</div>
        </details>`;
      } else if (isFinalPage) {
        // 最终成品：独立大图陈列
        const cells = groupImgs.map((im, k) =>
          `<div class="final-cell" data-gidx="${k}">
             <span class="fc-tag">SCREEN ${String(k + 1).padStart(2, "0")}</span>
             <img src="${encodeURI(im.src)}" alt="详情页第${k + 1}屏成品" loading="lazy" decoding="async"
                  style="aspect-ratio:${im.w}/${im.h}" width="${im.w}" height="${im.h}">
           </div>`).join("");
        body = `<p class="block block-p" style="margin-bottom:14px">${esc(g.note)}</p>
               <div class="final-showcase" id="detail-final"><div class="final-grid">${cells}</div></div>`;
      } else {
        // 常规：文本流 + 连续图片池
        let pool = [];
        let poolStart = 0;
        const flush = () => {
          if (!pool.length) return;
          body += galleryHTML(s, g, pool, poolStart);
          pool = [];
        };
        for (let i = 0; i < g.blocks.length; i++) {
          const b = g.blocks[i];
          if (b.t === "text") { flush(); body += textBlock(b); }
          else if (b.t === "video") { flush(); body += videoHTML(b.src); }
          else {
            if (!pool.length) poolStart = gImgCursor;
            pool.push(b);
            gImgCursor++;
          }
        }
        flush();
      }

      timeline += `
        <div class="iter ${g.final ? "final" : ""} reveal" ${isFinalPage ? 'id="anchor-final"' : ""}>
          <span class="iter-node"></span>
          <div class="iter-card">
            <div class="iter-head">
              <span class="iter-ver">${verLabel}</span>
              <span class="iter-title">${esc(g.title)}</span>
              <span class="iter-note">${esc(g.note)}</span>
            </div>
            <div class="iter-body" data-si="${si}" data-gi="${gi}">${body}</div>
          </div>
        </div>`;
    });

    sec.innerHTML = `
      <div class="sec-head reveal">
        <div class="sec-kicker">${s.index} — ${s.en}</div>
        <h2 class="sec-title"><span class="sec-no">${s.index}</span>${s.label}</h2>
        <p class="sec-desc">${esc(s.desc)}</p>
        <div class="sec-badges">
          <span class="sec-badge">${s.groups.length} 轮方案</span>
          <span class="sec-badge">${s.imgCount} 张素材</span>
        </div>
      </div>
      <div class="timeline">${timeline}</div>`;
    sectionsEl.appendChild(sec);
  });

  // 图片池画廊（胶片型 / 砖型）
  function galleryHTML(s, g, pool, startIdx) {
    if (s.gallery === "film") {
      const cards = pool.map((im, k) => {
        const gi = startIdx + k;
        return `<div class="film-card">
          <div class="film-strip">${"<i></i>".repeat(5)}</div>
          <div class="film-frame" data-gidx="${gi}">
            <img src="${encodeURI(im.src)}" alt="${esc(g.title)}视频画面" loading="lazy" decoding="async"
                 style="aspect-ratio:${im.w}/${im.h}" width="${im.w}" height="${im.h}">
          </div>
          <div class="film-meta"><span>${s.en}</span><span>CLIP ${String(gi + 1).padStart(2, "0")}</span></div>
        </div>`;
      }).join("");
      return `<div class="gallery"><div class="g-type-film">${cards}</div></div>`;
    }
    const cls = "g-type-" + s.gallery;
    const items = pool.map((im, k) =>
      imgHTML(im.src, im.w, im.h, startIdx + k, g.final ? "最终产出" : "")
    ).join("");
    return `<div class="gallery"><div class="g-cols ${cls}">${items}</div></div>`;
  }
  // 文案文档内单图（详情页对话截图等）
  function imagePool(s, g, pool, startIdx) {
    return galleryHTML(s, g, pool, startIdx);
  }

  /* ---------------- Lightbox ---------------- */
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap"), lbCounter = $("#lbCounter");
  let lbList = [], lbIdx = 0;

  function openLB(list, idx) {
    lbList = list;
    lbIdx = idx;
    renderLB();
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function renderLB() {
    const im = lbList[lbIdx];
    lbImg.src = encodeURI(im.src);
    lbImg.alt = im.cap || "";
    lbCap.textContent = im.cap || "";
    lbCounter.textContent = String(lbIdx + 1).padStart(2, "0") + " / " + String(lbList.length).padStart(2, "0");
  }
  function closeLB() { lb.hidden = true; document.body.style.overflow = ""; }
  function moveLB(d) { lbIdx = (lbIdx + d + lbList.length) % lbList.length; renderLB(); }

  $("#lbClose").addEventListener("click", closeLB);
  $("#lbPrev").addEventListener("click", () => moveLB(-1));
  $("#lbNext").addEventListener("click", () => moveLB(1));
  lb.addEventListener("click", e => { if (e.target === lb) closeLB(); });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowLeft") moveLB(-1);
    if (e.key === "ArrowRight") moveLB(1);
  });

  // 事件委托：所有可放大元素
  document.addEventListener("click", e => {
    const cell = e.target.closest("[data-gidx]");
    if (!cell) return;
    const body = cell.closest(".iter-body");
    if (!body) return;
    const si = +body.dataset.si, gi = +body.dataset.gi;
    const group = DATA[si].groups[gi];
    const list = group.blocks.filter(b => b.t === "img").map((b, i) => ({
      src: b.src,
      cap: DATA[si].label + " · " + group.title + " · 图 " + (i + 1),
    }));
    openLB(list, +cell.dataset.gidx);
  });

  /* ---------------- 滚动 / 导航状态 ---------------- */
  const progress = $("#scrollProgress");
  const topbar = $("#topbar");
  const backTop = $("#backTop");
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    progress.style.width = (max ? h.scrollTop / max * 100 : 0) + "%";
    topbar.classList.toggle("shrink", h.scrollTop > 40);
    backTop.classList.toggle("show", h.scrollTop > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const navLinks = $$("#mainnav a");
  if ($$(".section").length > 1) {
    const secObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle("active", a.dataset.target === en.target.id));
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$(".section").forEach(secEl => secObserver.observe(secEl));
  }

  /* ---------------- 入场动画 / 数字滚动 ---------------- */
  function revealAll() { $$(".reveal").forEach(el => el.classList.add("in")); }
  function setStatsFinal() {
    $$("#heroStats b").forEach(el => {
      if (!el.dataset.done) { el.dataset.done = "1"; el.textContent = el.dataset.count; }
    });
  }
  // 兜底：后台标签页 / 不支持 IO / 减少动态偏好时，直接展示全部内容，避免内容永久不可见
  const SHOT_MODE = new URLSearchParams(location.search).get("shot");
  if (reduceMotion || !("IntersectionObserver" in window) || document.hidden || SHOT_MODE) {
    document.documentElement.classList.add("no-anim");
    revealAll();
    setStatsFinal();
    $$("img[loading='lazy']").forEach(im => { im.loading = "eager"; });
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("in"); revealObserver.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    function observeReveals(root) {
      $$(".reveal", root || document).forEach(el => revealObserver.observe(el));
    }
    observeReveals();
    setTimeout(() => observeReveals(), 60);
    // 兜底：任何原因（headless 虚拟时间、IO 异常）导致 2.5s 后仍未入场的元素强制显示
    setTimeout(() => { $$(".reveal").forEach(el => el.classList.add("in")); }, 2500);

    function animateCount(el) {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      const target = +el.dataset.count;
      if (reduceMotion) { el.textContent = target; return; }
      const dur = 1200, t0 = performance.now();
      (function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * ease);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }
    const statObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { animateCount(en.target); statObserver.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$("#heroStats b").forEach(b => statObserver.observe(b));

    // 页面被切到后台时立即解除全部隐藏，防止极端情况下内容停留在透明态
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { document.documentElement.classList.add("no-anim"); revealAll(); setStatsFinal(); }
    });
  }

  /* ---------------- 截图/嵌入钩子（?shot=板块id）：仅保留目标板块，不滚动，规避 headless 合成缺陷 ---------------- */
  (function () {
    const target = new URLSearchParams(location.search).get("shot");
    if (!target) return;
    const el = document.getElementById(target);
    if (!el) return;
    const hero = document.getElementById("hero");
    if (hero) hero.style.display = "none";
    const parentSec = el.closest(".section");
    const keepSec = parentSec || (el.classList.contains("section") ? el : null);
    $$(".section").forEach(s => { if (s !== keepSec) s.style.display = "none"; });
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";
    if (keepSec) keepSec.style.paddingTop = "96px";
    if (parentSec && el !== parentSec) {
      parentSec.querySelectorAll(".iter").forEach(it => { if (!it.contains(el)) it.style.display = "none"; });
    }
    window.scrollTo(0, 0);
  })();

  /* ---------------- HERO 粒子 ---------------- */
  (function particles() {
    const canvas = $("#particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, pts = [], dpr = Math.min(2, window.devicePixelRatio || 1);
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(80, Math.floor(W / 18));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.6 + .5,
        red: Math.random() < .18,
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const dxm = p.x - mouse.x, dym = p.y - mouse.y;
        if (dxm * dxm + dym * dym < 14000) { p.x += dxm * .002; p.y += dym * .002; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.red ? "rgba(255,90,90,.75)" : "rgba(110,210,255,.75)";
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130) {
            const op = (1 - Math.sqrt(d2) / 130) * .22;
            ctx.strokeStyle = a.red || b.red ? `rgba(255,90,90,${op})` : `rgba(90,180,255,${op})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    });
    canvas.addEventListener("mouseleave", () => { mouse.x = mouse.y = -9999; });
    if (reduceMotion) {
      draw = function () {};
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.red ? "rgba(255,90,90,.6)" : "rgba(110,210,255,.6)"; ctx.fill();
      });
    } else {
      draw();
    }
  })();
})();
