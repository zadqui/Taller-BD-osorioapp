/* =====================================================================
   Transportadora Osorio · Lógica de la interfaz (prototipo)
   Las funciones de la sección "CAPA DE DATOS" replican en memoria los
   triggers y procedimientos de bd_transporte. Al conectar el backend,
   cada una debe sustituirse por una llamada a la API equivalente:
     registrarMercancia  -> INSERT mercancia (trg_mercancia_bi / ai)
     asignarMercancia    -> CALL sp_asignar_mercancia_viaje
     despacharViaje      -> CALL sp_despachar_viaje
     actualizarEstado    -> CALL sp_actualizar_estado_mercancia
   ===================================================================== */

const db = structuredClone(SEED);

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const now = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
const fmtDate = (s) => { if (!s) return "—"; const d = new Date(s.replace(" ", "T")); return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }); };
const fmtDateTime = (s) => { if (!s) return "—"; const d = new Date(s.replace(" ", "T")); return d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };
const kg = (n) => `${Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
const pct = (n) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} %`;

const by = (arr, key, val) => arr.find((r) => r[key] === val);
const cliente = (id) => by(db.cliente, "id_cliente", id);
const loc = (id) => by(db.localidad, "id_localidad", id)?.nombre_localidad ?? "—";
const modEnt = (id) => by(db.modalidad_entrega, "id_modalidad_entrega", id)?.nombre_modalidad ?? "—";
const estM = (id) => by(db.cat_estado_mercancia, "id", id);
const estV = (id) => by(db.cat_estado_viaje, "id", id);
const ruta = (id) => by(db.ruta, "id_ruta", id);
const unidad = (id) => by(db.unidad, "id_unidad", id);
const viaje = (id) => by(db.viaje, "id_viaje", id);
const pill = (e) => `<span class="pill ${e.clase}">${esc(e.nombre)}</span>`;

class DbError extends Error {}
const signal = (msg) => { throw new DbError(msg); };

/* ---------- Vistas SQL ---------- */
// vista_carga_viajes
function cargaViaje(v) {
  const u = unidad(v.id_unidad);
  const carga = db.mercancia.filter((m) => m.id_viaje === v.id_viaje).reduce((s, m) => s + m.peso_mercancia, 0);
  return { carga_kg: carga, capacidad_kg: u.capacidad_toneladas * 1000, porcentaje: Math.round((carga / 1000 / u.capacidad_toneladas) * 10000) / 100 };
}
// vista_mercancia_en_espera
const enEspera = () => db.mercancia.filter((m) => m.id_viaje === null && m.id_estado_mercancia === 1);

/* =====================================================================
   CAPA DE DATOS (simulación de triggers y procedimientos)
   ===================================================================== */
function registrarMovimiento(m, obs) {
  const id = Math.max(0, ...db.movimiento_mercancia.map((x) => x.id_movimiento)) + 1;
  db.movimiento_mercancia.push({ id_movimiento: id, id_mercancia: m.id_mercancia, id_estado_mercancia: m.id_estado_mercancia, fecha_hora: now(), ubicacion: m.ubicacion_actual, observacion: obs });
}

// trg_mercancia_bu_validar_asignacion + trg_mercancia_au_registrar_movimiento
function updateMercancia(m, cambios) {
  const NEW = { ...m, ...cambios };
  if (NEW.id_viaje === null && NEW.id_estado_mercancia !== 1) signal("La mercancía sin viaje asignado debe permanecer En espera.");
  if (NEW.id_viaje !== null) {
    if (NEW.id_estado_mercancia === 1) signal("La mercancía asignada a un viaje no puede conservar el estado En espera.");
    if (NEW.id_viaje !== m.id_viaje && viaje(NEW.id_viaje).id_estado_viaje !== 1) signal("No se puede cambiar la carga de un viaje que ya fue despachado.");
    if ([3, 4].includes(NEW.id_estado_mercancia) && viaje(NEW.id_viaje).id_estado_viaje === 1) signal("No se puede avanzar el estado: primero debe despacharse el viaje.");
  }
  const cambio = NEW.id_estado_mercancia !== m.id_estado_mercancia || NEW.ubicacion_actual !== m.ubicacion_actual;
  Object.assign(m, cambios);
  if (cambio) registrarMovimiento(m, "Actualización del estado o ubicación.");
}

function generarCodigo() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = (n) => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join("");
  let code; do { code = `OSO-${r(4)}-${r(4)}`; } while (db.mercancia.some((m) => m.codigo_seguimiento === code));
  return code;
}

// INSERT mercancia -> trg_mercancia_bi_validar_asignacion + trg_mercancia_ai_registrar_movimiento
function registrarMercancia(d) {
  if (!(d.peso_mercancia > 0)) signal("El peso debe ser mayor que 0 (chk_mercancia_peso_positivo).");
  const m = {
    id_mercancia: Math.max(0, ...db.mercancia.map((x) => x.id_mercancia)) + 1,
    id_viaje: null, id_estado_mercancia: 1, codigo_seguimiento: generarCodigo(), fecha_registro: now(),
    tipo_mercancia: "No peligrosa", ...d,
  };
  db.mercancia.push(m);
  db.movimiento_mercancia.push({ id_movimiento: Math.max(0, ...db.movimiento_mercancia.map((x) => x.id_movimiento)) + 1, id_mercancia: m.id_mercancia, id_estado_mercancia: 1, fecha_hora: m.fecha_registro, ubicacion: m.ubicacion_actual, observacion: "Registro inicial de la mercancía." });
  return m;
}

// CALL sp_asignar_mercancia_viaje
function asignarMercancia(idM, idV, ubicacion) {
  const v = viaje(idV); if (!v) signal("El viaje indicado no existe.");
  if (v.id_estado_viaje !== 1) signal("Solo se puede asignar mercancía a un viaje programado.");
  const m = by(db.mercancia, "id_mercancia", idM); if (!m) signal("La mercancía indicada no existe.");
  if (m.id_viaje !== null || m.id_estado_mercancia !== 1) signal("Solo se puede asignar mercancía que esté en espera y sin viaje.");
  const { carga_kg, capacidad_kg } = cargaViaje(v);
  if (carga_kg + m.peso_mercancia > capacidad_kg) signal("La asignación supera la capacidad de la unidad.");
  updateMercancia(m, { id_viaje: idV, id_estado_mercancia: 2, ubicacion_actual: ubicacion });
}

// CALL sp_despachar_viaje -> trg_viaje_bu_validar_despacho + trg_viaje_au_actualizar_mercancias
function despacharViaje(idV) {
  const v = viaje(idV); if (!v) signal("El viaje indicado no existe.");
  if (v.id_estado_viaje !== 1) signal("Solo se puede despachar un viaje programado.");
  const { carga_kg, capacidad_kg } = cargaViaje(v);
  if (carga_kg === 0) signal("No se puede despachar un viaje sin mercancía asignada.");
  if (carga_kg > capacidad_kg) signal("La carga supera la capacidad de la unidad.");
  if (carga_kg < capacidad_kg / 2) signal("La carga es inferior al 50 por ciento de la capacidad.");
  v.id_estado_viaje = 2; v.fecha_salida = now();
  db.mercancia.filter((m) => m.id_viaje === idV && m.id_estado_mercancia !== 4).forEach((m) => updateMercancia(m, { id_estado_mercancia: 3, ubicacion_actual: "En ruta" }));
}

// CALL sp_actualizar_estado_mercancia
function actualizarEstado(idM, nombreEstado, ubicacion) {
  const e = db.cat_estado_mercancia.find((x) => x.nombre === nombreEstado); if (!e) signal("El estado de mercancía indicado no existe en el catálogo.");
  const m = by(db.mercancia, "id_mercancia", idM); if (!m) signal("La mercancía indicada no existe.");
  updateMercancia(m, { id_estado_mercancia: e.id, ubicacion_actual: ubicacion });
}

function registrarCliente(d) {
  if (!d.nombre_cliente?.trim()) signal("El nombre del cliente es obligatorio.");
  const c = { id_cliente: Math.max(0, ...db.cliente.map((x) => x.id_cliente)) + 1, nombre_cliente: d.nombre_cliente.trim(), telefono_cliente: d.telefono_cliente?.trim() || null };
  db.cliente.push(c); return c;
}

function programarViaje(d) {
  if (!d.fecha_programada) signal("La fecha programada es obligatoria.");
  const v = { id_viaje: Math.max(0, ...db.viaje.map((x) => x.id_viaje)) + 1, id_estado_viaje: 1, fecha_salida: null, ...d };
  db.viaje.push(v); return v;
}

/* =====================================================================
   ICONOS
   ===================================================================== */
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* =====================================================================
   UI: notificaciones, modal, drawer
   ===================================================================== */
function toast(msg, type = "ok", sub = "") {
  const t = document.createElement("div");
  t.className = `toast glass ${type}`;
  t.innerHTML = `${icon(type === "ok" ? "check" : "alert")}<div>${esc(msg)}${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
  $("#toasts").append(t);
  setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 4200);
}

function run(fn, okMsg) {
  try { fn(); if (okMsg) toast(okMsg); render(); return true; }
  catch (e) { if (e instanceof DbError) { toast(e.message, "err", "SQLSTATE 45000 · regla de negocio"); return false; } throw e; }
}

function openOverlay(html, drawer = false) {
  closeOverlay();
  const o = document.createElement("div");
  o.className = `overlay${drawer ? " drawer-overlay" : ""}`;
  o.id = "overlay";
  o.innerHTML = `<div class="${drawer ? "drawer" : "modal"} glass" role="dialog" aria-modal="true">${html}</div>`;
  o.addEventListener("click", (e) => { if (e.target === o || e.target.closest("[data-close]")) closeOverlay(); });
  document.body.append(o);
  return o;
}
const closeOverlay = () => $("#overlay")?.remove();
document.addEventListener("keydown", (e) => e.key === "Escape" && closeOverlay());

/* =====================================================================
   VISTAS
   ===================================================================== */
const ui = { filtroEstado: 0, busqueda: "", rastreo: "" };

const routes = {
  panel:     { title: "Panel", sub: "Resumen de la operación", icon: "home", view: vPanel },
  espera:    { title: "Mercancía en espera", sub: "CU-03 · pendiente de asignación a viaje", icon: "clock", view: vEspera },
  viajes:    { title: "Viajes", sub: "CU-04 · programar y despachar", icon: "truck", view: vViajes },
  envios:    { title: "Envíos", sub: "CU-05 · estado y entrega de mercancía", icon: "box", view: vEnvios },
  recepcion: { title: "Registrar recepción", sub: "CU-02 · alta de mercancía en bodega", icon: "plus", view: vRecepcion },
  clientes:  { title: "Clientes", sub: "CU-01 · registro de clientes", icon: "users", view: vClientes },
  catalogos: { title: "Flota y catálogos", sub: "Unidades, rutas y localidades", icon: "layers", view: vCatalogos },
  reportes:  { title: "Reportes", sub: "CU-06 · reportes operativos", icon: "chart", view: vReportes, soon: true },
  rastreo:   { title: "Rastreo de envío", sub: "CU-07 · consulta del cliente", icon: "pin", view: vRastreo },
};

function vPanel() {
  const total = db.mercancia.length;
  const porEstado = db.cat_estado_mercancia.map((e) => ({ ...e, n: db.mercancia.filter((m) => m.id_estado_mercancia === e.id).length }));
  const programados = db.viaje.filter((v) => v.id_estado_viaje === 1);
  const cargas = db.viaje.map((v) => ({ v, ...cargaViaje(v) }));
  const pesoEspera = enEspera().reduce((s, m) => s + m.peso_mercancia, 0);
  const ultimos = [...db.movimiento_mercancia].sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora) || b.id_movimiento - a.id_movimiento).slice(0, 6);

  return `
  <div class="grid kpis">
    <div class="glass kpi"><div class="label">Envíos registrados</div><div class="value">${total}</div><div class="sub">${db.cliente.length} clientes</div></div>
    <div class="glass kpi"><div class="label"><i style="background:var(--st-espera)"></i>En espera</div><div class="value">${porEstado[0].n}</div><div class="sub">${kg(pesoEspera)} sin viaje</div></div>
    <div class="glass kpi"><div class="label"><i style="background:var(--st-asignada)"></i>Viajes programados</div><div class="value">${programados.length}</div><div class="sub">de ${db.viaje.length} viajes</div></div>
    <div class="glass kpi"><div class="label"><i style="background:var(--st-transito)"></i>En tránsito</div><div class="value">${porEstado[2].n}</div><div class="sub">${porEstado[3].n} entregados</div></div>
  </div>

  <div class="grid two">
    <section class="glass card">
      <div class="card-head"><div><h2>Ocupación de viajes</h2><p>Se requiere ≥ 50 % de la capacidad para despachar</p></div><a class="btn sm ghost" href="#viajes">Ver viajes</a></div>
      <div class="hbars">
        ${cargas.map(({ v, carga_kg, capacidad_kg, porcentaje }) => `
          <div class="hbar">
            <div class="top"><b>Viaje ${v.id_viaje} · ${esc(unidad(v.id_unidad).matricula)}</b><span>${kg(carga_kg)} / ${kg(capacidad_kg)} · ${pct(porcentaje)}</span></div>
            <div class="meter ${porcentaje >= 50 ? "ok" : ""}"><i style="width:${Math.min(100, porcentaje)}%"></i><span class="mark" title="Mínimo 50 %"></span></div>
          </div>`).join("")}
      </div>
    </section>

    <section class="glass card">
      <div class="card-head"><div><h2>Actividad reciente</h2><p>Historial de movimiento_mercancia</p></div></div>
      <ul class="timeline">
        ${ultimos.map((mv) => { const m = by(db.mercancia, "id_mercancia", mv.id_mercancia), e = estM(mv.id_estado_mercancia); return `
          <li style="color:var(--st-${e.clase})"><span class="dot"></span>
            <div class="t-title" style="color:var(--text)">${esc(e.nombre)} · <span class="mono">${esc(m.codigo_seguimiento)}</span></div>
            <div class="t-sub">${esc(mv.ubicacion)} · ${fmtDateTime(mv.fecha_hora)}</div>
          </li>`; }).join("")}
      </ul>
    </section>
  </div>

  <section class="glass card">
    <div class="card-head"><div><h2>Envíos por estado</h2><p>Distribución actual de la mercancía</p></div></div>
    <div class="hbars">
      ${porEstado.map((e) => `
        <div class="hbar"><div class="top"><b>${esc(e.nombre)}</b><span>${e.n} · ${total ? Math.round((e.n / total) * 100) : 0} %</span></div>
        <div class="bar"><i style="width:${total ? (e.n / total) * 100 : 0}%;background:var(--st-${e.clase})"></i></div></div>`).join("")}
    </div>
  </section>`;
}

function vEspera() {
  const rows = enEspera().filter(matchBusqueda);
  return `
  <div class="toolbar"><span class="muted">${rows.length} envío(s) sin viaje asignado</span><a class="btn primary" href="#recepcion">${icon("plus")}Registrar recepción</a></div>
  <section class="glass card">
    ${rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Código</th><th>Cliente</th><th>Origen → Destino</th><th class="num">Peso</th><th>Entrega</th><th>Ubicación</th><th>Recibido</th><th></th></tr></thead>
      <tbody>${rows.map((m) => `
        <tr>
          <td class="mono">${esc(m.codigo_seguimiento)}</td>
          <td>${esc(cliente(m.id_cliente).nombre_cliente)}</td>
          <td>${esc(loc(m.id_origen))} <span class="faint">→</span> ${esc(loc(m.id_destino))}</td>
          <td class="num">${kg(m.peso_mercancia)}</td>
          <td class="muted">${esc(modEnt(m.id_modalidad_entrega))}</td>
          <td class="muted">${esc(m.ubicacion_actual)}</td>
          <td class="muted">${fmtDateTime(m.fecha_registro)}</td>
          <td><button class="btn sm" data-asignar="${m.id_mercancia}">Asignar a viaje</button></td>
        </tr>`).join("")}</tbody></table></div>`
    : `<div class="empty">${icon("check")}<b>Sin mercancía en espera</b>Toda la mercancía recibida ya tiene viaje.</div>`}
  </section>`;
}

function modalAsignar(idM) {
  const m = by(db.mercancia, "id_mercancia", idM);
  const opciones = db.viaje.filter((v) => v.id_estado_viaje === 1).map((v) => {
    const c = cargaViaje(v), libre = c.capacidad_kg - c.carga_kg;
    return `<option value="${v.id_viaje}">Viaje ${v.id_viaje} · ${esc(ruta(v.id_ruta).nombre_ruta)} · ${esc(unidad(v.id_unidad).matricula)} · libre ${kg(libre)}</option>`;
  }).join("");
  const o = openOverlay(`
    <h3>Asignar a viaje</h3>
    <p><span class="mono">${esc(m.codigo_seguimiento)}</span> · ${kg(m.peso_mercancia)} · ${esc(loc(m.id_origen))} → ${esc(loc(m.id_destino))}</p>
    <form class="form" id="f-asignar">
      <div class="field full"><label>Viaje programado</label><select name="viaje" required>${opciones}</select>
        <div class="hint">Ejecuta sp_asignar_mercancia_viaje: valida estado del viaje y capacidad de la unidad.</div></div>
      <div class="field full"><label>Ubicación</label><input name="ubic" value="${esc(m.ubicacion_actual)}" maxlength="120" required></div>
      <div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Asignar</button></div>
    </form>`);
  $("#f-asignar", o).addEventListener("submit", (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    if (run(() => asignarMercancia(idM, Number(f.get("viaje")), f.get("ubic").trim()), "Mercancía asignada al viaje")) closeOverlay();
  });
}

function vViajes() {
  return `
  <div class="toolbar">
    <div class="note">${icon("info")}<span>Los datos de prueba no alcanzan el 50 % de capacidad: al despachar verás la validación de <span class="mono">sp_despachar_viaje</span>.</span></div>
    <button class="btn primary" data-programar>${icon("plus")}Programar viaje</button>
  </div>
  <div class="grid cards">
    ${db.viaje.map((v) => {
      const u = unidad(v.id_unidad), c = cargaViaje(v), e = estV(v.id_estado_viaje), n = db.mercancia.filter((m) => m.id_viaje === v.id_viaje).length;
      return `
      <article class="glass trip">
        <div class="trip-top"><div><h3>Viaje ${v.id_viaje}</h3><p>${esc(ruta(v.id_ruta).nombre_ruta)}</p></div>${pill(e)}</div>
        <div>
          <div class="meter ${c.porcentaje >= 50 ? "ok" : ""}"><i style="width:${Math.min(100, c.porcentaje)}%"></i><span class="mark"></span></div>
          <div class="meter-legend" style="margin-top:8px"><span>${kg(c.carga_kg)}</span><span>${pct(c.porcentaje)} de ${u.capacidad_toneladas} t</span></div>
        </div>
        <div class="trip-meta">
          <div><span>Unidad</span>${esc(u.matricula)} · ${esc(u.tipo_unidad)}</div>
          <div><span>Envíos</span>${n}</div>
          <div><span>Programado</span>${fmtDate(v.fecha_programada)}</div>
          <div><span>Salida</span>${v.fecha_salida ? fmtDateTime(v.fecha_salida) : "—"}</div>
        </div>
        <div class="trip-actions">
          <button class="btn sm primary" data-despachar="${v.id_viaje}" ${v.id_estado_viaje !== 1 ? "disabled" : ""}>${icon("send")}Despachar</button>
          <button class="btn sm ghost" disabled title="Pendiente: no existe procedimiento para finalizar viajes">Finalizar</button>
          <button class="btn sm ghost" disabled title="Pendiente: no existe procedimiento para cancelar viajes">Cancelar</button>
        </div>
      </article>`; }).join("")}
  </div>`;
}

function modalProgramar() {
  const o = openOverlay(`
    <h3>Programar viaje</h3><p>El viaje se crea en estado <b>Programado</b>.</p>
    <form class="form" id="f-viaje">
      <div class="field full"><label>Ruta</label><select name="ruta">${db.ruta.map((r) => `<option value="${r.id_ruta}">${esc(r.nombre_ruta)}</option>`).join("")}</select></div>
      <div class="field"><label>Unidad</label><select name="unidad">${db.unidad.map((u) => `<option value="${u.id_unidad}">${esc(u.matricula)} · ${u.capacidad_toneladas} t</option>`).join("")}</select></div>
      <div class="field"><label>Fecha programada</label><input type="date" name="fecha" required></div>
      <div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Programar</button></div>
    </form>`);
  $("#f-viaje", o).addEventListener("submit", (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    if (run(() => programarViaje({ id_ruta: Number(f.get("ruta")), id_unidad: Number(f.get("unidad")), fecha_programada: f.get("fecha") }), "Viaje programado")) closeOverlay();
  });
}

function matchBusqueda(m) {
  const q = ui.busqueda.trim().toLowerCase(); if (!q) return true;
  return [m.codigo_seguimiento, cliente(m.id_cliente).nombre_cliente, loc(m.id_origen), loc(m.id_destino)].some((s) => s.toLowerCase().includes(q));
}

function vEnvios() {
  const rows = db.mercancia.filter((m) => (!ui.filtroEstado || m.id_estado_mercancia === ui.filtroEstado) && matchBusqueda(m));
  return `
  <div class="toolbar">
    <div class="segmented">
      <button data-filtro="0" class="${!ui.filtroEstado ? "on" : ""}">Todos</button>
      ${db.cat_estado_mercancia.map((e) => `<button data-filtro="${e.id}" class="${ui.filtroEstado === e.id ? "on" : ""}">${esc(e.nombre)}</button>`).join("")}
    </div>
    <button class="btn ghost" disabled title="Pendiente">${icon("file")}Exportar</button>
  </div>
  <section class="glass card">
    ${rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Código</th><th>Cliente</th><th>Ruta</th><th class="num">Peso</th><th>Cobro</th><th>Viaje</th><th>Estado</th><th>Ubicación</th></tr></thead>
      <tbody>${rows.map((m) => `
        <tr class="clickable" data-envio="${m.id_mercancia}">
          <td class="mono">${esc(m.codigo_seguimiento)}</td>
          <td>${esc(cliente(m.id_cliente).nombre_cliente)}</td>
          <td>${esc(loc(m.id_origen))} <span class="faint">→</span> ${esc(loc(m.id_destino))}</td>
          <td class="num">${kg(m.peso_mercancia)}</td>
          <td class="muted">${esc(m.modalidad_cobro)}</td>
          <td class="muted">${m.id_viaje ? `#${m.id_viaje}` : "—"}</td>
          <td>${pill(estM(m.id_estado_mercancia))}</td>
          <td class="muted">${esc(m.ubicacion_actual)}</td>
        </tr>`).join("")}</tbody></table></div>`
    : `<div class="empty">${icon("search")}<b>Sin resultados</b>Prueba con otro filtro o búsqueda.</div>`}
  </section>`;
}

function timelineHtml(idM) {
  const movs = db.movimiento_mercancia.filter((x) => x.id_mercancia === idM).sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora) || b.id_movimiento - a.id_movimiento);
  return `<ul class="timeline">${movs.map((mv) => { const e = estM(mv.id_estado_mercancia); return `
    <li style="color:var(--st-${e.clase})"><span class="dot"></span>
      <div class="t-title" style="color:var(--text)">${esc(e.nombre)}</div>
      <div class="t-sub">${esc(mv.ubicacion)} · ${fmtDateTime(mv.fecha_hora)}</div>
      ${mv.observacion ? `<div class="t-sub faint">${esc(mv.observacion)}</div>` : ""}
    </li>`; }).join("")}</ul>`;
}

const stepsHtml = (estado) => `<div class="steps">${db.cat_estado_mercancia.map((e) => `<div class="${e.id <= estado ? "done" : ""}"><i></i>${esc(e.nombre)}</div>`).join("")}</div>`;

function drawerEnvio(idM) {
  const m = by(db.mercancia, "id_mercancia", idM), c = cliente(m.id_cliente), v = m.id_viaje ? viaje(m.id_viaje) : null;
  const puedeEntregar = m.id_estado_mercancia === 3;
  const o = openOverlay(`
    <div class="card-head" style="margin:0"><div><span class="mono muted">${esc(m.codigo_seguimiento)}</span><h3>${esc(loc(m.id_origen))} → ${esc(loc(m.id_destino))}</h3></div><button class="btn icon ghost" data-close aria-label="Cerrar">${icon("x")}</button></div>
    ${stepsHtml(m.id_estado_mercancia)}
    <div class="kv">
      <div><span>Cliente</span>${esc(c.nombre_cliente)}</div>
      <div><span>Teléfono</span>${esc(c.telefono_cliente ?? "—")}</div>
      <div><span>Peso</span>${kg(m.peso_mercancia)}</div>
      <div><span>Tipo</span>${esc(m.tipo_mercancia)}</div>
      <div><span>Entrega</span>${esc(modEnt(m.id_modalidad_entrega))}</div>
      <div><span>Cobro</span>${esc(m.modalidad_cobro)}</div>
      <div><span>Viaje</span>${v ? `#${v.id_viaje} · ${esc(unidad(v.id_unidad).matricula)}` : "Sin asignar"}</div>
      <div><span>Ubicación actual</span>${esc(m.ubicacion_actual)}</div>
    </div>
    <p class="section-title">Actualizar estado</p>
    <form class="form" id="f-estado" style="margin-bottom:24px">
      <div class="field"><label>Estado</label><select name="estado">${db.cat_estado_mercancia.map((e) => `<option ${e.id === m.id_estado_mercancia ? "selected" : ""}>${esc(e.nombre)}</option>`).join("")}</select></div>
      <div class="field"><label>Ubicación</label><input name="ubic" value="${esc(m.ubicacion_actual)}" maxlength="120" required></div>
      <div class="form-actions">
        ${puedeEntregar ? `<button type="button" class="btn" id="b-entregar">${icon("check")}Registrar entrega</button>` : ""}
        <button class="btn primary">Guardar</button>
      </div>
    </form>
    <p class="section-title">Movimientos</p>
    ${timelineHtml(idM)}`, true);
  const reopen = () => drawerEnvio(idM);
  $("#f-estado", o).addEventListener("submit", (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    if (run(() => actualizarEstado(idM, f.get("estado"), f.get("ubic").trim()), "Estado actualizado")) reopen();
  });
  $("#b-entregar", o)?.addEventListener("click", () => { if (run(() => actualizarEstado(idM, "Entregada", `Destino ${loc(m.id_destino)}`), "Entrega registrada")) reopen(); });
}

function vRecepcion() {
  const opts = (arr, k, l) => arr.map((r) => `<option value="${r[k]}">${esc(r[l])}</option>`).join("");
  return `
  <section class="glass card" style="max-width:820px">
    <div class="card-head"><div><h2>Datos de la mercancía</h2><p>Se registra <b>En espera</b> y sin viaje. El código de seguimiento se genera automáticamente.</p></div></div>
    <form class="form" id="f-recepcion">
      <div class="field full"><label>Cliente</label><select name="cliente" required>${opts(db.cliente, "id_cliente", "nombre_cliente")}</select>
        <div class="hint">¿Cliente nuevo? <a href="#clientes">Regístralo primero</a>.</div></div>
      <div class="field"><label>Origen</label><select name="origen">${opts(db.localidad, "id_localidad", "nombre_localidad")}</select></div>
      <div class="field"><label>Destino</label><select name="destino">${opts(db.localidad, "id_localidad", "nombre_localidad")}</select></div>
      <div class="field"><label>Peso (kg)</label><input name="peso" type="number" min="0.01" step="0.01" required placeholder="0.00"></div>
      <div class="field"><label>Tipo de mercancía</label><input name="tipo" value="No peligrosa" readonly><div class="hint">El servicio solo transporta mercancía no peligrosa.</div></div>
      <div class="field"><label>Modalidad de entrega</label><select name="modalidad">${opts(db.modalidad_entrega, "id_modalidad_entrega", "nombre_modalidad")}</select></div>
      <div class="field"><label>Modalidad de cobro</label><select name="cobro">${db.modalidad_cobro.map((c) => `<option>${esc(c)}</option>`).join("")}</select><div class="hint">Solo informativa: no se registran pagos.</div></div>
      <div class="field full"><label>Ubicación de recepción</label><select name="ubic"><option>Bodega Cancun</option><option>Bodega Campeche</option></select></div>
      <div class="form-actions"><button type="reset" class="btn ghost">Limpiar</button><button class="btn primary">Registrar mercancía</button></div>
    </form>
  </section>`;
}

function vClientes() {
  const q = ui.busqueda.trim().toLowerCase();
  const rows = db.cliente.filter((c) => !q || c.nombre_cliente.toLowerCase().includes(q) || (c.telefono_cliente ?? "").includes(q));
  return `
  <div class="grid two">
    <section class="glass card">
      <div class="card-head"><div><h2>Clientes</h2><p>${db.cliente.length} registrados</p></div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Nombre</th><th>Teléfono</th><th class="num">Envíos</th><th></th></tr></thead>
        <tbody>${rows.map((c) => `
          <tr><td class="muted">${c.id_cliente}</td><td>${esc(c.nombre_cliente)}</td><td class="muted mono">${esc(c.telefono_cliente ?? "—")}</td>
          <td class="num">${db.mercancia.filter((m) => m.id_cliente === c.id_cliente).length}</td>
          <td><button class="btn sm ghost" disabled title="Pendiente: edición de clientes">Editar</button></td></tr>`).join("")}</tbody>
      </table></div>
    </section>
    <section class="glass card" style="align-self:start">
      <div class="card-head"><div><h2>Nuevo cliente</h2><p>CU-01 · registrar cliente</p></div></div>
      <form class="form" id="f-cliente">
        <div class="field full"><label>Nombre completo</label><input name="nombre" maxlength="100" required></div>
        <div class="field full"><label>Teléfono</label><input name="tel" maxlength="15" inputmode="tel" pattern="[0-9+ ]{7,15}" placeholder="9991234567"></div>
        <div class="form-actions"><button class="btn primary">Registrar cliente</button></div>
      </form>
    </section>
  </div>`;
}

function vCatalogos() {
  return `
  <section class="glass card">
    <div class="card-head"><div><h2>Unidades</h2><p>Flota registrada · matrículas ECO ficticias de demostración</p></div><button class="btn sm ghost" disabled title="Pendiente">${icon("plus")}Agregar unidad</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Matrícula</th><th>Tipo</th><th class="num">Capacidad</th><th class="num">Mínimo para salir</th><th class="num">Viajes</th></tr></thead>
      <tbody>${db.unidad.map((u) => `<tr><td class="mono">${esc(u.matricula)}</td><td>${esc(u.tipo_unidad)}</td><td class="num">${u.capacidad_toneladas} t</td><td class="num muted">${u.capacidad_toneladas / 2} t</td><td class="num">${db.viaje.filter((v) => v.id_unidad === u.id_unidad).length}</td></tr>`).join("")}</tbody>
    </table></div>
  </section>
  <div class="grid two">
    <section class="glass card"><div class="card-head"><div><h2>Rutas</h2></div></div>
      <div class="table-wrap"><table><tbody>${db.ruta.map((r) => `<tr><td class="muted">${r.id_ruta}</td><td>${esc(r.nombre_ruta)}</td><td class="num">${db.viaje.filter((v) => v.id_ruta === r.id_ruta).length} viajes</td></tr>`).join("")}</tbody></table></div>
    </section>
    <section class="glass card"><div class="card-head"><div><h2>Localidades y modalidades</h2></div></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">${db.localidad.map((l) => `<span class="pill neutral">${esc(l.nombre_localidad)}</span>`).join("")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${db.modalidad_entrega.map((m) => `<span class="pill asignada" title="${esc(m.descripcion)}">${esc(m.nombre_modalidad)}</span>`).join("")}</div>
    </section>
  </div>`;
}

function vReportes() {
  const items = [
    ["Viajes por periodo", "Viajes programados, despachados y finalizados por rango de fechas."],
    ["Mercancía en espera por bodega", "Peso acumulado por bodega y destino para planear salidas."],
    ["Ocupación de unidades", "Porcentaje de capacidad usado por unidad y ruta."],
    ["Envíos por cliente", "Historial y estado de los envíos de cada cliente."],
    ["Modalidades de cobro", "Distribución de envíos por modalidad de cobro (informativo)."],
    ["Exportar a PDF / Excel", "Descarga de cualquier reporte para su impresión."],
  ];
  return `
  <div class="note">${icon("info")}<span>Módulo pendiente. Se muestran los reportes planeados en el anteproyecto (actividad 8). Requiere conexión con la base de datos.</span></div>
  <div class="grid cards">${items.map(([t, d]) => `
    <article class="glass card soon-card"><span class="tag">Próximamente</span><h2 style="font-size:14.5px;margin:12px 0 4px">${t}</h2><p class="muted" style="margin:0">${d}</p><div class="skeleton"></div></article>`).join("")}
  </div>`;
}

function vRastreo() {
  const code = ui.rastreo.trim().toUpperCase();
  const m = code ? db.mercancia.find((x) => x.codigo_seguimiento === code) : null;
  let result = "";
  if (code && !m) result = `<section class="glass card"><div class="empty">${icon("search")}<b>No encontramos ese código</b>Verifica el código de seguimiento de tu comprobante.</div></section>`;
  if (m) {
    const e = estM(m.id_estado_mercancia);
    result = `
    <section class="glass card" style="max-width:720px;margin:0 auto;width:100%">
      <div class="card-head"><div><span class="mono muted">${esc(m.codigo_seguimiento)}</span><h2 style="font-size:20px;margin-top:2px">${esc(loc(m.id_origen))} → ${esc(loc(m.id_destino))}</h2></div>${pill(e)}</div>
      ${stepsHtml(m.id_estado_mercancia)}
      <div class="kv"><div><span>Ubicación actual</span>${esc(m.ubicacion_actual)}</div><div><span>Entrega</span>${esc(modEnt(m.id_modalidad_entrega))}</div><div><span>Peso</span>${kg(m.peso_mercancia)}</div><div><span>Recibido</span>${fmtDate(m.fecha_registro)}</div></div>
      <p class="section-title">Movimientos</p>
      ${timelineHtml(m.id_mercancia)}
    </section>`;
  }
  return `
  <section class="glass track-hero">
    <h2>¿Dónde está mi envío?</h2>
    <p>Ingresa tu código de seguimiento para ver el estado y los movimientos.</p>
    <form class="track-form" id="f-rastreo"><input name="code" placeholder="OSO-XXXX-XXXX" value="${esc(code)}" maxlength="30" autocomplete="off" aria-label="Código de seguimiento"><button class="btn primary">${icon("search")}Rastrear</button></form>
    <div class="chips"><span class="faint" style="font-size:11.5px">Prueba:</span>${db.mercancia.slice(0, 3).map((x) => `<button class="chip mono" data-code="${esc(x.codigo_seguimiento)}">${esc(x.codigo_seguimiento)}</button>`).join("")}</div>
  </section>
  ${result}`;
}

/* =====================================================================
   ENRUTADOR Y EVENTOS
   ===================================================================== */
const current = () => (routes[location.hash.slice(1)] ? location.hash.slice(1) : "panel");

function renderNav() {
  const groups = [["Operación", ["panel", "espera", "viajes", "envios", "recepcion"]], ["Administración", ["clientes", "catalogos", "reportes"]], ["Clientes", ["rastreo"]]];
  $("#nav").innerHTML = groups.map(([g, keys]) => `<div class="nav-label">${g}</div>` + keys.map((k) => {
    const r = routes[k], badge = k === "espera" ? enEspera().length : null;
    return `<a href="#${k}" class="${current() === k ? "active" : ""}">${icon(r.icon)}${r.title}${r.soon ? '<span class="soon">Pronto</span>' : badge ? `<span class="soon">${badge}</span>` : ""}</a>`;
  }).join("")).join("");
}

function render() {
  const k = current(), r = routes[k];
  $("#title").textContent = r.title;
  $("#subtitle").textContent = r.sub;
  $("#view").innerHTML = `<div class="view">${r.view()}</div>`;
  $("#search-box").style.visibility = ["espera", "envios", "clientes"].includes(k) ? "visible" : "hidden";
  renderNav();
  document.title = `${r.title} · Transportadora Osorio`;
}

window.addEventListener("hashchange", () => { ui.busqueda = ""; $("#search").value = ""; $(".sidebar").classList.remove("open"); render(); window.scrollTo(0, 0); });
$("#search").addEventListener("input", (e) => { ui.busqueda = e.target.value; render(); $("#search").focus(); });
$("#menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#theme").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("oso-theme", document.documentElement.dataset.theme); } catch {}
});

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-asignar],[data-despachar],[data-programar],[data-filtro],[data-envio],[data-code]");
  if (!t) return;
  if (t.dataset.asignar) modalAsignar(Number(t.dataset.asignar));
  else if (t.dataset.despachar) run(() => despacharViaje(Number(t.dataset.despachar)), "Viaje despachado: mercancía en tránsito");
  else if (t.hasAttribute("data-programar")) modalProgramar();
  else if (t.dataset.filtro !== undefined) { ui.filtroEstado = Number(t.dataset.filtro); render(); }
  else if (t.dataset.envio) drawerEnvio(Number(t.dataset.envio));
  else if (t.dataset.code) { ui.rastreo = t.dataset.code; render(); }
});

document.addEventListener("submit", (e) => {
  const f = new FormData(e.target);
  if (e.target.id === "f-recepcion") {
    e.preventDefault();
    let nuevo;
    if (run(() => { nuevo = registrarMercancia({ id_cliente: Number(f.get("cliente")), id_origen: Number(f.get("origen")), id_destino: Number(f.get("destino")), peso_mercancia: Number(f.get("peso")), tipo_mercancia: f.get("tipo"), id_modalidad_entrega: Number(f.get("modalidad")), modalidad_cobro: f.get("cobro"), ubicacion_actual: f.get("ubic") }); }))
      toast("Mercancía registrada", "ok", `Código de seguimiento: ${nuevo.codigo_seguimiento}`);
  } else if (e.target.id === "f-cliente") {
    e.preventDefault();
    run(() => registrarCliente({ nombre_cliente: f.get("nombre"), telefono_cliente: f.get("tel") }), "Cliente registrado");
  } else if (e.target.id === "f-rastreo") {
    e.preventDefault(); ui.rastreo = f.get("code"); render();
  }
});

try { const t = localStorage.getItem("oso-theme"); if (t) document.documentElement.dataset.theme = t; } catch {}
$("#menu").innerHTML = icon("menu");
$("#theme").innerHTML = icon("moon");
$("#search-icon").outerHTML = icon("search");
render();
