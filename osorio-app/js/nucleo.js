/* =====================================================================
   Transportadora Osorio · Núcleo compartido del frontend
   - Cliente de la API (api/index.php)
   - Datos cargados del servidor y búsquedas sobre ellos
   - Utilidades de interfaz
   Las reglas de negocio viven en MySQL (triggers y procedimientos);
   aquí solo se muestran sus mensajes.
   ===================================================================== */

const API = "api/index.php";
let CSRF = "";
let db = null;

class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

async function api(ruta, { metodo = "GET", datos = null, params = {} } = {}) {
  const url = `${API}?${new URLSearchParams({ r: ruta, ...params })}`;
  const opciones = { method: metodo, credentials: "same-origin", headers: { Accept: "application/json" } };
  if (metodo !== "GET") {
    opciones.headers["Content-Type"] = "application/json";
    opciones.headers["X-CSRF-Token"] = CSRF;
    opciones.body = JSON.stringify(datos ?? {});
  }
  if (location.protocol === "file:") {
    throw new ApiError("Esta página se abrió con doble clic. El sistema debe abrirse desde el servidor (una dirección que empiece con http:// o https://).", 0);
  }
  let res;
  try { res = await fetch(url, opciones); }
  catch { throw new ApiError("No hay conexión con el servidor. Revisa tu internet.", 0); }
  let cuerpo = {};
  try { cuerpo = await res.json(); } catch {}
  if (!res.ok) throw new ApiError(cuerpo.error || "Ocurrió un error. Intenta de nuevo.", res.status);
  return cuerpo;
}

/* ---------- Sesión ---------- */
async function obtenerSesion() {
  const r = await api("sesion");
  if (!r.usuario) return null;
  CSRF = r.csrf;
  return r.usuario;
}
async function cerrarSesion() {
  try { await api("logout", { metodo: "POST" }); } catch {}
  location.href = "login.html";
}

/* ---------- Datos del panel ---------- */
const CLASE_MERCANCIA = { 1: "espera", 2: "asignada", 3: "transito", 4: "entregada" };
const CLASE_VIAJE = { 1: "asignada", 2: "transito", 3: "entregada", 4: "neutral" };
const ICONO_ESTADO = { 1: "clock", 2: "route", 3: "truck", 4: "package-check" };

async function cargarDatos() {
  const r = await api("datos");
  db = r.datos;
  db.cat_estado_mercancia.forEach((e) => (e.clase = CLASE_MERCANCIA[e.id]));
  db.cat_estado_viaje.forEach((e) => (e.clase = CLASE_VIAJE[e.id]));
  db.ruta.forEach((r) => (r.corto = r.nombre.replace(/^Ruta\s+/i, "").replace(/\s*\(.*\)$/, "")));
  return db;
}

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Fechas sin hora (DATE) se leen como hora local, no UTC, para no recorrer el día
const aFecha = (s) => { const t = String(s); return new Date(t.length === 10 ? `${t}T00:00:00` : t.replace(" ", "T")); };
const fFecha = (s) => s ? aFecha(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fCorta = (s) => s ? aFecha(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
const fFechaHora = (s) => s ? aFecha(s).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const fHora = (s) => aFecha(s).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
const kg = (n) => `${Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
const ilus = (n) => `assets/ilustraciones/${n}.svg`;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const porId = (tabla, id) => db[tabla].find((r) => r.id === id);
const cliente = (id) => porId("cliente", id);
const loc = (id) => porId("localidad", id)?.nombre ?? "—";
const bodega = (id) => porId("bodega", id);
const modEnt = (id) => porId("modalidad_entrega", id)?.nombre ?? "—";
const modCob = (id) => porId("modalidad_cobro", id)?.nombre ?? "—";
const estM = (id) => porId("cat_estado_mercancia", id);
const estV = (id) => porId("cat_estado_viaje", id);
const ruta = (id) => porId("ruta", id);
const unidad = (id) => porId("unidad", id);
const tipoU = (id) => porId("cat_tipo_unidad", id);
const viaje = (id) => porId("viaje", id);
const mercancia = (id) => porId("mercancia", id);
const paradas = (idRuta) => db.ruta_localidad.filter((r) => r.id_ruta === idRuta).sort((a, b) => a.orden - b.orden).map((r) => loc(r.id_localidad));
const enEspera = () => db.mercancia.filter((m) => m.id_viaje === null && m.id_estado === 1);

// Equivalente a vista_carga_viajes
function cargaViaje(v) {
  const u = unidad(v.id_unidad);
  const carga = db.mercancia.filter((m) => m.id_viaje === v.id).reduce((s, m) => s + m.peso, 0);
  const capacidad = u.capacidad_toneladas * 1000;
  const aplicaMinimo = tipoU(u.id_tipo_unidad).aplica_minimo_carga;
  const minimo = aplicaMinimo ? capacidad / 2 : 0;
  return { carga, capacidad, minimo, aplicaMinimo, porcentaje: capacidad ? (carga / capacidad) * 100 : 0, listo: carga > 0 && carga >= minimo && carga <= capacidad };
}

/* ---------- Interfaz compartida ---------- */
const ico = (n) => `<i data-lucide="${n}"></i>`;
const pintarIconos = () => window.lucide?.createIcons();
const pill = (e) => `<span class="pill ${e.clase}">${esc(e.nombre)}</span>`;
const pillEstado = (id, nombre) => `<span class="pill ${CLASE_MERCANCIA[id]}">${esc(nombre)}</span>`;
const icoEstado = (id) => `<span class="ico-tile ${CLASE_MERCANCIA[id]}">${ico(ICONO_ESTADO[id])}</span>`;

function toast(msg, tipo = "ok", sub = "") {
  let box = $("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; box.className = "toasts"; box.setAttribute("aria-live", "polite"); document.body.append(box); }
  const t = document.createElement("div");
  t.className = `toast ${tipo}`;
  t.innerHTML = `${ico(tipo === "ok" ? "circle-check" : "triangle-alert")}<div>${esc(msg)}${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
  box.append(t); pintarIconos();
  setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 4500);
}

// Ejecuta una acción contra la API y muestra el resultado
async function ejecutar(fn, okMsg, okSub) {
  try { const r = await fn(); if (okMsg) toast(okMsg, "ok", okSub); return r ?? true; }
  catch (e) {
    if (e.status === 401) { location.href = "login.html"; return false; }
    toast(e.message, "err"); return false;
  }
}

// Evita doble envío mientras la petición está en curso
async function conCarga(boton, fn) {
  if (!boton || boton.disabled) return fn();
  const html = boton.innerHTML; boton.disabled = true; boton.classList.add("cargando");
  try { return await fn(); } finally { boton.disabled = false; boton.classList.remove("cargando"); boton.innerHTML = html; pintarIconos(); }
}

function abrirOverlay(html, hoja = false) {
  cerrarOverlay();
  const o = document.createElement("div");
  o.id = "overlay";
  o.className = `overlay${hoja ? " sheet-overlay" : ""}`;
  o.innerHTML = `<div class="${hoja ? "sheet dark" : "modal"}" role="dialog" aria-modal="true">${html}</div>`;
  o.addEventListener("click", (e) => { if (e.target === o || e.target.closest("[data-cerrar]")) cerrarOverlay(); });
  document.body.append(o); pintarIconos();
  o.querySelector("input:not([type=hidden]),select,button")?.focus({ preventScroll: true });
  return o;
}
const cerrarOverlay = () => $("#overlay")?.remove();
document.addEventListener("keydown", (e) => e.key === "Escape" && cerrarOverlay());

// Progreso punteado: En espera → Asignada → En tránsito → Entregada
const NOMBRES_PASO = ["Recibido", "Asignado", "En camino", "Entregado"];
function trackHtml(idEstado, etiquetas = true) {
  const nodos = [1, 2, 3, 4].map((id, i) => {
    const cls = id < idEstado || idEstado === 4 ? "done" : id === idEstado ? "now" : "";
    const icon = cls === "done" ? "check" : ICONO_ESTADO[id];
    return `${i ? `<span class="seg ${id <= idEstado ? "done" : ""}"></span>` : ""}<span class="node ${cls}">${ico(icon)}</span>`;
  }).join("");
  const labels = etiquetas ? `<div class="track-labels">${NOMBRES_PASO.map((n) => `<span>${n}</span>`).join("")}</div>` : "";
  return `<div class="track">${nodos}</div>${labels}`;
}
