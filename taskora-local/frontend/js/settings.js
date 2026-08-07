const form = document.getElementById("settings-form");

if (requireAuth()) {
  renderShell("settings.html");
  initNotifications();
  loadProfile();
}

async function loadProfile() {
  try {
    const profile = await api("/profile");
    form.name.value = profile.name || "";
    form.email.value = profile.email || "";
    form.avatar_url.value = profile.avatar_url || "";
    form.language.value = profile.language || "id";
    form.theme.value = profile.theme || "light";
    applyTheme(form.theme.value);
  } catch (err) {
    toast(err.message, "error");
  }
}

function applyTheme(theme) {
  const root = document.documentElement.style;
  if (theme === "dark") {
    root.setProperty("--bg", "#141326");
    root.setProperty("--card", "#1e1c33");
    root.setProperty("--text", "#f2f1f8");
    root.setProperty("--border", "#2c2a45");
    root.setProperty("--purple-soft", "#2a2350");
  } else {
    root.removeProperty("--bg");
    root.removeProperty("--card");
    root.removeProperty("--text");
    root.removeProperty("--border");
    root.removeProperty("--purple-soft");
  }
}

form.theme.addEventListener("change", () => applyTheme(form.theme.value));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    avatar_url: form.avatar_url.value.trim() || null,
    language: form.language.value,
    theme: form.theme.value,
  };
  if (form.password.value) body.password = form.password.value;

  try {
    const updated = await api("/profile", { method: "PUT", body });
    store.user = updated;
    form.password.value = "";
    renderShell("settings.html");
    toast("Perubahan disimpan");
  } catch (err) {
    toast(err.message, "error");
  }
});
