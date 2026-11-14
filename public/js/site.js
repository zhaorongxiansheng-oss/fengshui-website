"use strict";

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyLogo(url) {
  const seal = document.getElementById("brandSeal");
  const wrap = document.getElementById("brandLogoWrap");
  const img = document.getElementById("brandLogo");
  if (!seal || !wrap || !img) return;
  if (url) {
    img.src = url;
    wrap.classList.remove("hidden");
    seal.classList.add("hidden");
  } else {
    img.src = "";
    wrap.classList.add("hidden");
    seal.classList.remove("hidden");
  }
}

function applyHeroImage(url) {
  const img = document.getElementById("heroImage");
  const bagua = document.getElementById("baguaDeco");
  if (!img) return;
  if (url) {
    img.src = url;
    img.classList.remove("hidden");
    if (bagua) bagua.classList.add("hidden");
  } else {
    img.removeAttribute("src");
    img.classList.add("hidden");
    if (bagua) bagua.classList.remove("hidden");
  }
}

function renderServiceItems(items) {
  const container = document.getElementById("servicesCards");
  if (!container) return;
  container.innerHTML = items
    .map((item) => {
      const iconHtml = item.image
        ? `<div class="glyph"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}"></div>`
        : item.icon
          ? `<div class="glyph">${escapeHtml(item.icon)}</div>`
          : `<div class="glyph">✦</div>`;
      return `
        <div class="card">
          ${iconHtml}
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description || "")}</p>
        </div>`;
    })
    .join("");
}

async function loadServiceItems() {
  try {
    const res = await fetch("/api/items");
    const data = await res.json();
    if (data.ok && Array.isArray(data.rows)) renderServiceItems(data.rows);
  } catch (err) {
    // 加载失败时保持页面默认内容
  }
}

async function applySiteSettings() {
  try {
    const res = await fetch("/api/settings/public");
    const data = await res.json();
    const s = data.settings || {};

    if (s.site_title) document.title = s.site_title;

    applyLogo(s.logo_url);
    applyHeroImage(s.hero_image);

    setText("brandSeal", s.brand_seal);
    setText("brandTagline", s.brand_tagline);
    setText("siteBrandName", s.site_name);
    setText("footerBrandName", s.site_name);
    setText("heroLine1", s.hero_line1);
    setText("heroLine2", s.hero_line2);
    setText("heroSub", s.hero_sub);

    setText("navHome", s.nav_home);
    setText("navIntro", s.nav_intro);
    setText("navServices", s.nav_services);
    setText("navFlow", s.nav_flow);
    setText("navContact", s.nav_contact);
    setText("navRegister", s.nav_register);

    setText("introKicker", s.intro_kicker);
    setText("introTitle", s.intro_title);
    setText("introSub", s.intro_sub);
    setText("aboutTitle", s.about_title);
    setText("aboutP1", s.about_1);
    setText("aboutP2", s.about_2);
    setText("servicesIntroTitle", s.services_intro_title);

    setText("servicesKicker", s.services_kicker);
    setText("servicesTitle", s.services_title);
    setText("servicesSub", s.services_sub);
    setText("flowKicker", s.flow_kicker);
    setText("flowTitle", s.flow_title);
    setText("flowSub", s.flow_sub);

    setText("ctaTitle", s.cta_title);
    setText("ctaSub", s.cta_sub);
    setText("ctaButton", s.cta_button);

    setText("footerAbout", s.footer_about);
    setText("footerServicesTitle", s.footer_services_title);
    setText("footerContactTitle", s.footer_contact_title);
    setText("copyrightText", s.copyright_text);

    const lines = (s.services || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const intro = document.getElementById("servicesIntro");
    if (intro && lines.length) {
      intro.innerHTML = lines.map((line) => "<p>" + escapeHtml(line) + "</p>").join("");
    }

    setText("contactPhone", s.contact_phone ? "电话：" + s.contact_phone : "电话：暂未提供");
    setText("contactWechat", s.contact_wechat ? "微信：" + s.contact_wechat : "微信：暂未提供");
    setText("contactEmail", s.contact_email ? "邮箱：" + s.contact_email : "邮箱：暂未提供");
  } catch (err) {
    // 读取失败时保持页面上的默认内容
  }
}

applySiteSettings();
loadServiceItems();
