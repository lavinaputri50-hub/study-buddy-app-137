if (requireAuth()) {
  renderShell("dashboard.html");
  initNotifications();
  loadDashboard();
}

async function loadDashboard() {
  document.getElementById("greeting").textContent = `Halo, ${(store.user && store.user.name) || "Siswa"}!`;
  try {
    const [stats, tasks] = await Promise.all([api("/tasks/stats/summary"), api("/tasks?status=pending")]);

    document.getElementById("stat-total").textContent = stats.total;
    document.getElementById("stat-done").textContent = stats.completed;
    document.getElementById("stat-progress").textContent = `${stats.progress}%`;
    document.getElementById("progress-bar").style.width = `${stats.progress}%`;

    const host = document.getElementById("upcoming");
    const upcoming = tasks.filter((t) => t.deadline).slice(0, 5);
    if (!upcoming.length) {
      host.innerHTML = '<p class="empty">Tidak ada deadline terdekat. Kerja bagus! 🎉</p>';
      return;
    }
    host.innerHTML = upcoming
      .map((task) => {
        const left = daysUntil(task.deadline);
        const urgent = left !== null && left <= 2;
        return `<div class="task">
          <div>
            <div class="task__title">${escapeHtml(task.title)}</div>
            <div class="task__meta">${formatDeadline(task.deadline)}${urgent ? " • ⚠️ deadline mepet" : ""}</div>
          </div>
          <span class="badge badge--${task.priority}" style="margin-left:auto">${PRIORITY_LABEL[task.priority]}</span>
        </div>`;
      })
      .join("");
  } catch (err) {
    toast(err.message, "error");
  }
}
