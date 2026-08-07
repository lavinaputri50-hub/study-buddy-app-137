let tasks = [];
let editingId = null;

const taskModal = document.getElementById("task-modal");
const detailModal = document.getElementById("detail-modal");
const form = document.getElementById("task-form");

if (requireAuth()) {
  renderShell("tasks.html");
  initNotifications();
  loadTasks();
}

document.getElementById("add-task").addEventListener("click", () => openModal());
document.getElementById("filter-status").addEventListener("change", loadTasks);
document.getElementById("filter-priority").addEventListener("change", loadTasks);
document
  .querySelectorAll("[data-close]")
  .forEach((btn) => btn.addEventListener("click", () => btn.closest(".modal").classList.remove("open")));

function openModal(task) {
  editingId = task ? task.id : null;
  document.getElementById("task-modal-title").textContent = task ? "Edit Tugas" : "Tambah Tugas";
  form.title.value = task ? task.title : "";
  form.description.value = task && task.description ? task.description : "";
  form.deadline.value = task && task.deadline ? task.deadline.replace(" ", "T").slice(0, 16) : "";
  form.priority.value = task ? task.priority : "medium";
  taskModal.classList.add("open");
}

async function loadTasks() {
  const status = document.getElementById("filter-status").value;
  const priority = document.getElementById("filter-priority").value;
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (priority) query.set("priority", priority);

  try {
    tasks = await api(`/tasks${query.toString() ? `?${query}` : ""}`);
    render();
  } catch (err) {
    toast(err.message, "error");
  }
}

function render() {
  document.getElementById("task-count").textContent =
    `${tasks.filter((t) => !Number(t.is_done)).length} tugas belum selesai`;

  const host = document.getElementById("task-list");
  if (!tasks.length) {
    host.innerHTML = '<p class="empty">Belum ada tugas. Klik “Tambah Tugas” untuk memulai.</p>';
    return;
  }

  host.innerHTML = tasks
    .map((task) => {
      const done = Number(task.is_done) === 1;
      const left = daysUntil(task.deadline);
      return `<div class="task ${done ? "task--done" : ""}">
        <input type="checkbox" data-toggle="${task.id}" ${done ? "checked" : ""} style="width:18px;height:18px" />
        <div style="cursor:pointer" data-detail="${task.id}">
          <div class="task__title">${escapeHtml(task.title)}</div>
          <div class="task__meta">${formatDeadline(task.deadline)}${
            !done && left !== null && left <= 2 ? " • ⚠️ deadline mepet" : ""
          }</div>
        </div>
        <span class="badge badge--${done ? "done" : "pending"}" style="margin-left:auto">${done ? "Selesai" : "Belum"}</span>
        <span class="badge badge--${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
        <div class="task__actions">
          <button class="icon-btn" data-edit="${task.id}">✏️</button>
          <button class="icon-btn" data-delete="${task.id}">🗑️</button>
        </div>
      </div>`;
    })
    .join("");

  bind();
}

function bind() {
  const find = (id) => tasks.find((t) => String(t.id) === id);

  document.querySelectorAll("[data-toggle]").forEach((el) =>
    el.addEventListener("change", async () => {
      try {
        await api(`/tasks/${el.dataset.toggle}`, { method: "PUT", body: { is_done: el.checked } });
        loadTasks();
      } catch (err) {
        toast(err.message, "error");
      }
    }),
  );

  document.querySelectorAll("[data-edit]").forEach((el) =>
    el.addEventListener("click", () => openModal(find(el.dataset.edit))),
  );

  document.querySelectorAll("[data-delete]").forEach((el) =>
    el.addEventListener("click", async () => {
      if (!confirm("Hapus tugas ini?")) return;
      try {
        await api(`/tasks/${el.dataset.delete}`, { method: "DELETE" });
        toast("Tugas dihapus");
        loadTasks();
      } catch (err) {
        toast(err.message, "error");
      }
    }),
  );

  document.querySelectorAll("[data-detail]").forEach((el) =>
    el.addEventListener("click", () => {
      const task = find(el.dataset.detail);
      const done = Number(task.is_done) === 1;
      document.getElementById("detail-body").innerHTML = `
        <p style="font-weight:600;font-size:18px;margin-bottom:8px">${escapeHtml(task.title)}</p>
        <p style="font-size:14px;line-height:1.7;margin-bottom:14px">${escapeHtml(task.description || "Tidak ada deskripsi.")}</p>
        <div class="slot"><div><small>Deadline</small><div>${formatDeadline(task.deadline)}</div></div></div>
        <div class="slot"><div><small>Prioritas</small><div>${PRIORITY_LABEL[task.priority]}</div></div></div>
        <div class="slot"><div><small>Status</small><div>${done ? "Selesai" : "Belum Selesai"}</div></div></div>
        <div class="slot"><div><small>Dibuat</small><div>${formatDeadline(task.created_at)}</div></div></div>`;
      detailModal.classList.add("open");
    }),
  );
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    title: form.title.value.trim(),
    description: form.description.value.trim() || null,
    deadline: form.deadline.value ? form.deadline.value.replace("T", " ") + ":00" : null,
    priority: form.priority.value,
  };
  try {
    await api(editingId ? `/tasks/${editingId}` : "/tasks", {
      method: editingId ? "PUT" : "POST",
      body,
    });
    taskModal.classList.remove("open");
    toast(editingId ? "Tugas diperbarui" : "Tugas ditambahkan");
    loadTasks();
  } catch (err) {
    toast(err.message, "error");
  }
});
