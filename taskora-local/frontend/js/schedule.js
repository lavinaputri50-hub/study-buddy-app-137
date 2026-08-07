let schedules = [];
let editingId = null;

const modal = document.getElementById("schedule-modal");
const form = document.getElementById("schedule-form");

if (requireAuth()) {
  renderShell("schedule.html");
  initNotifications();
  form.day_of_week.innerHTML = DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join("");
  loadSchedules();
}

document.getElementById("add-schedule").addEventListener("click", () => openModal());
modal.querySelector("[data-close]").addEventListener("click", () => modal.classList.remove("open"));

function openModal(item) {
  editingId = item ? item.id : null;
  document.getElementById("schedule-modal-title").textContent = item ? "Edit Jadwal" : "Tambah Jadwal";
  form.day_of_week.value = item ? item.day_of_week : 0;
  form.subject.value = item ? item.subject : "";
  form.start_time.value = item ? hhmm(item.start_time) : "08:00";
  form.end_time.value = item ? hhmm(item.end_time) : "09:30";
  modal.classList.add("open");
}

async function loadSchedules() {
  try {
    schedules = await api("/schedules");
    render();
  } catch (err) {
    toast(err.message, "error");
  }
}

function render() {
  document.getElementById("days").innerHTML = DAYS.map((day, index) => {
    const items = schedules.filter((s) => Number(s.day_of_week) === index);
    const body = items.length
      ? items
          .map(
            (s) => `<div class="slot">
              <div style="flex:1">
                <div style="font-weight:600;font-size:14px">${escapeHtml(s.subject)}</div>
                <small>${hhmm(s.start_time)}–${hhmm(s.end_time)}</small>
              </div>
              <button class="icon-btn" data-edit="${s.id}">✏️</button>
              <button class="icon-btn" data-delete="${s.id}">🗑️</button>
            </div>`,
          )
          .join("")
      : '<p class="empty">Belum ada jadwal</p>';
    return `<div class="card day-card"><h3>${day}</h3>${body}</div>`;
  }).join("");

  document.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () =>
      openModal(schedules.find((s) => String(s.id) === btn.dataset.edit)),
    ),
  );
  document.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Hapus jadwal ini?")) return;
      try {
        await api(`/schedules/${btn.dataset.delete}`, { method: "DELETE" });
        toast("Jadwal dihapus");
        loadSchedules();
      } catch (err) {
        toast(err.message, "error");
      }
    }),
  );
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    day_of_week: Number(form.day_of_week.value),
    subject: form.subject.value.trim(),
    start_time: form.start_time.value,
    end_time: form.end_time.value,
  };
  try {
    await api(editingId ? `/schedules/${editingId}` : "/schedules", {
      method: editingId ? "PUT" : "POST",
      body,
    });
    modal.classList.remove("open");
    toast(editingId ? "Jadwal diperbarui" : "Jadwal ditambahkan");
    loadSchedules();
  } catch (err) {
    toast(err.message, "error");
  }
});
