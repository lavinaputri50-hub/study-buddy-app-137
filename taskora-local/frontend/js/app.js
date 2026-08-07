// Guard + shell (sidebar, topbar) untuk semua halaman internal.
function requireAuth() {
  if (!store.token) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

const NAV = [
  { label: "Dashboard", href: "dashboard.html", icon: "🏠" },
  { label: "Schedule", href: "schedule.html", icon: "📅" },
  { label: "Tasks", href: "tasks.html", icon: "✅" },
  { label: "Progress", href: "progress.html", icon: "📈" },
  { label: "Settings", href: "settings.html", icon: "⚙️" },
];

function renderShell(activeHref) {
  const page = window.location.pathname.split("/").pop() || activeHref;
  const sidebar = document.getElementById("sidebar");
  const topbar = document.getElementById("topbar-user");
  const user = store.user || { name: "Siswa" };

  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar__brand">🎓 Taskora</div>
      ${NAV.map(
        (item) =>
          `<a href="${item.href}" class="${item.href === page ? "active" : ""}">
             <span>${item.icon}</span> ${item.label}
           </a>`,
      ).join("")}
      <div class="sidebar__spacer"></div>
      <a href="#" id="logout-link"><span>🚪</span> Logout</a>`;
    document.getElementById("logout-link").addEventListener("click", (e) => {
      e.preventDefault();
      if (!confirm("Yakin ingin keluar dari Taskora?")) return;
      store.token = null;
      store.user = null;
      window.location.href = "index.html";
    });
  }

  if (topbar) {
    const initial = (user.name || "S").charAt(0).toUpperCase();
    topbar.innerHTML = `
      <button class="bell" id="bell" title="Notifikasi deadline">🔔<span id="bell-count" hidden>0</span></button>
      <div class="topbar__user">
        ${
          user.avatar_url
            ? `<img class="avatar" src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.name)}">`
            : `<div class="avatar">${initial}</div>`
        }
        <strong>${escapeHtml(user.name)}</strong>
      </div>`;
  }
}

async function initNotifications() {
  try {
    const tasks = await api("/tasks?status=pending");
    const urgent = tasks.filter((t) => {
      const d = daysUntil(t.deadline);
      return d !== null && d <= 2;
    });
    const badge = document.getElementById("bell-count");
    if (badge && urgent.length) {
      badge.hidden = false;
      badge.textContent = urgent.length;
    }
    const bell = document.getElementById("bell");
    if (bell) {
      bell.addEventListener("click", () => {
        if (!urgent.length) return toast("Tidak ada deadline mendesak 🎉");
        toast(`${urgent.length} tugas mendekati deadline: ${urgent.map((t) => t.title).join(", ")}`);
      });
    }
  } catch {
    /* diamkan */
  }
}
