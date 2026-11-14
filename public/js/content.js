"use strict";

const loginBox = document.getElementById("loginBox");
const contentPanel = document.getElementById("contentPanel");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const form = document.getElementById("contentForm");
const toast = document.getElementById("toast");

const logoFile = document.getElementById("logoFile");
const logoPreview = document.getElementById("logoPreview");
const removeLogoBtn = document.getElementById("removeLogoBtn");

const heroFile = document.getElementById("heroFile");
const heroPreview = document.getElementById("heroPreview");
const removeHeroBtn = document.getElementById("removeHeroBtn");

const itemsManager = document.getElementById("itemsManager");
const addItemBtn = document.getElementById("addItemBtn");
const newItemTitle = document.getElementById("newItemTitle");
const newItemDesc = document.getElementById("newItemDesc");
const newItemIcon = document.getElementById("newItemIcon");

const currentPassword = document.getElementById("currentPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const changePasswordBtn = document.getElementById("changePasswordBtn");

const TOKEN_KEY = "fengshui_admin_token";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/x-icon"];

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showPanel() {
  loginBox.classList.add("hidden");
  contentPanel.classList.remove("hidden");
  loadSettings();
  loadItems();
}

function showLogin() {
  contentPanel.classList.add("hidden");
  loginBox.classList.remove("hidden");
}

async function request(url, options = {}) {
  options.headers = Object.assign({}, options.headers, {
    Authorization: "Bearer " + token(),
  });
  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
    throw new Error("登录已过期，请重新登录");
  }
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.error || "请求失败");
  return result;
}

async function uploadImage(url, file, onSuccess) {
  if (!IMAGE_TYPES.includes(file.type)) {
    showToast("仅支持 PNG / JPG / WEBP / GIF / ICO 格式的图片");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("图片不能超过 5MB");
    return;
  }
  try {
    const result = await request(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    onSuccess(result.url);
  } catch (err) {
    showToast(err.message);
  }
}

function updatePreview(img, url) {
  if (url) {
    img.src = url;
    img.classList.remove("hidden");
  } else {
    img.removeAttribute("src");
    img.classList.add("hidden");
  }
}

async function loadSettings() {
  try {
    const result = await request("/api/settings");
    const s = result.settings || {};
    for (const el of form.elements) {
      if (el.name && Object.prototype.hasOwnProperty.call(s, el.name)) {
        el.value = s[el.name];
      }
    }
    updatePreview(logoPreview, s.logo_url);
    updatePreview(heroPreview, s.hero_image);
  } catch (err) {
    showToast(err.message);
  }
}

logoFile.addEventListener("change", () => {
  const file = logoFile.files && logoFile.files[0];
  if (!file) return;
  uploadImage("/api/settings/logo", file, (url) => {
    updatePreview(logoPreview, url);
    showToast("Logo 已上传，首页立即生效");
  }).finally(() => {
    logoFile.value = "";
  });
});

removeLogoBtn.addEventListener("click", async () => {
  if (!confirm("确定移除当前 Logo 吗？移除后将恢复为默认的印章图标。")) return;
  try {
    await request("/api/settings/logo", { method: "DELETE" });
    updatePreview(logoPreview, "");
    showToast("Logo 已移除");
  } catch (err) {
    showToast(err.message);
  }
});

heroFile.addEventListener("change", () => {
  const file = heroFile.files && heroFile.files[0];
  if (!file) return;
  uploadImage("/api/settings/hero-image", file, (url) => {
    updatePreview(heroPreview, url);
    showToast("首页大图已上传");
  }).finally(() => {
    heroFile.value = "";
  });
});

removeHeroBtn.addEventListener("click", async () => {
  if (!confirm("确定移除首页大图吗？移除后将恢复默认的八卦图。")) return;
  try {
    await request("/api/settings/hero-image", { method: "DELETE" });
    updatePreview(heroPreview, "");
    showToast("首页大图已移除");
  } catch (err) {
    showToast(err.message);
  }
});

async function loadItems() {
  try {
    const result = await request("/api/items");
    renderItems(result.rows || []);
  } catch (err) {
    showToast(err.message);
  }
}

function renderItems(items) {
  itemsManager.innerHTML = items
    .map(
      (item) => `
      <div class="item-row" data-id="${item.id}">
        <div class="item-icon">
          ${item.image
            ? `<img src="${escapeHtml(item.image)}" alt="">`
            : item.icon
              ? `<span class="item-emoji">${escapeHtml(item.icon)}</span>`
              : `<span class="item-emoji">✦</span>`}
          <label class="item-file">
            上传图标图
            <input type="file" data-upload="${item.id}" accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon">
          </label>
          <button class="btn btn-danger btn-sm" data-remove-icon="${item.id}" type="button">去图标图</button>
        </div>
        <div class="item-fields">
          <input class="item-title" data-id="${item.id}" value="${escapeHtml(item.title)}" placeholder="项目名称" maxlength="100">
          <input class="item-desc" data-id="${item.id}" value="${escapeHtml(item.description)}" placeholder="项目介绍" maxlength="500">
          <input class="item-icon-text" data-id="${item.id}" value="${escapeHtml(item.icon)}" placeholder="emoji 图标（可选）" maxlength="20">
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" data-save="${item.id}" type="button">保存</button>
          <button class="btn btn-danger btn-sm" data-delete="${item.id}" type="button">删除</button>
        </div>
      </div>`
    )
    .join("");
}

itemsManager.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-upload]");
  if (!input) return;
  const file = input.files && input.files[0];
  if (!file) return;
  uploadImage(`/api/items/${input.dataset.upload}/icon`, file, () => {
    showToast("项目图标已上传");
    loadItems();
  }).finally(() => {
    input.value = "";
  });
});

itemsManager.addEventListener("click", async (event) => {
  const saveBtn = event.target.closest("button[data-save]");
  const deleteBtn = event.target.closest("button[data-delete]");
  const removeIconBtn = event.target.closest("button[data-remove-icon]");

  if (saveBtn) {
    const id = saveBtn.dataset.save;
    const row = saveBtn.closest(".item-row");
    const title = row.querySelector(".item-title").value.trim();
    const description = row.querySelector(".item-desc").value.trim();
    const icon = row.querySelector(".item-icon-text").value.trim();
    if (!title) {
      showToast("项目名称不能为空");
      return;
    }
    try {
      await request(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, icon }),
      });
      showToast("项目已保存");
      loadItems();
    } catch (err) {
      showToast(err.message);
    }
    return;
  }

  if (deleteBtn) {
    if (!confirm("确定删除这个项目吗？此操作不可恢复。")) return;
    try {
      await request(`/api/items/${deleteBtn.dataset.delete}`, { method: "DELETE" });
      showToast("项目已删除");
      loadItems();
    } catch (err) {
      showToast(err.message);
    }
    return;
  }

  if (removeIconBtn) {
    if (!confirm("确定移除该项目的图标图片吗？")) return;
    try {
      await request(`/api/items/${removeIconBtn.dataset.removeIcon}/icon`, { method: "DELETE" });
      showToast("图标图片已移除");
      loadItems();
    } catch (err) {
      showToast(err.message);
    }
  }
});

addItemBtn.addEventListener("click", async () => {
  const title = newItemTitle.value.trim();
  if (!title) {
    showToast("请填写新增项目名称");
    return;
  }
  try {
    await request("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: newItemDesc.value.trim(),
        icon: newItemIcon.value.trim(),
      }),
    });
    newItemTitle.value = "";
    newItemDesc.value = "";
    newItemIcon.value = "";
    showToast("项目已添加");
    loadItems();
  } catch (err) {
    showToast(err.message);
  }
});

changePasswordBtn.addEventListener("click", async () => {
  const current = currentPassword.value.trim();
  const next = newPassword.value;
  if (!current || !next || !confirmPassword.value) {
    showToast("请填写完整密码信息");
    return;
  }
  if (next.length < 6) {
    showToast("新密码至少 6 位");
    return;
  }
  if (next !== confirmPassword.value) {
    showToast("两次输入的新密码不一致");
    return;
  }
  try {
    await request("/api/admin-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    localStorage.removeItem(TOKEN_KEY);
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    showToast("密码已修改，请重新登录");
    setTimeout(showLogin, 900);
  } catch (err) {
    showToast(err.message);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const settings = Object.fromEntries(new FormData(form).entries());
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "保存中……";
  try {
    await request("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    showToast("保存成功，首页已更新");
  } catch (err) {
    showToast(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "保存修改";
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput.value }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "登录失败");
    localStorage.setItem(TOKEN_KEY, result.token);
    passwordInput.value = "";
    showPanel();
  } catch (err) {
    showToast(err.message);
  }
});

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginBtn.click();
});

if (token()) showPanel();
else showLogin();
