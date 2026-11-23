/* Inicio de sesión y cambio obligatorio de contraseña en el primer ingreso */
const fLogin = $("#f-login"), fCambio = $("#f-cambio");
const error = (form, msg) => { $(".error-text", form).textContent = msg; };

function mostrarCambio(claveTemporal = "") {
  fLogin.hidden = true; fCambio.hidden = false;
  fCambio.actual.value = claveTemporal;
  (claveTemporal ? fCambio.nueva : fCambio.actual).focus();
}

(async () => {
  try {
    const u = await obtenerSesion();
    if (u && !u.debe_cambiar_clave) location.replace("panel.html");
    else if (u) mostrarCambio();
  } catch {}
})();

fLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = fLogin.usuario.value.trim(), clave = fLogin.clave.value;
  if (!usuario || !clave) return error(fLogin, "Escribe tu usuario y contraseña.");
  error(fLogin, "");
  await conCarga($("button.btn", fLogin), async () => {
    try {
      const r = await api("login", { metodo: "POST", datos: { usuario, clave } });
      CSRF = r.csrf;
      if (r.usuario.debe_cambiar_clave) mostrarCambio(clave);
      else location.replace("panel.html");
    } catch (err) {
      error(fLogin, err.message);
      fLogin.clave.select();
    }
  });
});

fCambio.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { actual, nueva, repetir } = Object.fromEntries(new FormData(fCambio));
  if (nueva.length < 10 || !/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return error(fCambio, "La nueva contraseña debe tener al menos 10 caracteres, con letras y números.");
  if (nueva !== repetir) return error(fCambio, "Las contraseñas no coinciden.");
  error(fCambio, "");
  await conCarga($("button.btn", fCambio), async () => {
    try {
      await api("cambiar_clave", { metodo: "POST", datos: { actual, nueva } });
      location.replace("panel.html");
    } catch (err) { error(fCambio, err.message); }
  });
});

$$(".ver-clave").forEach((b) => b.addEventListener("click", () => {
  const input = b.parentElement.querySelector("input"), ver = input.type === "password";
  input.type = ver ? "text" : "password";
  b.innerHTML = ico(ver ? "eye-off" : "eye");
  b.setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña");
  pintarIconos();
}));
pintarIconos();
