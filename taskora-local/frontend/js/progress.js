const MOTIVATIONS = [
  "Sedikit demi sedikit, lama-lama selesai juga. 💪",
  "Konsistensi mengalahkan intensitas. Terus jalan!",
  "Satu tugas selesai hari ini lebih baik daripada sepuluh rencana.",
  "Kamu lebih dekat ke tujuanmu dibanding kemarin. ✨",
];

if (requireAuth()) {
  renderShell("progress.html");
  initNotifications();
  document.getElementById("motivation").textContent =
    MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
  loadProgress();
}

async function loadProgress() {
  try {
    const [stats, tasks] = await Promise.all([api("/tasks/stats/summary"), api("/tasks")]);

    document.getElementById("p-done").textContent = stats.completed;
    document.getElementById("p-pending").textContent = stats.pending;
    document.getElementById("p-total").textContent = stats.total;
    document.getElementById("ring-label").textContent = `${stats.progress}%`;

    const circumference = 2 * Math.PI * 54;
    document.getElementById("ring").style.strokeDashoffset =
      circumference * (1 - stats.progress / 100);

    const counts = ["high", "medium", "low"].map((p) => ({
      label: PRIORITY_LABEL[p],
      value: tasks.filter((t) => t.priority === p).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.value));

    document.getElementById("bars").innerHTML = counts
      .map(
        (c) => `<div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
            <span>${c.label}</span><strong>${c.value}</strong>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${(c.value / max) * 100}%"></div></div>
        </div>`,
      )
      .join("");
  } catch (err) {
    toast(err.message, "error");
  }
}
