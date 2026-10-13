// Prueba de compras simultáneas contra una COPIA AISLADA del backend.
//
//   node tools/prueba-carga.js <URL /exec de la COPIA> "<nombre exacto del producto>" [compradores=10]
//
// Qué hace:
//  1. Se niega a correr contra la URL de producción.
//  2. Verifica que la copia responda la versión v3.
//  3. Lee el producto y su stock.
//  4. Lanza N pedidos AL MISMO TIEMPO de 1 unidad (pago Efectivo) y, además,
//     reenvía 3 veces el primer pedido con el mismo id (doble clic / reintento).
//  5. Vuelve a leer el stock y controla: sin sobreventa, sin negativos y sin duplicados.
const { SHEETS_API_URL } = (() => {
  const txt = require("fs").readFileSync(require("path").join(__dirname, "..", "lib", "config.ts"), "utf8");
  const m = txt.match(/SHEETS_API_URL\s*=\s*"([^"]+)"/);
  return { SHEETS_API_URL: m ? m[1] : "" };
})();

const [EXEC, PRODUCTO, N_ARG] = process.argv.slice(2);
const N = Math.max(2, Math.min(60, Number(N_ARG) || 10));
if (!EXEC || !PRODUCTO) {
  console.log('Uso: node tools/prueba-carga.js <URL /exec de la COPIA> "<nombre del producto>" [compradores]');
  process.exit(1);
}
if (SHEETS_API_URL && EXEC.trim() === SHEETS_API_URL.trim()) {
  console.error("ESA ES LA URL DE PRODUCCIÓN. La prueba de carga solo se corre contra la copia aislada.");
  process.exit(1);
}

async function api(params) {
  const qs = new URLSearchParams(Object.assign({ callback: "cb" }, params));
  const res = await fetch(`${EXEC}?${qs}`, { redirect: "follow" });
  const t = await res.text();
  const m = t.match(/^cb\(([\s\S]*)\)\s*;?\s*$/);
  if (!m) throw new Error("Respuesta inesperada: " + t.slice(0, 120));
  return JSON.parse(m[1]);
}

(async () => {
  const v = await api({ action: "version" });
  if (v.version !== "v3") throw new Error("La copia no tiene la versión v3 desplegada (responde " + v.version + ")");
  const lista = (await api({ action: "productos_list" })).data || [];
  const p = lista.find((x) => x.nombre === PRODUCTO);
  if (!p) throw new Error("No encontré el producto en la copia: " + PRODUCTO);
  const stockInicial = Number(p.cantidad) || 0;
  console.log(`Producto: ${p.nombre} · precio base $${p.precio} · stock ${stockInicial} · compradores ${N}`);
  if (stockInicial <= 0 || stockInicial >= N) {
    console.log("Para que la prueba sirva, poné en la copia un stock MENOR que la cantidad de compradores (por ejemplo 3).");
  }

  const base = Date.now();
  const pedido = (i) => ({
    action: "add",
    tab: "Pedidos",
    data: JSON.stringify({
      id: "ped" + (base + i),
      cliente: "PRUEBA CARGA " + i,
      telefono: "1100000000",
      detalle: "1x " + p.nombre,
      monto: p.precio,
      pago: "Efectivo",
      envio: "Retiro en persona",
      items: JSON.stringify([{ n: p.nombre, v: "", q: 1 }]),
    }),
  });

  const t0 = Date.now();
  const tareas = [];
  for (let i = 0; i < N; i++) tareas.push(api(pedido(i)).catch((e) => ({ ok: false, error: String(e) })));
  for (let k = 0; k < 3; k++) tareas.push(api(pedido(0)).catch((e) => ({ ok: false, error: String(e) }))); // reintentos del pedido 0
  const res = await Promise.all(tareas);
  const ms = Date.now() - t0;

  const nuevos = res.slice(0, N).filter((r) => r.ok && !r.repetido).length + res.slice(N).filter((r) => r.ok && !r.repetido).length;
  const repetidos = res.filter((r) => r.repetido).length;
  const sinStock = res.filter((r) => !r.ok && /Sin stock|Solo quedan/.test(r.error || "")).length;
  const demanda = res.filter((r) => !r.ok && /demanda/.test(r.error || "")).length;
  const otros = res.filter((r) => !r.ok && !/Sin stock|Solo quedan|demanda|ya existe/.test(r.error || ""));

  const despues = ((await api({ action: "productos_list" })).data || []).find((x) => x.nombre === PRODUCTO);
  const stockFinal = Number(despues && despues.cantidad) || 0;

  console.log(`\nTiempo total: ${ms} ms`);
  console.log(`Pedidos creados: ${nuevos} · reintentos reconocidos: ${repetidos} · rechazados por stock: ${sinStock} · rechazados por demanda: ${demanda}`);
  if (otros.length) console.log("Otros errores:", otros.map((r) => r.error));
  console.log(`Stock: ${stockInicial} → ${stockFinal}`);

  const okSobreventa = nuevos <= stockInicial;
  const okStock = stockFinal === Math.max(0, stockInicial - nuevos);
  console.log(`\n${okSobreventa ? "OK " : "FALLA"} sin sobreventa (${nuevos} vendidos de ${stockInicial})`);
  console.log(`${okStock ? "OK " : "FALLA"} stock final coherente`);
  console.log(`${stockFinal >= 0 ? "OK " : "FALLA"} sin stock negativo`);
  console.log("\nRevisá en la copia que la pestaña Pedidos tenga UNA sola fila por id (sin duplicados del pedido 0).");
  process.exit(okSobreventa && okStock ? 0 : 1);
})().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
