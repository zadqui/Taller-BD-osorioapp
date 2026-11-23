/* =====================================================================
   Transportadora Osorio · Panel de operación
   Todos:  Inicio, Recibir, Por asignar, Viajes, Envíos
   Admin:  Clientes, Configuración
   ===================================================================== */

let U = null;                       // usuario en sesión
const ui = { filtroEstado: 0, filtroViaje: 1, busqueda: "", buscarClientes: "" };
const esAdmin = () => U?.rol === "admin";

const SECCIONES = {
  inicio:    { titulo: "Inicio", icono: "house", vista: vInicio },
  recibir:   { titulo: "Recibir", icono: "plus", vista: vRecibir, desc: "Registra la mercancía que llega a bodega." },
  asignar:   { titulo: "Por asignar", icono: "clock", vista: vAsignar, desc: "Envíos en bodega que esperan viaje." },
  viajes:    { titulo: "Viajes", icono: "truck", vista: vViajes, desc: "Programa viajes y despacha las unidades." },
  envios:    { titulo: "Envíos", icono: "package-search", vista: vEnvios, desc: "Busca un envío para ver su estado o registrar la entrega." },
  clientes:  { titulo: "Clientes", icono: "users", vista: vClientes, admin: true },
  config:    { titulo: "Configuración", icono: "settings", vista: vConfig, admin: true, desc: "Unidades, tipos y rutas." },
};
const permitida = (k) => SECCIONES[k] && (!SECCIONES[k].admin || esAdmin());
const actual = () => { const k = location.hash.slice(1); return permitida(k) ? k : "inicio"; };

/* ---------- Piezas reutilizables ---------- */
const filaEnvio = (m) => `
  <button class="row" data-envio="${m.id}">
    ${icoEstado(m.id_estado)}
    <span class="info"><b class="mono">${esc(m.codigo)}</b><small>${esc(cliente(m.id_cliente)?.nombre ?? "")} · ${esc(loc(m.id_destino))}</small></span>
    ${pill(estM(m.id_estado))}
  </button>`;

const coincide = (m) => {
  const q = ui.busqueda.trim().toLowerCase(); if (!q) return true;
  return [m.codigo, cliente(m.id_cliente)?.nombre ?? "", loc(m.id_destino), loc(m.id_origen)].some((s) => s.toLowerCase().includes(q));
};

function estadoCarga(v) {
  const c = cargaViaje(v);
  if (v.id_estado_viaje !== 1) return { txt: v.fecha_salida ? `Salió el ${fFechaHora(v.fecha_salida)}` : estV(v.id_estado_viaje).nombre, cls: "" };
  if (c.carga === 0) return { txt: "Sin carga todavía", cls: "" };
  if (c.carga < c.minimo) return { txt: `Faltan ${kg(c.minimo - c.carga)} para poder salir`, cls: "warn" };
  return { txt: "Listo para salir", cls: "ok" };
}
const medidor = (v) => { const c = cargaViaje(v); return `<div class="meter ${c.listo ? "ok" : ""}"><i style="width:${Math.min(100, c.porcentaje)}%"></i>${c.aplicaMinimo ? '<span class="mark" title="Mínimo para salir"></span>' : ""}</div>`; };
const titulo = (k) => `<div class="p-title"><div><h1>${SECCIONES[k].titulo}</h1>${SECCIONES[k].desc ? `<p>${SECCIONES[k].desc}</p>` : ""}</div></div>`;

/* ---------- Inicio ---------- */
function vInicio() {
  const espera = enEspera().length;
  const listos = db.viaje.filter((v) => v.id_estado_viaje === 1 && cargaViaje(v).listo).length;
  const programados = db.viaje.filter((v) => v.id_estado_viaje === 1).length;
  const hoy = capital(new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
  return `
  <div class="p-title"><div><h1>Hola, ${esc(U.nombre.split(" ")[0])}</h1><p>${esc(hoy)}${U.bodega ? ` · ${esc(U.bodega)}` : ""}</p></div></div>
  <form class="search-pill big" id="f-buscar-inicio" role="search">${ico("search")}<input name="q" placeholder="Buscar envío por código o cliente" autocomplete="off"><button class="btn dark sm">Buscar</button></form>
  <div class="grid g-3">
    <a class="card quick" href="#recibir"><b>Recibir mercancía</b><small>Registrar lo que llega a bodega</small><img src="${ilus("heavy-lifting")}" alt=""></a>
    <a class="card quick" href="#asignar"><span class="quick-num">${espera}</span><b>Por asignar</b><small>${espera === 1 ? "Envío espera viaje" : "Envíos esperan viaje"}</small><img src="${ilus("logistics")}" alt=""></a>
    <a class="card quick" href="#viajes"><span class="quick-num">${listos}</span><b>Listos para salir</b><small>de ${programados} viajes programados</small><img src="${ilus("deliveries")}" alt=""></a>
  </div>
  <section class="card pad">
    <div class="card-head"><h2>Últimos envíos</h2><a class="link" href="#envios">Ver todos</a></div>
    <div class="list">${db.mercancia.slice(0, 5).map(filaEnvio).join("") || `<p class="muted">Aún no hay envíos.</p>`}</div>
  </section>`;
}

/* ---------- Recibir ---------- */
function vRecibir() {
  const opts = (arr, sel) => arr.map((r) => `<option value="${r.id}" ${r.id === sel ? "selected" : ""}>${esc(r.nombre)}</option>`).join("");
  const idBodega = U.id_bodega ?? db.bodega[0]?.id;
  const origen = bodega(idBodega)?.id_localidad;
  return `${titulo("recibir")}
  <section class="card pad form-card">
    <form class="form-grid" id="f-recibir">
      <div class="field full"><label for="r-cliente">Cliente</label>
        <div class="with-btn"><select id="r-cliente" name="cliente" required><option value="">Selecciona un cliente</option>${opts(db.cliente)}</select>
        <button type="button" class="btn" id="nuevo-cliente">${ico("plus")}Nuevo</button></div></div>
      <div class="field"><label for="r-destino">Destino</label><select id="r-destino" name="destino" required>${opcionesDestino(origen)}</select></div>
      <div class="field"><label for="r-peso">Peso (kg)</label><input id="r-peso" name="peso" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0" required></div>
      <div class="field"><label for="r-entrega">Entrega</label><select id="r-entrega" name="entrega">${opts(db.modalidad_entrega)}</select></div>
      <div class="field"><label for="r-cobro">Forma de pago</label><select id="r-cobro" name="cobro">${opts(db.modalidad_cobro)}</select></div>
      <details class="full mas">
        <summary>Más opciones</summary>
        <div class="form-grid" style="margin-top:14px">
          <div class="field"><label for="r-origen">Origen</label><select id="r-origen" name="origen">${opts(db.localidad, origen)}</select></div>
          <div class="field"><label for="r-bodega">Bodega</label><select id="r-bodega" name="bodega">${opts(db.bodega, idBodega)}</select></div>
        </div>
      </details>
      <div class="form-actions"><button class="btn accent btn-lg">Registrar y generar código</button></div>
    </form>
  </section>`;
}

// Solo destinos que atiende alguna ruta y distintos del origen
function opcionesDestino(idOrigen, seleccionado = "") {
  const lista = db.localidad.filter((l) => l.id !== idOrigen && db.ruta_localidad.some((r) => r.id_localidad === l.id));
  return `<option value="">¿A dónde va?</option>${lista.map((l) => `<option value="${l.id}" ${String(l.id) === String(seleccionado) ? "selected" : ""}>${esc(l.nombre)}</option>`).join("")}`;
}

async function enviarRecepcion(form, boton) {
  const f = Object.fromEntries(new FormData(form));
  if (!f.cliente) return toast("Selecciona un cliente.", "err");
  if (!f.destino) return toast("Selecciona el destino.", "err");
  if (!(Number(f.peso) > 0)) return toast("Escribe el peso en kilogramos.", "err");
  const datos = { id_cliente: +f.cliente, id_destino: +f.destino, peso: +f.peso, id_modalidad_entrega: +f.entrega, id_modalidad_cobro: +f.cobro, id_origen: +f.origen, id_bodega: +f.bodega };
  const r = await conCarga(boton, () => ejecutar(() => api("mercancia", { metodo: "POST", datos })));
  if (!r) return;
  await recargar();
  abrirOverlay(`
    <div class="center">
      <img src="${ilus("completed")}" alt="" style="width:160px;margin:0 auto 8px">
      <h3>Mercancía registrada</h3>
      <p class="muted">Entrega este código al cliente para que rastree su envío.</p>
      <div class="codigo-grande mono">${esc(r.codigo)}</div>
      <div class="form-actions center">
        <button class="btn ghost" data-cerrar>Registrar otra</button>
        <button class="btn dark" data-cerrar data-asignar="${r.id}">Asignar a viaje</button>
      </div>
    </div>`);
}

/* ---------- Por asignar ---------- */
function vAsignar() {
  const rows = enEspera();
  return `${titulo("asignar")}
  <section class="card pad">
    ${rows.length ? `<div class="list">${rows.map((m) => `
      <div class="row static">
        ${icoEstado(1)}
        <span class="info"><b class="mono">${esc(m.codigo)}</b><small>${esc(cliente(m.id_cliente)?.nombre ?? "")} · ${esc(loc(m.id_destino))} · ${kg(m.peso)}</small></span>
        <button class="btn sm dark" data-asignar="${m.id}">Asignar</button>
      </div>`).join("")}</div>`
    : `<div class="empty"><img src="${ilus("completed")}" alt=""><b>Todo asignado</b>No hay mercancía esperando viaje.</div>`}
  </section>`;
}

function modalAsignar(idM) {
  const m = mercancia(idM);
  const validos = db.viaje.filter((v) => v.id_estado_viaje === 1 && db.ruta_localidad.some((r) => r.id_ruta === v.id_ruta && r.id_localidad === m.id_destino))
    .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada));
  const o = abrirOverlay(`
    <h3>Asignar a viaje</h3>
    <p><span class="mono">${esc(m.codigo)}</span> · ${esc(loc(m.id_destino))} · ${kg(m.peso)}</p>
    ${validos.length ? `<form id="f-asignar">
      <div class="opciones">${validos.map((v, i) => { const c = cargaViaje(v), libre = c.capacidad - c.carga, cabe = libre >= m.peso; return `
        <label class="opcion ${cabe ? "" : "off"}"><input type="radio" name="viaje" value="${v.id}" ${i === 0 && cabe ? "checked" : ""} ${cabe ? "" : "disabled"}>
          <span><b>${fFecha(v.fecha_programada)} · ${esc(unidad(v.id_unidad).matricula)}</b><small>${cabe ? `Espacio libre: ${kg(libre)}` : "Ya no cabe en este viaje"}</small></span></label>`; }).join("")}</div>
      <div class="form-actions"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button class="btn dark">Asignar</button></div>
    </form>` : `
    <div class="notice">${ico("info")}<span>No hay viajes programados que lleguen a ${esc(loc(m.id_destino))}.</span></div>
    <div class="form-actions"><button class="btn ghost" data-cerrar>Cerrar</button><button class="btn dark" data-programar>Programar viaje</button></div>`}`);
  $("#f-asignar", o)?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idV = Number(new FormData(e.target).get("viaje"));
    if (!idV) return toast("Elige un viaje.", "err");
    const ok = await conCarga($("button.dark", e.target), () => ejecutar(() => api("asignar", { metodo: "POST", datos: { id_mercancia: idM, id_viaje: idV, ubicacion: m.ubicacion } }), "Asignado al viaje"));
    if (ok) { cerrarOverlay(); await recargar(); }
  });
}

/* ---------- Viajes ---------- */
function vViajes() {
  const lista = db.viaje.filter((v) => !ui.filtroViaje || v.id_estado_viaje === ui.filtroViaje)
    .sort((a, b) => ui.filtroViaje === 1 ? a.fecha_programada.localeCompare(b.fecha_programada) : b.fecha_programada.localeCompare(a.fecha_programada));
  return `${titulo("viajes")}
  <div class="toolbar">
    <div class="chips">${[[1, "Programados"], [2, "En camino"], [0, "Todos"]].map(([id, t]) => `<button class="chip-btn ${ui.filtroViaje === id ? "on" : ""}" data-fviaje="${id}">${t}</button>`).join("")}</div>
    <button class="btn accent" data-programar>${ico("plus")}Programar viaje</button>
  </div>
  <div class="grid g-cards">${lista.map((v) => {
    const u = unidad(v.id_unidad), n = db.mercancia.filter((m) => m.id_viaje === v.id).length, est = estadoCarga(v), c = cargaViaje(v);
    return `<article class="card trip">
      <div class="trip-head"><span class="ico-tile ${v.id_estado_viaje === 1 ? "asignada" : "transito"}">${ico("truck")}</span>
        <div><h3>${esc(ruta(v.id_ruta).corto)} · ${fCorta(v.fecha_programada)}</h3><p>${esc(u.matricula)} · ${n} envío(s)</p></div>${ui.filtroViaje ? "" : pill(estV(v.id_estado_viaje))}</div>
      ${v.id_estado_viaje === 1 ? medidor(v) : ""}
      <p class="trip-status ${est.cls}">${esc(est.txt)}</p>
      <div class="trip-actions">
        ${v.id_estado_viaje === 1 ? `<button class="btn sm dark" data-despachar="${v.id}" ${c.listo ? "" : "disabled"}>${ico("send")}Despachar</button>` : ""}
        <button class="btn sm" data-carga="${v.id}">Ver carga</button>
      </div>
    </article>`; }).join("") || `<div class="card pad empty"><img src="${ilus("empty-mailbox")}" alt=""><b>Sin viajes</b>No hay viajes en esta lista.</div>`}</div>`;
}

function modalProgramar() {
  const hoy = new Date(); const min = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const o = abrirOverlay(`
    <h3>Programar viaje</h3><p>Una unidad no puede tener dos viajes el mismo día.</p>
    <form class="form-grid" id="f-viaje">
      <div class="field full"><label>Ruta</label><select name="ruta">${db.ruta.map((r) => `<option value="${r.id}">${esc(r.corto)}: ${esc(paradas(r.id).join(", "))}</option>`).join("")}</select></div>
      <div class="field"><label>Unidad</label><select name="unidad">${db.unidad.map((u) => `<option value="${u.id}">${esc(u.matricula)} · ${u.capacidad_toneladas} t</option>`).join("")}</select></div>
      <div class="field"><label>Fecha</label><input type="date" name="fecha" min="${min}" value="${min}" required></div>
      <div class="form-actions"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button class="btn dark">Programar</button></div>
    </form>`);
  $("#f-viaje", o).addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const ok = await conCarga($("button.dark", e.target), () => ejecutar(() => api("viaje", { metodo: "POST", datos: { id_ruta: +f.get("ruta"), id_unidad: +f.get("unidad"), fecha_programada: f.get("fecha") } }), "Viaje programado"));
    if (ok) { cerrarOverlay(); ui.filtroViaje = 1; if (actual() !== "viajes") location.hash = "viajes"; else await recargar(); }
  });
}

function modalCarga(idV) {
  const v = viaje(idV), lista = db.mercancia.filter((m) => m.id_viaje === idV), c = cargaViaje(v);
  abrirOverlay(`<h3>${esc(ruta(v.id_ruta).corto)} · ${fFecha(v.fecha_programada)}</h3>
    <p>${esc(unidad(v.id_unidad).matricula)} · ${kg(c.carga)} de ${kg(c.capacidad)}</p>
    <div class="list">${lista.length ? lista.map(filaEnvio).join("") : `<p class="muted">Sin mercancía asignada.</p>`}</div>
    <div class="form-actions"><button class="btn ghost" data-cerrar>Cerrar</button></div>`);
}

/* ---------- Envíos ---------- */
function vEnvios() {
  const filtros = [[0, "Todos"], [1, "En bodega"], [2, "Asignados"], [3, "En camino"], [4, "Entregados"]];
  return `${titulo("envios")}
  <label class="search-pill">${ico("search")}<input id="buscar-envios" placeholder="Código, cliente o ciudad" value="${esc(ui.busqueda)}" autocomplete="off"></label>
  <div class="chips">${filtros.map(([id, t]) => `<button class="chip-btn ${ui.filtroEstado === id ? "on" : ""}" data-festado="${id}">${t}</button>`).join("")}</div>
  <section class="card pad" id="lista-envios">${listaEnvios()}</section>`;
}
function listaEnvios() {
  const rows = db.mercancia.filter((m) => (!ui.filtroEstado || m.id_estado === ui.filtroEstado) && coincide(m));
  return rows.length ? `<div class="list">${rows.map(filaEnvio).join("")}</div>` : `<div class="empty"><img src="${ilus("file-search")}" alt=""><b>Sin resultados</b>Prueba con otra búsqueda.</div>`;
}

async function hojaEnvio(idM) {
  const m = mercancia(idM); if (!m) return;
  const c = cliente(m.id_cliente), v = m.id_viaje ? viaje(m.id_viaje) : null;
  const accion = {
    1: `<button class="btn accent btn-lg block" data-cerrar data-asignar="${m.id}">${ico("route")}Asignar a viaje</button>`,
    2: `<div class="aviso-oscuro">${ico("calendar")}<span>Sale con el viaje del ${fFecha(v?.fecha_programada)} (${esc(v ? unidad(v.id_unidad).matricula : "")}). Despáchalo desde Viajes.</span></div>`,
    3: `<button class="btn accent btn-lg block" id="h-entregar">${ico("package-check")}Registrar entrega</button>`,
    4: `<div class="aviso-oscuro">${ico("circle-check")}<span>Entregado el ${fFechaHora(m.fecha_entrega)}</span></div>`,
  }[m.id_estado];
  const o = abrirOverlay(`
    <div class="sheet-head">
      <div><small>Código</small><h3 class="mono">${esc(m.codigo)}</h3></div>
      <button class="icon-btn dark" data-cerrar aria-label="Cerrar">${ico("x")}</button>
    </div>
    ${trackHtml(m.id_estado)}
    <div class="facts" style="margin:22px 0">
      <div><small>Ruta</small><b>${esc(loc(m.id_origen))} → ${esc(loc(m.id_destino))}</b></div>
      <div><small>Cliente</small><b>${esc(c?.nombre ?? "")}</b></div>
      <div><small>Peso</small><b>${kg(m.peso)}</b></div>
      <div><small>Entrega · pago</small><b>${esc(modEnt(m.id_modalidad_entrega))} · ${esc(modCob(m.id_modalidad_cobro))}</b></div>
    </div>
    ${accion}
    <details class="mas oscuro"><summary>Corregir ubicación</summary>
      <form id="f-ubicacion" class="with-btn" style="margin-top:12px"><input class="input" name="ubic" value="${esc(m.ubicacion)}" maxlength="120" aria-label="Ubicación"><button class="btn sm">Guardar</button></form>
    </details>
    <hr class="divider">
    <p class="eyebrow" style="margin:0 0 14px">Historial</p>
    <div id="h-historial"><span class="spinner"></span></div>
    <a class="btn sm block ghost-dark" href="rastreo.html?codigo=${encodeURIComponent(m.codigo)}" target="_blank" rel="noopener">${ico("eye")}Ver como cliente</a>`, true);

  const reabrir = async () => { await recargar(); hojaEnvio(idM); };
  $("#h-entregar", o)?.addEventListener("click", async (e) => {
    const ok = await conCarga(e.currentTarget, () => ejecutar(() => api("estado", { metodo: "POST", datos: { id_mercancia: idM, estado: "Entregada", ubicacion: `Entregado en ${loc(m.id_destino)}` } }), "Entrega registrada"));
    if (ok) reabrir();
  });
  $("#f-ubicacion", o).addEventListener("submit", async (e) => {
    e.preventDefault();
    const ubic = e.target.ubic.value.trim(); if (!ubic) return;
    const ok = await conCarga($("button", e.target), () => ejecutar(() => api("estado", { metodo: "POST", datos: { id_mercancia: idM, estado: estM(m.id_estado).nombre, ubicacion: ubic } }), "Ubicación actualizada"));
    if (ok) reabrir();
  });
  try {
    const { movimientos } = await api("movimientos", { params: { id: idM } });
    const h = $("#h-historial", o);
    if (h) h.innerHTML = `<ul class="timeline">${movimientos.map((mv) => `<li><span class="tl-dot"></span><b>${esc(estM(mv.id_estado).nombre)}</b><small>${esc(mv.ubicacion)} · ${fFechaHora(mv.fecha_hora)}</small></li>`).join("")}</ul>`;
  } catch (err) { const h = $("#h-historial", o); if (h) h.textContent = err.message; }
}

/* ---------- Clientes (admin) ---------- */
function vClientes() {
  const q = ui.buscarClientes.trim().toLowerCase();
  const rows = db.cliente.filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.telefono ?? "").includes(q));
  return `${titulo("clientes")}
  <div class="toolbar"><label class="search-pill" style="flex:1;max-width:420px">${ico("search")}<input id="buscar-clientes" placeholder="Nombre o teléfono" value="${esc(ui.buscarClientes)}" autocomplete="off"></label>
    <button class="btn accent" id="alta-cliente">${ico("plus")}Nuevo cliente</button></div>
  <section class="card pad"><div class="list">${rows.map((c) => `
    <div class="row static"><span class="ico-tile neutral">${ico("user-round")}</span>
      <span class="info"><b>${esc(c.nombre)}</b><small class="mono">${esc(c.telefono ?? "Sin teléfono")}</small></span>
      <span class="muted" style="font-size:12.5px">${db.mercancia.filter((m) => m.id_cliente === c.id).length} envío(s)</span></div>`).join("") || `<p class="muted">Sin resultados.</p>`}</div></section>`;
}

function modalCliente(alGuardar) {
  const o = abrirOverlay(`
    <h3>Nuevo cliente</h3><p>Nombre y teléfono de contacto.</p>
    <form class="form-grid" id="f-cliente">
      <div class="field full"><label>Nombre completo</label><input name="nombre" maxlength="100" required></div>
      <div class="field full"><label>Teléfono (10 dígitos, opcional)</label><input name="tel" maxlength="10" inputmode="numeric" pattern="\\d{10}"></div>
      <div class="form-actions"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button class="btn dark">Guardar</button></div>
    </form>`);
  $("#f-cliente", o).addEventListener("submit", async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const r = await conCarga($("button.dark", e.target), () => ejecutar(() => api("cliente", { metodo: "POST", datos: { nombre: f.get("nombre"), telefono: f.get("tel") } }), "Cliente registrado"));
    if (r) { cerrarOverlay(); await cargarDatos(); alGuardar?.(r); }
  });
}

/* ---------- Configuración (admin) ---------- */
function vConfig() {
  return `${titulo("config")}
  <section class="card pad">
    <div class="card-head"><h2>Carga mínima para salir</h2></div>
    <div class="list">${db.cat_tipo_unidad.map((t) => `
      <label class="row static"><span class="ico-tile neutral">${ico(t.id === 2 ? "container" : "truck")}</span>
        <span class="info"><b>${esc(t.nombre)}</b><small>${t.aplica_minimo_carga ? "Sale con al menos el 50 % de su capacidad" : "Puede salir con cualquier carga"}</small></span>
        <span class="switch"><input type="checkbox" data-minimo="${t.id}" ${t.aplica_minimo_carga ? "checked" : ""}><span></span></span></label>`).join("")}</div>
  </section>
  <div class="grid g-2">
    <section class="card pad"><div class="card-head"><h2>Unidades</h2></div>
      <div class="t-scroll"><table><thead><tr><th>Matrícula</th><th>Tipo</th><th>Capacidad</th></tr></thead>
      <tbody>${db.unidad.map((u) => `<tr><td class="mono">${esc(u.matricula)}</td><td>${esc(tipoU(u.id_tipo_unidad).nombre)}</td><td class="num">${u.capacidad_toneladas} t</td></tr>`).join("")}</tbody></table></div></section>
    <section class="card pad"><div class="card-head"><h2>Rutas</h2></div>
      ${db.ruta.map((r) => `<div style="margin-bottom:16px"><b>${esc(r.corto)}</b><div class="stops">${paradas(r.id).map((p, j) => `${j ? ico("chevron-right") : ""}<span>${esc(p)}</span>`).join("")}</div></div>`).join("")}</section>
  </div>`;
}

function modalClave() {
  const o = abrirOverlay(`
    <h3>Cambiar contraseña</h3><p>Mínimo 10 caracteres, con letras y números.</p>
    <form class="form-grid" id="f-clave">
      <div class="field full"><label>Contraseña actual</label><input type="password" name="actual" autocomplete="current-password" required></div>
      <div class="field full"><label>Nueva contraseña</label><input type="password" name="nueva" autocomplete="new-password" minlength="10" required></div>
      <div class="field full"><label>Repite la nueva</label><input type="password" name="repetir" autocomplete="new-password" required></div>
      <div class="form-actions"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button class="btn dark">Guardar</button></div>
    </form>`);
  $("#f-clave", o).addEventListener("submit", async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (f.nueva !== f.repetir) return toast("Las contraseñas no coinciden.", "err");
    const ok = await conCarga($("button.dark", e.target), () => ejecutar(() => api("cambiar_clave", { metodo: "POST", datos: { actual: f.actual, nueva: f.nueva } }), "Contraseña actualizada"));
    if (ok) cerrarOverlay();
  });
}

/* ---------- Navegación y render ---------- */
function pintarNav() {
  const k = actual(), espera = enEspera().length;
  const enlace = (key) => { const s = SECCIONES[key]; return `<a href="#${key}" class="${k === key ? "active" : ""}">${ico(s.icono)}${s.titulo}${key === "asignar" && espera ? `<span class="badge">${espera}</span>` : ""}</a>`; };
  $("#nav").innerHTML = ["inicio", "recibir", "asignar", "viajes", "envios"].map(enlace).join("")
    + (esAdmin() ? `<div class="p-group">Administración</div>${["clientes", "config"].map(enlace).join("")}` : "");

  const mb = (key, icono, txt) => `<a href="#${key}" class="${k === key ? "active" : ""}">${ico(icono)}${txt}</a>`;
  $("#mbar").innerHTML = `${mb("inicio", "house", "Inicio")}${mb("envios", "package-search", "Envíos")}<a href="#recibir" class="plus" aria-label="Recibir mercancía">${ico("plus")}</a>${mb("viajes", "truck", "Viajes")}<button id="mas" class="${["asignar", "clientes", "config"].includes(k) ? "active" : ""}">${ico("ellipsis")}Más</button>`;
  $("#more").innerHTML = `<a href="#asignar">${ico("clock")}Por asignar${espera ? `<span class="badge">${espera}</span>` : ""}</a>
    ${esAdmin() ? `<a href="#clientes">${ico("users")}Clientes</a><a href="#config">${ico("settings")}Configuración</a>` : ""}
    <button data-clave>${ico("key-round")}Cambiar contraseña</button><button data-salir>${ico("log-out")}Cerrar sesión</button>`;
}

function render() {
  const k = actual();
  $("#view").innerHTML = `<div class="view">${SECCIONES[k].vista()}</div>`;
  pintarNav();
  document.title = `${SECCIONES[k].titulo} · Transportadora Osorio`;
  pintarIconos();
}

async function recargar() {
  try { await cargarDatos(); render(); }
  catch (e) { if (e.status === 401 || e.status === 403) location.replace("login.html"); else toast(e.message, "err"); }
}

/* ---------- Eventos ---------- */
window.addEventListener("hashchange", () => {
  $("#more").classList.remove("open"); cerrarOverlay(); render(); window.scrollTo(0, 0);
});

document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-envio],[data-asignar],[data-despachar],[data-programar],[data-carga],[data-festado],[data-fviaje],[data-salir],[data-clave],#mas,#alta-cliente,#nuevo-cliente");
  if (!t) { if (!e.target.closest("#more")) $("#more").classList.remove("open"); return; }
  if (t.dataset.envio) hojaEnvio(Number(t.dataset.envio));
  else if (t.dataset.asignar) modalAsignar(Number(t.dataset.asignar));
  else if (t.dataset.despachar) {
    const ok = await conCarga(t, () => ejecutar(() => api("despachar", { metodo: "POST", datos: { id_viaje: Number(t.dataset.despachar) } }), "Viaje despachado", "Sus envíos pasaron a En camino"));
    if (ok) await recargar();
  }
  else if (t.hasAttribute("data-programar")) modalProgramar();
  else if (t.dataset.carga) modalCarga(Number(t.dataset.carga));
  else if (t.dataset.festado !== undefined) { ui.filtroEstado = Number(t.dataset.festado); render(); }
  else if (t.dataset.fviaje !== undefined) { ui.filtroViaje = Number(t.dataset.fviaje); render(); }
  else if (t.hasAttribute("data-salir")) cerrarSesion();
  else if (t.hasAttribute("data-clave")) { $("#more").classList.remove("open"); modalClave(); }
  else if (t.id === "mas") { e.stopPropagation(); $("#more").classList.toggle("open"); }
  else if (t.id === "alta-cliente") modalCliente(() => render());
  else if (t.id === "nuevo-cliente") modalCliente((c) => {
    const sel = $("#r-cliente"); if (!sel) return;
    sel.insertAdjacentHTML("beforeend", `<option value="${c.id}">${esc(c.nombre)}</option>`); sel.value = c.id;
  });
});

document.addEventListener("input", (e) => {
  if (e.target.id === "buscar-envios") { ui.busqueda = e.target.value; $("#lista-envios").innerHTML = listaEnvios(); pintarIconos(); }
  if (e.target.id === "buscar-clientes") { ui.buscarClientes = e.target.value; const pos = e.target.selectionStart; render(); const i = $("#buscar-clientes"); i.focus(); i.setSelectionRange(pos, pos); }
});

document.addEventListener("change", async (e) => {
  if (e.target.id === "r-origen") {
    const d = $("#r-destino"); d.innerHTML = opcionesDestino(Number(e.target.value), d.value); return;
  }
  if (e.target.id === "r-bodega") {
    const o = $("#r-origen"), idLoc = bodega(Number(e.target.value))?.id_localidad;
    if (idLoc) { o.value = idLoc; o.dispatchEvent(new Event("change", { bubbles: true })); }
    return;
  }
  if (!e.target.dataset.minimo) return;
  const valor = e.target.checked;
  const ok = await ejecutar(() => api("tipo_minimo", { metodo: "POST", datos: { id_tipo: Number(e.target.dataset.minimo), valor } }), "Configuración guardada");
  if (ok) await recargar(); else e.target.checked = !valor;
});

document.addEventListener("submit", (e) => {
  if (e.target.id === "f-recibir") { e.preventDefault(); enviarRecepcion(e.target, $("button.accent", e.target)); }
  if (e.target.id === "f-buscar-inicio") { e.preventDefault(); ui.busqueda = e.target.q.value; ui.filtroEstado = 0; location.hash = "envios"; }
});

/* ---------- Arranque ---------- */
(async () => {
  try {
    U = await obtenerSesion();
    if (!U || U.debe_cambiar_clave) return location.replace("login.html");
    $("#lugar").textContent = U.bodega || (esAdmin() ? "Administración" : "Operación");
    $("#user").innerHTML = `<span class="ico-tile neutral">${ico("user-round")}</span><div><b>${esc(U.nombre)}</b><small>${esAdmin() ? "Administrador" : "Bodega"}</small></div>
      <button class="icon-btn" data-clave aria-label="Cambiar contraseña" title="Cambiar contraseña">${ico("key-round")}</button>
      <button class="icon-btn" data-salir aria-label="Cerrar sesión" title="Cerrar sesión">${ico("log-out")}</button>`;
    await cargarDatos();
    document.body.classList.remove("cargando-panel");
    if (location.hash && !permitida(location.hash.slice(1))) history.replaceState(null, "", "#inicio");
    render();
  } catch (e) {
    $("#view").innerHTML = `<div class="card pad empty" style="margin-top:80px"><img src="${ilus("file-search")}" alt=""><b>No pudimos cargar el panel</b>${esc(e.message)}<br><br><a class="btn dark" href="panel.html">Reintentar</a></div>`;
  }
})();
