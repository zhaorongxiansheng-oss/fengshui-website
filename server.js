"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "fengshui.db");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

const PORT = Number(process.env.PORT || process.env.APP_PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin888";
const MAX_BODY = 1024 * 1024;
const MAX_IMAGE_BODY = 5 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT '',
    birth_date TEXT NOT NULL DEFAULT '',
    birth_time TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    wechat TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '待处理',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS site_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
`);

const DEFAULT_SETTINGS = {
  site_title: "昭荣书院 · 风水咨询与在线登记",
  site_name: "昭荣书院",
  logo_url: "",
  brand_seal: "昭",
  brand_tagline: "风水 · 堪舆 · 命理",
  hero_image: "",
  hero_line1: "一命二运三风水",
  hero_line2: "调和天地，安顿身心",
  hero_sub:
    "昭荣书院传承中国传统风水与命理文化，为您提供专业、真诚的堪舆咨询与规划服务。欢迎在线登记，我们将尽快与您联系。",
  nav_home: "首页",
  nav_intro: "网站介绍",
  nav_services: "服务项目",
  nav_flow: "咨询流程",
  nav_contact: "联系我们",
  nav_register: "在线登记",
  intro_kicker: "ABOUT",
  intro_title: "网站介绍",
  intro_sub: "了解昭荣书院的初衷、服务理念与专业范围",
  about_title: "关于昭荣书院",
  about_1:
    "昭荣书院是一间专注于中国传统风水与命理文化的工作室。我们相信，环境与人的和谐，是生活安稳、事业顺遂的重要基础。风水不是迷信，而是一门关于空间、时间与人相互关系的传统学问。",
  about_2:
    "本站面向有风水咨询需求的朋友开放，提供线上信息登记与预约服务。您提交的信息将安全地保存在本站数据库中，由老师逐一审核后，与您沟通具体咨询事宜。",
  services_intro_title: "我们的服务范围",
  services:
    "阳宅风水：住宅选房、户型布局、装修朝向、卧室与财位规划。\n商业风水：商铺、办公室、工厂的选址与内部格局优化。\n命理咨询：八字排盘分析、流年运势、起名改名、婚配择日。\n风水课程：面向爱好者开设入门讲座与进阶研讨。",
  services_kicker: "SERVICES",
  services_title: "服务项目",
  services_sub: "从居家到办公，从择日到命理，为您提供全方位的传统咨询服务",
  flow_kicker: "PROCESS",
  flow_title: "咨询流程",
  flow_sub: "简单四步，开启您的风水咨询之旅",
  cta_title: "有风水方面的需求？",
  cta_sub: "花一分钟完成登记，让专业老师为您答疑解惑。",
  cta_button: "前往在线登记窗口",
  footer_about:
    "传承中华传统文化，以专业、真诚的态度为您提供风水与命理咨询服务。本站所有登记信息均安全保存于本地数据库，仅用于咨询联络。",
  footer_services_title: "服务项目",
  footer_contact_title: "联系我们",
  contact_phone: "138-0000-0000（示例）",
  contact_wechat: "zhaorongshuyuan（示例）",
  contact_email: "hello@example.com（示例）",
  copyright_text: "© 2026 昭荣书院 · 风水咨询网站",
};
const EDITABLE_SETTINGS = Object.keys(DEFAULT_SETTINGS).filter(
  (key) => key !== "logo_url" && key !== "hero_image"
);

const seedSettingStmt = db.prepare(
  "INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)"
);
for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
  seedSettingStmt.run(key, value);
}
// 一次性迁移：把历史数据中的旧站名替换为新站名
const migrateSettingStmt = db.prepare(
  "UPDATE site_settings SET value = replace(value, ?, ?) WHERE key = ?"
);
for (const key of [
  "site_name",
  "site_title",
  "hero_sub",
  "intro_sub",
  "about_title",
  "about_1",
  "about_2",
  "footer_about",
  "copyright_text",
]) {
  migrateSettingStmt.run("玄微堂", "昭荣书院", key);
  migrateSettingStmt.run("照荣书院", "昭荣书院", key);
}
migrateSettingStmt.run("照", "昭", "brand_seal");
migrateSettingStmt.run("xuanweitang", "zhaorongshuyuan", "contact_wechat");

const upsertSettingStmt = db.prepare(
  "INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
);

const DEFAULT_ITEMS = [
  { title: "阳宅风水", description: "住宅选房、户型分析、装修朝向与布局调整，营造安居乐业的居住环境。", icon: "🏠" },
  { title: "商业风水", description: "商铺、办公室与工厂的选址评估、财位规划，助力生意兴隆、团队顺遂。", icon: "🏢" },
  { title: "八字命理", description: "传统八字排盘、流年运势解读，了解自身命局，把握人生节奏。", icon: "📜" },
  { title: "择日吉时", description: "开业、搬迁、婚嫁、动土等大事择日，挑选合宜的良辰吉日。", icon: "📅" },
  { title: "起名改名", description: "结合生辰八字与音形义，为公司、店铺或宝宝起一个吉祥如意的好名字。", icon: "✍️" },
  { title: "风水课程", description: "面向传统文化爱好者开设入门与进阶课程，系统学习风水基础与实战。", icon: "🎓" },
];
const itemCount = db.prepare("SELECT COUNT(*) AS c FROM site_items").get().c;
if (itemCount === 0) {
  const insertItemSeed = db.prepare(
    "INSERT INTO site_items (title, description, icon, image, sort_order) VALUES (?, ?, ?, '', ?)"
  );
  DEFAULT_ITEMS.forEach((item, index) => {
    insertItemSeed.run(item.title, item.description, item.icon, index + 1);
  });
}

const insertRegistrationStmt = db.prepare(`
  INSERT INTO registrations
    (name, gender, birth_date, birth_time, phone, wechat, email, city, address, category, message, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const listRegistrationsStmt = db.prepare(`
  SELECT * FROM registrations
  WHERE (? = '' OR status = ?)
    AND (? = '' OR name LIKE ? OR phone LIKE ? OR wechat LIKE ? OR category LIKE ?)
  ORDER BY id DESC
  LIMIT ?
`);
const updateStatusStmt = db.prepare("UPDATE registrations SET status = ? WHERE id = ?");
const deleteRegistrationStmt = db.prepare("DELETE FROM registrations WHERE id = ?");

const listItemsStmt = db.prepare("SELECT * FROM site_items ORDER BY sort_order, id");
const getItemStmt = db.prepare("SELECT * FROM site_items WHERE id = ?");
const insertItemStmt = db.prepare(
  "INSERT INTO site_items (title, description, icon, image, sort_order) VALUES (?, ?, ?, '', ?)"
);
const updateItemStmt = db.prepare("UPDATE site_items SET title = ?, description = ?, icon = ? WHERE id = ?");
const updateItemImageStmt = db.prepare("UPDATE site_items SET image = ? WHERE id = ?");
const deleteItemStmt = db.prepare("DELETE FROM site_items WHERE id = ?");
const maxSortStmt = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM site_items");

const tokens = new Set();

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function readBodyBuffer(req, max = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > max) {
        reject(new Error("图片文件过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function requireToken(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!tokens.has(token)) {
    json(res, 401, { ok: false, error: "未登录或登录已过期" });
    return false;
  }
  return true;
}

function parseBody(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function cleanText(value, max = 500) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function getSetting(key) {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key);
  return row ? row.value : "";
}

const IMAGE_EXTS = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/x-icon": ".ico",
};

function uploadsPathFor(url) {
  if (!url || !url.startsWith("/uploads/")) return null;
  const p = path.normalize(path.join(PUBLIC_DIR, url));
  return p.startsWith(UPLOADS_DIR + path.sep) ? p : null;
}

function removeUploadedFile(url) {
  const p = uploadsPathFor(url);
  if (p) fs.rmSync(p, { force: true });
}

async function receiveImage(req, prefix) {
  const contentType = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const ext = IMAGE_EXTS[contentType];
  if (!ext) return { error: "仅支持 PNG / JPG / WEBP / GIF / ICO 格式的图片" };
  let buf;
  try {
    buf = await readBodyBuffer(req, MAX_IMAGE_BODY);
  } catch (err) {
    return { error: err.message };
  }
  if (!buf.length) return { error: "没有接收到图片数据" };
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filename = `${prefix}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);
  return { url: "/uploads/" + filename };
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";

  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": data.length,
    });
    res.end(data);
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      service: "fengshui-website",
      time: new Date().toISOString(),
      registrations: countRows(),
    });
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = parseBody(await readBody(req));
    if (body.password !== ADMIN_PASSWORD) {
      return json(res, 401, { ok: false, error: "密码不正确" });
    }
    const token = crypto.randomBytes(24).toString("hex");
    tokens.add(token);
    return json(res, 200, { ok: true, token });
  }

  if (req.method === "GET" && pathname === "/api/settings/public") {
    const rows = db.prepare("SELECT key, value FROM site_settings").all();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return json(res, 200, { ok: true, settings });
  }

  if (req.method === "GET" && pathname === "/api/settings") {
    if (!requireToken(req, res)) return;
    const rows = db.prepare("SELECT key, value FROM site_settings").all();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return json(res, 200, { ok: true, settings });
  }

  if (req.method === "PUT" && pathname === "/api/settings") {
    if (!requireToken(req, res)) return;
    const body = parseBody(await readBody(req));
    const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
    for (const key of EDITABLE_SETTINGS) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        upsertSettingStmt.run(key, cleanText(settings[key], 2000));
      }
    }
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && pathname === "/api/settings/logo") {
    if (!requireToken(req, res)) return;
    removeUploadedFile(getSetting("logo_url"));
    const result = await receiveImage(req, "logo");
    if (result.error) return json(res, 400, { ok: false, error: result.error });
    upsertSettingStmt.run("logo_url", result.url);
    return json(res, 200, { ok: true, url: result.url });
  }

  if (req.method === "DELETE" && pathname === "/api/settings/logo") {
    if (!requireToken(req, res)) return;
    removeUploadedFile(getSetting("logo_url"));
    upsertSettingStmt.run("logo_url", "");
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && pathname === "/api/settings/hero-image") {
    if (!requireToken(req, res)) return;
    removeUploadedFile(getSetting("hero_image"));
    const result = await receiveImage(req, "hero");
    if (result.error) return json(res, 400, { ok: false, error: result.error });
    upsertSettingStmt.run("hero_image", result.url);
    return json(res, 200, { ok: true, url: result.url });
  }

  if (req.method === "DELETE" && pathname === "/api/settings/hero-image") {
    if (!requireToken(req, res)) return;
    removeUploadedFile(getSetting("hero_image"));
    upsertSettingStmt.run("hero_image", "");
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && pathname === "/api/items") {
    return json(res, 200, { ok: true, rows: listItemsStmt.all() });
  }

  if (req.method === "POST" && pathname === "/api/items") {
    if (!requireToken(req, res)) return;
    const body = parseBody(await readBody(req));
    const title = cleanText(body.title, 100);
    if (!title) return json(res, 400, { ok: false, error: "请填写项目名称" });
    const sortOrder = maxSortStmt.get().m + 1;
    const result = insertItemStmt.run(
      title,
      cleanText(body.description, 500),
      cleanText(body.icon, 20),
      sortOrder
    );
    return json(res, 201, { ok: true, id: Number(result.lastInsertRowid) });
  }

  const itemIconMatch = pathname.match(/^\/api\/items\/(\d+)\/icon$/);
  if (itemIconMatch) {
    const id = Number(itemIconMatch[1]);
    if (req.method === "POST") {
      if (!requireToken(req, res)) return;
      const item = getItemStmt.get(id);
      if (!item) return json(res, 404, { ok: false, error: "项目不存在" });
      removeUploadedFile(item.image);
      const result = await receiveImage(req, `item-${id}`);
      if (result.error) return json(res, 400, { ok: false, error: result.error });
      updateItemImageStmt.run(result.url, id);
      return json(res, 200, { ok: true, url: result.url });
    }
    if (req.method === "DELETE") {
      if (!requireToken(req, res)) return;
      const item = getItemStmt.get(id);
      if (!item) return json(res, 404, { ok: false, error: "项目不存在" });
      removeUploadedFile(item.image);
      updateItemImageStmt.run("", id);
      return json(res, 200, { ok: true });
    }
  }

  const itemMatch = pathname.match(/^\/api\/items\/(\d+)$/);
  if (itemMatch) {
    const id = Number(itemMatch[1]);
    if (req.method === "PATCH") {
      if (!requireToken(req, res)) return;
      const body = parseBody(await readBody(req));
      const item = getItemStmt.get(id);
      if (!item) return json(res, 404, { ok: false, error: "项目不存在" });
      const title = cleanText(body.title, 100);
      if (!title) return json(res, 400, { ok: false, error: "项目名称不能为空" });
      updateItemStmt.run(title, cleanText(body.description, 500), cleanText(body.icon, 20), id);
      return json(res, 200, { ok: true });
    }
    if (req.method === "DELETE") {
      if (!requireToken(req, res)) return;
      const item = getItemStmt.get(id);
      if (!item) return json(res, 404, { ok: false, error: "项目不存在" });
      removeUploadedFile(item.image);
      deleteItemStmt.run(id);
      return json(res, 200, { ok: true });
    }
  }

  if (req.method === "POST" && pathname === "/api/registrations") {
    const body = parseBody(await readBody(req));
    const name = cleanText(body.name, 50);
    const phone = cleanText(body.phone, 30);
    const wechat = cleanText(body.wechat, 50);
    const email = cleanText(body.email, 100);

    if (!name) return json(res, 400, { ok: false, error: "请填写姓名" });
    if (!phone && !wechat && !email) {
      return json(res, 400, { ok: false, error: "请至少填写一种联系方式（电话 / 微信 / 邮箱）" });
    }

    const result = insertRegistrationStmt.run(
      name,
      cleanText(body.gender, 10),
      cleanText(body.birth_date, 20),
      cleanText(body.birth_time, 20),
      phone,
      wechat,
      email,
      cleanText(body.city, 50),
      cleanText(body.address, 200),
      cleanText(body.category, 50),
      cleanText(body.message, 1000),
      "待处理"
    );
    return json(res, 201, { ok: true, id: Number(result.lastInsertRowid) });
  }

  if (req.method === "GET" && pathname === "/api/registrations") {
    if (!requireToken(req, res)) return;
    const url = new URL(req.url, "http://localhost");
    const status = cleanText(url.searchParams.get("status"), 20);
    const q = cleanText(url.searchParams.get("q"), 100);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
    const like = `%${q}%`;
    const rows = listRegistrationsStmt.all(status, status, q, like, like, like, like, limit);
    return json(res, 200, { ok: true, rows });
  }

  const regMatch = pathname.match(/^\/api\/registrations\/(\d+)$/);
  if (regMatch) {
    const id = Number(regMatch[1]);
    if (req.method === "PATCH") {
      if (!requireToken(req, res)) return;
      const body = parseBody(await readBody(req));
      const allowed = new Set(["待处理", "已联系", "已完成"]);
      const status = cleanText(body.status, 20);
      if (!allowed.has(status)) {
        return json(res, 400, { ok: false, error: "无效的状态" });
      }
      const result = updateStatusStmt.run(status, id);
      if (!result.changes) return json(res, 404, { ok: false, error: "记录不存在" });
      return json(res, 200, { ok: true });
    }
    if (req.method === "DELETE") {
      if (!requireToken(req, res)) return;
      const result = deleteRegistrationStmt.run(id);
      if (!result.changes) return json(res, 404, { ok: false, error: "记录不存在" });
      return json(res, 200, { ok: true });
    }
  }

  return json(res, 404, { ok: false, error: "接口不存在" });
}

function countRows() {
  return db.prepare("SELECT COUNT(*) AS c FROM registrations").get().c;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method Not Allowed");
      return;
    }
    serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) json(res, 500, { ok: false, error: "服务器内部错误" });
  }
});

server.listen(PORT, () => {
  console.log(`风水网站已启动：http://localhost:${PORT}`);
  console.log(`管理后台默认密码：${ADMIN_PASSWORD}（可通过环境变量 ADMIN_PASSWORD 修改）`);
});
