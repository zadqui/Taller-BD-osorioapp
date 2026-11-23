/* Landing: buscador de código, menú móvil y animación al hacer scroll */
const irARastreo = (codigo) => {
  const c = String(codigo || "").trim().toUpperCase();
  if (c) location.href = `rastreo.html?codigo=${encodeURIComponent(c)}`;
};
["#f-hero", "#f-cta"].forEach((s) => $(s).addEventListener("submit", (e) => { e.preventDefault(); irARastreo(new FormData(e.target).get("codigo")); }));

$("#menu").addEventListener("click", () => { const abierto = $("#links").classList.toggle("open"); $("#menu").setAttribute("aria-expanded", abierto); });
$$("#links a").forEach((a) => a.addEventListener("click", () => $("#links").classList.remove("open")));

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));
} else {
  $$(".reveal").forEach((el) => el.classList.add("in"));
}
pintarIconos();
