"use strict";

const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const tbody = document.getElementById("tbody");
const emptyHint = document.getElementById("emptyHint");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const toast = document.getElementById("toast");

const TOKEN_KEY = "fengshui_admin_token";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function showPanel() {
  loginBox.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  loadRows();
}

function showLogin() {
  adminPanel.classList.add("hidden");
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

async function loadRows() {
  const params = new URLSearchParams();
  const q = searchInput.value.trim();
  const status = statusFilter.value;
  if (q) params.set("q", q);
  if (status) params.set("status", status);

  try {
    const result = await request("/api/registrations?" + params.toString());
    render(result.rows || []);
  } catch (err) {
    showToast(err.message);
  }
}

function render(rows) {
  emptyHint.classList.toggle("hidden", rows.length > 0);
  tbody.innerHTML = rows
    .map((r) => {
      const birth = [r.birth_date, r.birth_time].filter(Boolean).join(" ");
      const contact = [r.phone, r.wechat, r.email].filter(Boolean).join("<br>");
      return `
        <tr>
          <td>${r.id}</td>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.gender) || "-"}</td>
          <td>${escapeHtml(birth) || "-"}</td>
          <td>${contact || "-"}</td>
          <td>${escapeHtml(r.city) || "-"}</td>
          <td>${escapeHtml(r.category) || "-"}</td>
          <td style="max-width: 220px;">${escapeHtml(r.message) || "-"}</td>
          <td style="white-space: nowrap;">${escapeHtml(r.created_at)}</td>
          <td>
            <select class="status status-${escapeHtml(r.status)}" data-id="${r.id}">
              <option value="待处理" ${r.status === "待处理" ? "selected" : ""}>待处理</option>
              <option value="已联系" ${r.status === "已联系" ? "selected" : ""}>已联系</option>
              <option value="已完成" ${r.status === "已完成" ? "selected" : ""}>已完成</option>
            </select>
          </td>
          <td><button class="btn btn-danger btn-sm" data-delete="${r.id}" type="button">删除</button></td>
        </tr>`;
    })
    .join("");
}

tbody.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-id]");
  if (!select) return;
  try {
    await request("/api/registrations/" + select.dataset.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: select.value }),
    });
    showToast("状态已更新");
    select.className = "status status-" + select.value;
  } catch (err) {
    showToast(err.message);
    loadRows();
  }
});

tbody.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-delete]");
  if (!btn) return;
  if (!confirm("确定删除这条登记信息吗？此操作不可恢复。")) return;
  try {
    await request("/api/registrations/" + btn.dataset.delete, { method: "DELETE" });
    showToast("已删除");
    loadRows();
  } catch (err) {
    showToast(err.message);
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

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadRows, 250);
});
statusFilter.addEventListener("change", loadRows);
refreshBtn.addEventListener("click", loadRows);
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  showLogin();
});

if (token()) showPanel();
else showLogin();

