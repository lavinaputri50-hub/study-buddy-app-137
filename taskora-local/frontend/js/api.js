const API_URL = "http://localhost:4000/api";

const store = {
  get token() {
    return localStorage.getItem("taskora_token");
  },
  set token(value) {
    value
      ? localStorage.setItem("taskora_token", value)
      : localStorage.removeItem("taskora_token");
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem("taskora_user") || "null");
    } catch {
      return null;
    }
  },
  set user(value) {
    value
      ? localStorage.setItem("taskora_user", JSON.stringify(value))
      : localStorage.removeItem("taskora_user");
  },
};

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (store.token) headers.Authorization = `Bearer ${store.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && !path.startsWith("/auth")) {
    store.token = null;
    store.user = null;
    window.location.href = "index.html";
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Terjadi kesalahan");
  return data;
}

function toast(message, type = "success") {
  let host = document.getElementById("toast");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast ${type === "error" ? "toast--error" : ""}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const PRIORITY_LABEL = { high: "Tinggi", medium: "Sedang", low: "Rendah" };

function formatDeadline(value) {
  if (!value) return "Tanpa deadline";
  return new Date(value.replace(" ", "T")).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(value) {
  if (!value) return null;
  const diff = new Date(value.replace(" ", "T")) - new Date();
  return Math.ceil(diff / 86400000);
}

function hhmm(time) {
  return String(time).slice(0, 5);
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}
