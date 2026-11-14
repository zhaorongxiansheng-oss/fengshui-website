"use strict";

const form = document.getElementById("registerForm");
const toast = document.getElementById("toast");

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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.name.trim()) {
    showToast("请填写姓名");
    return;
  }
  if (!data.phone.trim() && !data.wechat.trim() && !data.email.trim()) {
    showToast("请至少填写电话、微信或邮箱中的一项");
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "提交中……";

  try {
    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "提交失败，请稍后重试");
    }
    showToast("登记成功，我们会尽快与您联系");
    form.reset();
  } catch (err) {
    showToast(escapeHtml(err.message));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "提交登记";
  }
});

