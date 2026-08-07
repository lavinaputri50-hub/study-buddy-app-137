let mode = "login";

const form = document.getElementById("auth-form");
const nameField = document.getElementById("name-field");
const title = document.getElementById("auth-title");
const subtitle = document.getElementById("auth-subtitle");
const submitBtn = document.getElementById("auth-submit");
const switchBtn = document.getElementById("auth-switch-btn");
const switchText = document.getElementById("auth-switch-text");

if (store.token) window.location.href = "dashboard.html";

function applyMode() {
  const isLogin = mode === "login";
  nameField.hidden = isLogin;
  nameField.querySelector("input").required = !isLogin;
  title.textContent = isLogin ? "Selamat datang kembali" : "Buat akun Taskora";
  subtitle.textContent = isLogin
    ? "Masuk untuk melanjutkan rencana belajarmu."
    : "Daftar gratis dan mulai atur jadwal belajarmu.";
  submitBtn.textContent = isLogin ? "Login" : "Register";
  switchText.textContent = isLogin ? "Belum punya akun?" : "Sudah punya akun?";
  switchBtn.textContent = isLogin ? "Daftar" : "Login";
}

switchBtn.addEventListener("click", () => {
  mode = mode === "login" ? "register" : "login";
  applyMode();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  try {
    const body = {
      email: form.email.value.trim(),
      password: form.password.value,
    };
    if (mode === "register") body.name = form.name.value.trim();

    const data = await api(`/auth/${mode}`, { method: "POST", body });
    store.token = data.token;
    store.user = data.user;
    window.location.href = "dashboard.html";
  } catch (err) {
    toast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

applyMode();
