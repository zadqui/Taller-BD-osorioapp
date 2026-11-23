/* =====================================================================
   Rastreo público por código (sin sesión)
   Estilo de paquetería: estado, pasos con fecha e historial de escaneos.
   ===================================================================== */
const EVENTO = { 1: "Recibido en bodega", 2: "Asignado a viaje", 3: "Salió de bodega", 4: "Entregado" };
const TITULO = { 1: "Recibido, en espera de viaje", 2: "Asignado a viaje", 3: "En camino", 4: "Entregado" };

function vistaBuscar() {
  return `<section class="t-search">
    <img src="${ilus("order-status")}" alt="">
    <h2>Rastrea tu envío</h2>
    <p>Escribe el código que aparece en tu comprobante de recepción.</p>
    <form class="search-pill" id="f-grande" role="search">
      ${ico("search")}<input name="codigo" placeholder="OSO-XXXX-XXXX" aria-label="Código de seguimiento" autocomplete="off" maxlength="13">
      <button class="btn accent">Rastrear</button>
    </form>
  </section>`;
}

function vistaMensaje(titulo, texto, imagen = "empty-mailbox") {
  return `<section class="card pad empty" style="max-width:560px;margin:40px auto">
    <img src="${ilus(imagen)}" alt="" style="width:180px;height:auto"><b>${esc(titulo)}</b>${esc(texto)}
  </section>`;
}

function subtitulo(e) {
  const v = e.viaje;
  if (e.id_estado === 1) return `En ${e.bodega} desde el ${fFecha(e.fecha_registro)}. Saldrá en el próximo viaje a ${e.destino}.`;
  if (e.id_estado === 2) return v ? `Sale de ${e.bodega} el ${fFecha(v.fecha_programada)}.` : "";
  if (e.id_estado === 3) return v?.fecha_salida ? `Salió el ${fFechaHora(v.fecha_salida)} rumbo a ${e.destino}.` : `Rumbo a ${e.destino}.`;
  return `Entregado el ${fFechaHora(e.fecha_entrega)}`;
}

function historial(movs) {
  let dia = "", html = "";
  movs.forEach((mv, i) => {
    const d = capital(aFecha(mv.fecha_hora).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
    if (d !== dia) { dia = d; html += `<div class="day">${esc(d)}</div>`; }
    const repetido = movs[i + 1]?.id_estado === mv.id_estado;
    html += `<div class="hist-row ${i ? "" : "latest"}"><time>${fHora(mv.fecha_hora)}</time><span class="dot"></span>
      <div><b>${esc(repetido ? "Cambio de ubicación" : EVENTO[mv.id_estado])}</b><small>${esc(mv.ubicacion)}</small></div></div>`;
  });
  return html;
}

function vistaEnvio(e) {
  const fechaPaso = (id) => {
    if (id === 4) return fCorta(e.fecha_entrega);
    const m = [...e.movimientos].reverse().find((x) => x.id_estado === id);
    return m ? fCorta(m.fecha_hora) : "";
  };
  const v = e.viaje;
  return `
  <section class="card dark t-hero">
    <div>
      <div class="code">Código <b class="mono">${esc(e.codigo)}</b></div>
      <h1 class="status">${esc(TITULO[e.id_estado])}</h1>
      <p class="status-sub">${esc(subtitulo(e))}</p>
    </div>
    <div class="track-wrap">${trackHtml(e.id_estado)}<div class="step-dates">${[1, 2, 3, 4].map((id) => `<span>${fechaPaso(id)}</span>`).join("")}</div></div>
  </section>

  <div class="t-grid">
    <section class="card pad history">
      <div class="card-head"><h2>Historial</h2></div>
      ${historial(e.movimientos)}
    </section>
    <section class="card pad">
      <div class="from-to" style="margin-bottom:20px"><div><small>Desde</small><b>${esc(e.origen)}</b></div>${ico("arrow-right")}<div><small>Hacia</small><b>${esc(e.destino)}</b></div></div>
      <div class="facts">
        <div><small>Peso</small><b>${kg(e.peso)}</b></div>
        <div><small>Entrega</small><b>${esc(e.entrega)}</b></div>
        <div><small>Forma de pago</small><b>${esc(e.cobro)}</b></div>
        <div><small>Recibido en</small><b>${esc(e.bodega)}</b></div>
        ${v ? `<div><small>Viaje</small><b>${esc(v.matricula)}</b></div><div><small>Servicio</small><b>${esc(v.tipo_unidad)}</b></div>` : ""}
      </div>
      ${e.paradas.length ? `<hr class="divider"><p class="eyebrow" style="margin:0 0 4px">Ruta</p>
      <div class="stops">${e.paradas.map((p, j) => `${j ? ico("chevron-right") : ""}<span class="${p === e.destino ? "stop-dest" : ""}">${esc(p)}</span>`).join("")}</div>` : ""}
    </section>
  </div>`;
}

async function mostrar() {
  const codigo = (new URLSearchParams(location.search).get("codigo") || "").trim().toUpperCase();
  $("#f-buscar").codigo.value = codigo;
  const caja = $("#resultado");
  if (!codigo) { caja.innerHTML = vistaBuscar(); enlazarGrande(); pintarIconos(); return; }
  caja.innerHTML = `<div class="empty"><span class="spinner"></span></div>`;
  try {
    const { envio } = await api("rastreo", { params: { codigo } });
    caja.innerHTML = vistaEnvio(envio);
    document.title = `${envio.codigo} · ${TITULO[envio.id_estado]} · Transportadora Osorio`;
  } catch (err) {
    caja.innerHTML = err.status === 404
      ? vistaMensaje(`No encontramos ${codigo}`, "Revisa que el código esté completo. Si acabas de dejar tu mercancía, intenta de nuevo en unos minutos.")
      : err.status === 422 ? vistaMensaje("Código incompleto", err.message, "file-search")
      : vistaMensaje("No pudimos consultar tu envío", err.message, "file-search");
  }
  pintarIconos();
}

function buscar(e) {
  e.preventDefault();
  const c = String(new FormData(e.target).get("codigo") || "").trim().toUpperCase();
  if (!c) return;
  history.pushState(null, "", `?codigo=${encodeURIComponent(c)}`);
  mostrar();
}
const enlazarGrande = () => $("#f-grande")?.addEventListener("submit", buscar);

$("#f-buscar").addEventListener("submit", buscar);
window.addEventListener("popstate", mostrar);
mostrar();
