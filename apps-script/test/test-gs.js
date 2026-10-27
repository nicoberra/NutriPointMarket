// Banco de pruebas del backend: node apps-script/test/test-gs.js
// memoria y mocks de los servicios de Google, y prueba el flujo completo.
const fs = require("fs");
const vm = require("vm");
const SRC = require("path").join(__dirname, "..", "Codigo.gs");

/* ----------------------------- Mocks de Google ---------------------------- */
function makeSheet(name, rows) {
  const sh = {
    name, rows,
    getName: () => name,
    getLastRow: () => sh.rows.length,
    getMaxRows: () => Math.max(1000, sh.rows.length),
    getMaxColumns: () => 26,
    getLastColumn: () => Math.max(0, ...sh.rows.map((r) => r.length)),
    appendRow: (r) => { sh.rows.push(r.slice()); },
    deleteRow: (n) => { sh.rows.splice(n - 1, 1); },
    setFrozenRows: () => {}, autoResizeColumns: () => {},
    getDataRange: () => ({ getValues: () => sh.rows.map((r) => r.slice()) }),
    getRange: (r, c, nr = 1, nc = 1) => {
      const ensure = () => { while (sh.rows.length < r + nr - 1) sh.rows.push([]); };
      const rng = {
        getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? "" : row[c - 1 + j]); out.push(o); } return out; },
        setValues: (v) => { ensure(); for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i]; for (let j = 0; j < nc; j++) row[c - 1 + j] = v[i][j]; } return rng; },
        getValue: () => { const row = sh.rows[r - 1] || []; return row[c - 1] === undefined ? "" : row[c - 1]; },
        setValue: (v) => { ensure(); sh.rows[r - 1][c - 1] = v; return rng; },
        setFontWeight: () => rng, setBackground: () => rng, setFontColor: () => rng,
      };
      return rng;
    },
  };
  return sh;
}
const book = { sheets: {} };
const bookApi = {
  getId: () => "TEST",
  getName: () => "Planilla simulada",
  getSheetByName: (n) => book.sheets[n] || null,
  insertSheet: (n) => (book.sheets[n] = makeSheet(n, [])),
  getSheets: () => Object.values(book.sheets),
};
const cacheStore = {};
let cacheHits = 0;
const mails = [];
const fetches = [];
let lockCalls = 0;
const props = { MP_ACCESS_TOKEN: "TEST-TOKEN", GITHUB_TOKEN: "GH" };
let mpPayment = null;
// Simula los dos disparadores de copias que habían quedado repetidos.
const triggers = [{ getHandlerFunction: () => "backupDiario" }, { getHandlerFunction: () => "backupDiario" }];
const ctx = {
  console,
  SpreadsheetApp: { openById: () => bookApi, getActiveSpreadsheet: () => bookApi, getActive: () => ({ toast: () => {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => (props[k] = v) }) },
  CacheService: { getScriptCache: () => ({
    get: (k) => { if (k in cacheStore) { cacheHits++; return cacheStore[k]; } return null; },
    getAll: (ks) => { const o = {}; ks.forEach((k) => { if (k in cacheStore) o[k] = cacheStore[k]; }); return o; },
    put: (k, v) => (cacheStore[k] = v),
    putAll: (o) => Object.assign(cacheStore, o),
    remove: (k) => delete cacheStore[k],
    removeAll: (ks) => ks.forEach((k) => delete cacheStore[k]),
  }) },
  LockService: { getScriptLock: () => ({ tryLock: () => { lockCalls++; return true; }, releaseLock: () => {} }) },
  Utilities: {
    formatDate: (d) => d.toISOString().slice(0, 16).replace("T", " "),
    computeDigest: (_alg, v) => Array.from(require("crypto").createHash("sha256").update(String(v)).digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: {}, Charset: {}, base64Encode: (x) => Buffer.from(String(x)).toString("base64"),
    getUuid: () => "uuid-" + Math.random(),
  },
  ContentService: { createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }), MimeType: { JAVASCRIPT: "js", JSON: "json" } },
  ScriptApp: {
    getService: () => ({ getUrl: () => "https://exec" }),
    getProjectTriggers: () => triggers.slice(),
    deleteTrigger: (t) => { triggers.splice(triggers.indexOf(t), 1); },
    newTrigger: (h) => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ create: () => { triggers.push({ getHandlerFunction: () => h }); } }) }) }) }),
  },
  Session: { getEffectiveUser: () => ({ getEmail: () => "owner@test" }) },
  MailApp: { sendEmail: (to, subj, body) => mails.push({ to, subj, body }) },
  DriveApp: { getFileById: () => ({ makeCopy: () => {} }), getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getFiles: () => ({ hasNext: () => false }) }) },
  UrlFetchApp: { fetch: (url, opt) => {
    fetches.push({ url, opt });
    if (url.indexOf("/checkout/preferences") !== -1) return { getResponseCode: () => 201, getContentText: () => JSON.stringify({ id: "PREF1", init_point: "https://mp/redirect?pref_id=PREF1" }) };
    if (url.indexOf("/v1/payments/") !== -1) return { getResponseCode: () => 200, getContentText: () => JSON.stringify(mpPayment) };
    if (url.indexOf("api.github.com") !== -1) return { getResponseCode: () => 201, getContentText: () => "{}" };
    return { getResponseCode: () => 200, getContentText: () => "{}" };
  } },
  Logger: { log: () => {} },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SRC, "utf8") + "\nthis.__T = TABLES; this.__keysOf = keysOf;", ctx);

/* ------------------------------ Datos de prueba --------------------------- */
const T = ctx.__T;
const header = (tab) => T[tab].columns.map((c) => c[1]);
function rowFrom(tab, obj) { return T[tab].columns.map((c) => (obj[c[0]] === undefined ? "" : obj[c[0]])); }
book.sheets.Productos = makeSheet("Productos", [header("Productos"),
  rowFrom("Productos", { nombre: "WHEY PROTEIN TRUE MADE 1kg", categoria: "Proteínas", precio: 45000, stock: "sí", cantidad: 5, variantes: "Vainilla:3, Chocolate:2" }),
  rowFrom("Productos", { nombre: "CREATINA MONOHIDRATO  300 gr", categoria: "Creatina", precio: 33000, stock: "sí", cantidad: 2 }),
  rowFrom("Productos", { nombre: "Shaker", categoria: "Shakers", precio: 5000, stock: "no", cantidad: 0 }),
  rowFrom("Productos", { nombre: "Tape", categoria: "Kinesio", precio: 1000, stock: "sí", cantidad: "" }),
  rowFrom("Productos", { nombre: "Proteína + Creatina", categoria: "Combos", precio: 70000, stock: "sí", cantidad: 0, combo: JSON.stringify([{ n: "WHEY PROTEIN TRUE MADE 1kg", q: 1 }, { n: "CREATINA MONOHIDRATO  300 gr", q: 1 }]) }),
]);
book.sheets.Pedidos = makeSheet("Pedidos", [header("Pedidos"),
  rowFrom("Pedidos", { id: "ped1791863284000", cliente: "TEST CLAUDE NO CREAR", monto: 1, pago: "Transferencia", items: JSON.stringify([{ n: "WHEY PROTEIN TRUE MADE 1kg", v: "", q: 1 }]), descontado: "sí" }),
  rowFrom("Pedidos", { id: "ped1791863284000", cliente: "TEST", monto: 1, pago: "Bitcoin", items: JSON.stringify([{ n: "x", q: 1 }]), descontado: "sí" }),
  rowFrom("Pedidos", { id: "hack", cliente: "TEST" }),
  rowFrom("Pedidos", { id: "ped1700000000000", cliente: "Cliente Real", monto: 50000, pago: "Efectivo", items: "[]", estado: "nuevo" }),
]);
book.sheets.Clientes = makeSheet("Clientes", [header("Clientes"),
  rowFrom("Clientes", { id: "c1", nombre: "Juan Perez", email: "juan@test.com", clave: "v2$x" }),
  rowFrom("Clientes", { id: "c2", nombre: "", email: "no-es-email", clave: "v2$y" }),
]);
book.sheets.Suscriptores = makeSheet("Suscriptores", [header("Suscriptores")]);
book.sheets.Categorias = makeSheet("Categorias", [header("Categorias"), rowFrom("Categorias", { nombre: "Proteínas", orden: 1 })]);

/* --------------------------------- Helpers -------------------------------- */
// Las pruebas de lógica mandan muchas altas seguidas del mismo cliente ficticio:
// limpian los contadores del límite contra abuso. Las pruebas del límite lo apagan.
let limpiarLimites = true;
const call = (params, body) => {
  if (limpiarLimites) for (const k of Object.keys(cacheStore)) if (/^(rl_|loginfail_)/.test(k)) delete cacheStore[k];
  const e = { parameter: Object.assign({ callback: "cb" }, params) };
  if (body) e.postData = { contents: JSON.stringify(body) };
  const t = ctx.handle(e).text;
  return JSON.parse(t.slice(3, -1));
};
const prod = (name) => {
  const k = ctx.__keysOf("Productos");
  const r = book.sheets.Productos.rows.find((x) => x[0] === name);
  return { cantidad: r[k.indexOf("cantidad")], stock: r[k.indexOf("stock")], variantes: r[k.indexOf("variantes")] };
};
const pedidos = () => book.sheets.Pedidos.rows.slice(1);
const precioWeb = (b) => Math.round(b / 0.9 / 100) * 100;
let ok = 0, fail = 0;
const check = (name, cond, extra) => { if (cond) { ok++; console.log("  OK  ", name); } else { fail++; console.log("  FALLA", name, extra !== undefined ? JSON.stringify(extra) : ""); } };
const addPedido = (o) => call({ action: "add", tab: "Pedidos", data: JSON.stringify(o) });
const items = (arr) => JSON.stringify(arr);

/* --------------------------------- Pruebas -------------------------------- */
console.log("Versión y lecturas");
check("version v13", call({ action: "version" }).version === "v13");
const l1 = call({ action: "productos_list" });
check("productos_list público sin costos", l1.ok && l1.data.length === 5 && !("costo" in l1.data[0]));
const hitsAntes = cacheHits;
call({ action: "productos_list" });
check("segunda lectura sale del caché", cacheHits > hitsAntes);
check("categorías públicas", call({ action: "list", tab: "Categorias" }).data.length === 1);
check("Clientes sin token → auth", call({ action: "list", tab: "Clientes" }).error === "auth");
check("alta en Clientes sin token → auth", call({ action: "add", tab: "Clientes", data: "{}" }).error === "auth");

console.log("Validación de pedidos");
let n0 = pedidos().length;
let r = addPedido({ id: "ped1791900000001", cliente: "Ana", monto: 1, pago: "Transferencia", envio: "Retiro en persona", items: items([{ n: "WHEY PROTEIN TRUE MADE 1kg", v: "Vainilla", q: 1 }]) });
check("total manipulado → rechazo", r.ok === false && /precios se actualizaron/.test(r.error), r);
check("  ...sin crear fila", pedidos().length === n0);
check("  ...queda en pestaña Errores", book.sheets.Errores && book.sheets.Errores.rows.length === 2);
check("medio de pago inválido", /Medio de pago/.test(addPedido({ id: "ped1791900000002", cliente: "A", monto: 1, pago: "Bitcoin", items: items([{ n: "Tape", q: 1 }]) }).error));
check("id inválido", /Id de pedido/.test(addPedido({ id: "hack2", cliente: "A", pago: "Efectivo", items: items([{ n: "Tape", q: 1 }]) }).error));
check("producto inexistente", /no disponible/.test(addPedido({ id: "ped1791900000003", cliente: "A", monto: 1, pago: "Efectivo", items: items([{ n: "Nada", q: 1 }]) }).error));

console.log("Stock");
check("sin stock (stock = no)", /Sin stock: Shaker/.test(addPedido({ id: "ped1791900000004", cliente: "A", monto: 5000, pago: "Efectivo", items: items([{ n: "Shaker", q: 1 }]) }).error));
check("más que la cantidad", /Solo quedan 2 unidades de CREATINA/.test(addPedido({ id: "ped1791900000005", cliente: "A", monto: 99000, pago: "Efectivo", items: items([{ n: "CREATINA MONOHIDRATO  300 gr", q: 3 }]) }).error));
check("más que la variante", /Solo quedan 2 de WHEY.*Chocolate/.test(addPedido({ id: "ped1791900000006", cliente: "A", monto: 135000, pago: "Efectivo", items: items([{ n: "WHEY PROTEIN TRUE MADE 1kg", v: "Chocolate", q: 3 }]) }).error));
check("cantidad no cargada y stock sí → se acepta", addPedido({ id: "ped1791900000007", cliente: "A", monto: 2000, pago: "Efectivo", items: items([{ n: "Tape", q: 2 }]) }).ok === true);

console.log("Pedido válido + reintento");
const okItems = items([{ n: "WHEY PROTEIN TRUE MADE 1kg", v: "Vainilla", q: 2 }]);
const totalMP = precioWeb(45000) * 2 + 7000;
n0 = pedidos().length;
r = addPedido({ id: "ped1791900000010", cliente: "Beto", telefono: "11", detalle: "2x whey", monto: totalMP, pago: "Mercado Pago", envio: "Calle 1 · Envío GBA 1 · Morón", montoEnvio: 1, items: okItems, estado: "pagado", descontado: "sí", cobrado: "sí" });
check("pedido MP válido creado", r.ok && pedidos().length === n0 + 1, r);
const fila = pedidos()[pedidos().length - 1];
const kP = ctx.__keysOf("Pedidos");
check("  ...monto recalculado", fila[kP.indexOf("monto")] === totalMP, fila[kP.indexOf("monto")]);
check("  ...envío 7000 tomado del servidor", fila[kP.indexOf("montoEnvio")] === 7000);
check("  ...estado lo fija el servidor", fila[kP.indexOf("estado")] === "pendiente de pago" && fila[kP.indexOf("cobrado")] === "");
check("  ...stock descontado (5→3, Vainilla 3→1)", prod("WHEY PROTEIN TRUE MADE 1kg").cantidad === 3 && /Vainilla:1/.test(prod("WHEY PROTEIN TRUE MADE 1kg").variantes), prod("WHEY PROTEIN TRUE MADE 1kg"));
check("  ...caché borrado tras escribir", !("cat_productos_n" in cacheStore));
r = addPedido({ id: "ped1791900000010", cliente: "Beto", monto: totalMP, pago: "Mercado Pago", envio: "Calle 1 · Envío GBA 1 · Morón", items: okItems });
check("reintento mismo pedido → ok sin duplicar", r.ok && r.repetido === true && pedidos().length === n0 + 1, r);
check("  ...sin descontar de nuevo", prod("WHEY PROTEIN TRUE MADE 1kg").cantidad === 3);
r = addPedido({ id: "ped1791900000010", cliente: "Otro", monto: 33000, pago: "Efectivo", items: items([{ n: "CREATINA MONOHIDRATO  300 gr", q: 1 }]) });
check("mismo id, otra compra → rechazo", r.ok === false && /ya existe/.test(r.error));
check("bloqueo usado en escrituras", lockCalls > 5);

console.log("Combo");
r = addPedido({ id: "ped1791900000011", cliente: "C", monto: 70000 * 2, pago: "Efectivo", items: items([{ n: "Proteína + Creatina", v: "", q: 3, cv: { "WHEY PROTEIN TRUE MADE 1kg": "Vainilla" } }]) });
check("combo sin stock de un componente → rechazo", r.ok === false && /Solo quedan/.test(r.error), r);
r = addPedido({ id: "ped1791900000012", cliente: "C", monto: 70000, pago: "Efectivo", items: items([{ n: "Proteína + Creatina", v: "", q: 1, cv: { "WHEY PROTEIN TRUE MADE 1kg": "Chocolate" } }]) });
check("combo con stock → ok y descuenta componentes", r.ok && prod("CREATINA MONOHIDRATO  300 gr").cantidad === 1 && /Chocolate:1/.test(prod("WHEY PROTEIN TRUE MADE 1kg").variantes), [r, prod("WHEY PROTEIN TRUE MADE 1kg")]);

console.log("Mercado Pago");
fetches.length = 0;
r = call({ action: "mp_crear_pref", pedido: "ped1791900000010", monto: 10, envio: 0, titulo: "x", email: "b@b.com" });
const pref = JSON.parse(fetches[0].opt.payload);
const sumaItems = pref.items.reduce((a, i) => a + i.unit_price * i.quantity, 0);
check("preferencia usa el monto guardado, no el de la web", r.ok && sumaItems === totalMP, pref.items);
check("  ...envío como ítem aparte", pref.items.length === 2 && pref.items[1].unit_price === 7000);
check("pedido inexistente → rechazo", /no encontrado/.test(call({ action: "mp_crear_pref", pedido: "pedNO", monto: 10 }).error));
check("pedido no MP → rechazo", /no es por Mercado Pago/.test(call({ action: "mp_crear_pref", pedido: "ped1791900000007", monto: 10 }).error));
mpPayment = { status: "approved", external_reference: "ped1791900000010", transaction_amount: 10 };
call({ action: "mp_webhook", type: "payment", "data.id": "555" });
let est = () => pedidos().find((x) => x[0] === "ped1791900000010")[kP.indexOf("estado")];
check("webhook con monto distinto → revisar pago", est() === "revisar pago", est());
mpPayment = { status: "approved", external_reference: "ped1791900000010", transaction_amount: totalMP };
call({ action: "mp_webhook", type: "payment", "data.id": "556" });
check("webhook con monto correcto → pagado", est() === "pagado");

// Webhook repetido: no vuelve a tocar el pedido
const nNotas = () => pedidos().find((x) => x[0] === "ped1791900000010")[kP.indexOf("notas")];
const notasAntes = nNotas();
pedidos().find((x) => x[0] === "ped1791900000010")[kP.indexOf("estado")] = "Entregado";
r = call({ action: "mp_webhook", type: "payment", "data.id": "556" });
check("webhook repetido → no cambia nada", est() === "Entregado" && nNotas() === notasAntes, [est(), nNotas()]);
mpPayment = { status: "approved", external_reference: "ped1791900000010", transaction_amount: totalMP };
call({ action: "mp_webhook", type: "payment", "data.id": "557" });
check("pago nuevo sobre pedido entregado → no pisa Entregado, marca cobrado", est() === "Entregado" && pedidos().find((x) => x[0] === "ped1791900000010")[kP.indexOf("cobrado")] === "sí");

console.log("Compras simultáneas (serializadas por el bloqueo) sobre stock bajo");
// Stock de creatina: 1 unidad. 5 clientes intentan comprarla.
const kPr = ctx.__keysOf("Productos");
const filaCre = book.sheets.Productos.rows.find((x) => x[0] === "CREATINA MONOHIDRATO  300 gr");
filaCre[kPr.indexOf("cantidad")] = 2; filaCre[kPr.indexOf("stock")] = "sí";
let exitos = 0, sinStock = 0;
for (let i = 0; i < 5; i++) {
  const rr = addPedido({ id: "ped17919001000" + (10 + i), cliente: "Comprador " + i, monto: 33000, pago: "Efectivo", items: items([{ n: "CREATINA MONOHIDRATO  300 gr", q: 1 }]) });
  if (rr.ok) exitos++; else if (/Sin stock|Solo quedan/.test(rr.error)) sinStock++;
}
check("5 compradores, 2 unidades → 2 pedidos y 3 rechazos", exitos === 2 && sinStock === 3, [exitos, sinStock]);
check("  ...stock final 0 y sin negativos", prod("CREATINA MONOHIDRATO  300 gr").cantidad === 0 && prod("CREATINA MONOHIDRATO  300 gr").stock === "no", prod("CREATINA MONOHIDRATO  300 gr"));
const r1 = addPedido({ id: "ped1791900200001", cliente: "Doble", monto: 2000, pago: "Efectivo", items: items([{ n: "WHEY PROTEIN TRUE MADE 1kg", v: "Vainilla", q: 1 }]) });
const nAntesDoble = pedidos().length;
const r2 = addPedido({ id: "ped1791900200001", cliente: "Doble", monto: 2000, pago: "Efectivo", items: items([{ n: "WHEY PROTEIN TRUE MADE 1kg", v: "Vainilla", q: 1 }]) });
check("doble clic (mismo id) → un solo pedido", (r1.ok ? r2.repetido === true : true) && pedidos().length === nAntesDoble, [r1, r2]);

console.log("Pedido del CRM repetido (mismo id)");
filaCre[kPr.indexOf("cantidad")] = 5; filaCre[kPr.indexOf("stock")] = "sí";
const nCrm = pedidos().length;
const altaCrm = () => ctx.addRow("Pedidos", { id: "id1791900300000123", cliente: "Sandra", monto: "66000", pago: "Efectivo", items: items([{ n: "CREATINA MONOHIDRATO  300 gr", v: "", q: 2 }]), descontado: "no" });
altaCrm(); altaCrm(); altaCrm();
check("3 envíos del mismo pedido → 1 fila", pedidos().length === nCrm + 1, pedidos().length - nCrm);
check("  ...stock descontado una sola vez (5→3)", prod("CREATINA MONOHIDRATO  300 gr").cantidad === 3, prod("CREATINA MONOHIDRATO  300 gr"));
ctx.deleteRow("Pedidos", "id1791900300000123");
check("eliminar el pedido repone el stock (3→5)", prod("CREATINA MONOHIDRATO  300 gr").cantidad === 5 && pedidos().length === nCrm);

console.log("Avisos graves");
const mailsAntes = mails.length;
ctx.registrarError("add", new Error("Exception: Service Spreadsheets timed out"), {});
ctx.registrarError("add", new Error("Exception: Service Spreadsheets timed out"), {});
ctx.registrarError("add", new Error("Sin stock: X"), {});
check("falla grave → 1 mail (límite 1 por hora); aviso al cliente → sin mail", mails.length === mailsAntes + 1, mails.length - mailsAntes);
check("verificarPlanilla informa producción", /PRODUCCIÓN|copia/.test(ctx.verificarPlanilla()));

console.log("Comprobante, registro y fórmulas");
check("comprobante no JPEG → rechazo", /JPEG/.test(call({ action: "subir_comprobante" }, { pedido: "ped1791900000007", data: "PHNjcmlwdD4=" }).error));
check("comprobante de pedido no transferencia → rechazo", /no es por transferencia/.test(call({ action: "subir_comprobante" }, { pedido: "ped1791900000007", data: "/9j/AAAA" }).error));
check("registro con email inválido → rechazo", /Email inválido/.test(call({ action: "registrar", data: JSON.stringify({ email: "no-es-email", password: "123456" }) }).error));
const nCli = book.sheets.Clientes.rows.length;
r = call({ action: "registrar", data: JSON.stringify({ nombre: "Juan Perez", email: "otro@test.com", password: "123456" }) });
check("registro con nombre existente → fila nueva (no pisa)", r.ok && book.sheets.Clientes.rows.length === nCli + 1, r);
filaCre[kPr.indexOf("cantidad")] = 5; filaCre[kPr.indexOf("stock")] = "sí";
const rF = addPedido({ id: "ped1791900000013", cliente: "=HYPERLINK(\"http://x\")", monto: 33000, pago: "Efectivo", items: items([{ n: "CREATINA MONOHIDRATO  300 gr", q: 1 }]) }); if (!rF.ok) console.log(rF);
const fForm = pedidos().find((x) => x[0] === "ped1791900000013");
check("fórmula escapada", fForm && String(fForm[kP.indexOf("cliente")]).startsWith("'="), fForm && fForm[kP.indexOf("cliente")]);

console.log("Tareas pendientes y resumen diario");
const cantAntes = prod("WHEY PROTEIN TRUE MADE 1kg").cantidad;
const papAntes = book.sheets.Papelera ? book.sheets.Papelera.rows.length : 1;
const msg = ctx.tareasPendientes();
check("borra las 3 filas de prueba + cliente de prueba", /borradas: 4/.test(msg), msg);
check("  ...el pedido real sigue", pedidos().some((x) => x[0] === "ped1700000000000"));
check("  ...ids de prueba eliminados", !pedidos().some((x) => x[0] === "ped1791863284000" || x[0] === "hack"));
check("  ...repone el stock del pedido de prueba", prod("WHEY PROTEIN TRUE MADE 1kg").cantidad === cantAntes + 1, [cantAntes, prod("WHEY PROTEIN TRUE MADE 1kg").cantidad]);
check("  ...cliente de prueba eliminado", !book.sheets.Clientes.rows.some((x) => x.includes("no-es-email")));
check("  ...todo queda en Papelera", book.sheets.Papelera && book.sheets.Papelera.rows.length === papAntes + 4);
pedidos().find((x) => x[0] === "ped1791900000010")[kP.indexOf("estado")] = "revisar pago";
const res = ctx.resumenDiario();
check("resumen diario manda mail con errores y pagos a revisar", mails.length >= 1 && /avisos del sistema/.test(mails[mails.length - 1].subj) && /Errores/.test(mails[mails.length - 1].body) && /revisar/.test(mails[mails.length - 1].body), res);

console.log("Límite contra abuso");
limpiarLimites = true; call({ action: "version" }); // contadores en cero
limpiarLimites = false;
filaCre[kPr.indexOf("cantidad")] = 50; filaCre[kPr.indexOf("stock")] = "sí";
const nRL = pedidos().length;
const altaWeb = (i, extra = {}) => addPedido(Object.assign({ id: "ped17919005" + String(i).padStart(5, "0"), cliente: "Comprador RL", telefono: "11 5555-0000", monto: 33000, pago: "Efectivo", envio: "", items: items([{ n: "CREATINA MONOHIDRATO  300 gr", q: 1 }]) }, extra));
const rRL = [1, 2, 3, 4, 5, 6].map((i) => altaWeb(i));
check("mismo teléfono: 5 pedidos pasan, el 6.º recibe el aviso amable", rRL.slice(0, 5).every((r) => r.ok) && /muchos intentos/.test(rRL[5].error || ""), rRL.map((r) => r.ok || r.error));
check("  ...el rechazo no crea fila ni se anota en Errores", pedidos().length === nRL + 5 && !book.sheets.Errores.rows.some((r) => /muchos intentos/.test(String(r[2]))));
check("otro cliente sigue pudiendo comprar", altaWeb(7, { telefono: "11 6666-1111", cliente: "Otro" }).ok === true);
check("campo trampa completado → rechazo sin crear fila", /No pudimos procesar/.test(altaWeb(8, { telefono: "11 7777-2222", hp_sm: "http://spam" }).error || "") && !pedidos().some((x) => x[0] === "ped1791900500008"));
const susc = [1, 2, 3, 4].map(() => call({ action: "add", tab: "Suscriptores", data: JSON.stringify({ email: "spam@test.com" }) }));
if (!(susc.slice(0, 3).every((r) => r.ok))) console.log("   susc:", JSON.stringify(susc));
check("suscriptor: 3 intentos por email y después aviso", susc.slice(0, 3).every((r) => r.ok) && /muchos intentos/.test(susc[3].error || ""));
book.sheets.Clientes.rows.push(rowFrom("Clientes", { id: "c9", nombre: "Lu", email: "lu@test.com", clave: ctx.nuevaClave("buena") }));
const malos = [1, 2, 3, 4, 5].map(() => call({ action: "login", email: "lu@test.com", password: "mala" }));
const tras5 = call({ action: "login", email: "lu@test.com", password: "buena" });
check("login: tras 5 claves incorrectas, bloqueo aunque la clave sea buena", malos.every((r) => r.ok === false) && tras5.ok === false && /15 minutos/.test(tras5.error), tras5);
delete cacheStore["loginfail_lu@test.com"];
check("  ...pasado el bloqueo, la clave buena entra", call({ action: "login", email: "lu@test.com", password: "buena" }).ok === true);
const nCrmRL = pedidos().length;
for (let i = 0; i < 8; i++) ctx.handle({ parameter: { action: "version" } }); // el CRM con token no pasa por el límite (se prueba con addRow directo)
for (let i = 0; i < 8; i++) ctx.addRow("Pedidos", { id: "idRL" + i, cliente: "Comprador RL", telefono: "11 5555-0000", monto: "1", pago: "Efectivo", items: "[]" });
check("CRM: sin límite (8 altas del mismo cliente)", pedidos().length === nCrmRL + 8);
limpiarLimites = true;

console.log("Envío gratis desde $120.000");
book.sheets.Productos.rows.push(rowFrom("Productos", { nombre: "Combo grande", categoria: "Combos", precio: 110000, stock: "sí", cantidad: 10 }), rowFrom("Productos", { nombre: "Chico", categoria: "Varios", precio: 1000, stock: "sí", cantidad: 50 }));
const eg = (i, extra) => addPedido(Object.assign({ id: "ped17919009" + String(i).padStart(5, "0"), cliente: "Cliente envío " + i, telefono: "11 4000-00" + String(i).padStart(2, "0"), pago: "Transferencia", envio: "Calle 1 · Envío GBA 1 · Morón" }, extra));
const egA = eg(1, { monto: 110000, items: items([{ n: "Combo grande", q: 1 }]) });
check("compra desde $120.000 (precio web $122.200): envío gratis", egA.ok === true && pedidos().some((x) => x[0] === "ped1791900900001"), egA);
const egB = eg(2, { monto: 17000, items: items([{ n: "Chico", q: 10 }]) });
check("compra chica ($11.000 web): se cobra el envío GBA 1", egB.ok === true, egB);
const egC = eg(3, { monto: 117000, items: items([{ n: "Combo grande", q: 1 }]) });
check("compra grande cobrando envío → rechazo (la web y el CRM calculan igual)", egC.ok === false && /Los precios se actualizaron/.test(egC.error || ""), egC);

console.log("Compras de mercadería");
check("Compras sin token → auth (ver)", call({ action: "list", tab: "Compras" }).error === "auth");
check("Compras sin token → auth (cargar)", call({ action: "add", tab: "Compras", data: JSON.stringify({ proveedor: "X" }) }).error === "auth");
check("  ...y no se creó la pestaña", !book.sheets.Compras);
ctx.addRow("Compras", { fecha: "2026-10-20", proveedor: "Distribuidora Sur", detalle: "10x Creatina 300 g", total: "250000", pago: "Transferencia" });
check("CRM: primera compra crea la pestaña Compras con títulos", !!book.sheets.Compras && book.sheets.Compras.rows[0][2] === "Proveedor");
const lc = ctx.listTable("Compras");
check("  ...y se lista con id, proveedor y total", lc.length === 1 && /^id\d+/.test(lc[0].id) && lc[0].proveedor === "Distribuidora Sur" && String(lc[0].total) === "250000", lc);

console.log("Compras que suman stock");
const kPc = ctx.keysOf("Productos");
const prodRow = (n) => book.sheets.Productos.rows.find((r) => String(r[0]).toLowerCase() === n.toLowerCase());
const cant = (n) => Number(prodRow(n)[kPc.indexOf("cantidad")]) || 0;
const varQ = (n, v) => { const m = String(prodRow(n)[kPc.indexOf("variantes")]).match(new RegExp(v + ":(\\d+)")); return m ? Number(m[1]) : null; };
const W = "WHEY PROTEIN TRUE MADE 1kg", CR = "CREATINA MONOHIDRATO  300 gr";
const w0 = cant(W), wv0 = varQ(W, "Vainilla"), c0 = cant(CR);
ctx.addRow("Compras", { id: "idCS1", proveedor: "El Nogal", detalle: "4 x ENA · Whey · $1 c/u", total: "4", items: JSON.stringify([{ n: W, v: "Vainilla", q: 4 }, { n: CR, q: 3 }]) });
const fC = () => book.sheets.Compras.rows.find((r) => r[0] === "idCS1");
check("compra nueva: suma al total, a la variante y marca 'Stock sumado'", cant(W) === w0 + 4 && varQ(W, "Vainilla") === wv0 + 4 && cant(CR) === c0 + 3 && fC()[ctx.keysOf("Compras").indexOf("sumado")] === "sí", [cant(W), w0, varQ(W, "Vainilla"), wv0, cant(CR), c0]);
ctx.updateRow("Compras", "idCS1", { items: JSON.stringify([{ n: CR, q: 1 }]) });
check("editar la compra: resta lo viejo y suma lo nuevo", cant(W) === w0 && varQ(W, "Vainilla") === wv0 && cant(CR) === c0 + 1, [cant(W), cant(CR)]);
ctx.deleteRow("Compras", "idCS1");
check("borrar la compra: devuelve el stock", cant(W) === w0 && cant(CR) === c0, [cant(W), cant(CR)]);
const cAntes = cant(CR);
ctx.updateRow("Compras", lc[0].id, { items: JSON.stringify([{ n: CR, q: 5 }]) });
check("compra vieja (sin 'Stock sumado'): editarla no toca el stock", cant(CR) === cAntes);

console.log("Compras con productos nuevos");
const nProd0 = book.sheets.Productos.rows.length;
ctx.addRow("Compras", { id: "idCN1", proveedor: "El Nogal", detalle: "4 x Gold · Proteína Nueva Chocolate · $50.000 c/u", total: "200000", items: JSON.stringify([{ nuevo: true, n: "Proteína Nueva Chocolate", marca: "Gold Nutrition", q: 4, costo: 50000 }]) });
const pn = prodRow("Proteína Nueva Chocolate");
check("producto nuevo: se crea con marca, costo y las unidades compradas", !!pn && book.sheets.Productos.rows.length === nProd0 + 1 && pn[kPc.indexOf("marca")] === "Gold Nutrition" && Number(pn[kPc.indexOf("costo")]) === 50000 && cant("Proteína Nueva Chocolate") === 4, pn);
check("  ...sin precio (no aparece en la web hasta completarlo)", Number(pn[kPc.indexOf("precio")]) === 0);
ctx.addRow("Compras", { id: "idCN2", proveedor: "El Nogal", detalle: "2 x Gold · Proteína Nueva Chocolate · $50.000 c/u", total: "100000", items: JSON.stringify([{ nuevo: true, n: "Proteína Nueva Chocolate", marca: "Gold Nutrition", q: 2, costo: 50000 }]) });
check("segunda compra del mismo producto: no lo duplica, suma stock", book.sheets.Productos.rows.length === nProd0 + 1 && cant("Proteína Nueva Chocolate") === 6);
ctx.deleteRow("Compras", "idCN2");
check("borrar esa compra: resta su stock (el producto queda)", cant("Proteína Nueva Chocolate") === 4 && !!prodRow("Proteína Nueva Chocolate"));

console.log("Compras: leer fotos, archivos y texto con Claude");
{
  const drive = [];
  let claude = null, claudeReq = null;
  ctx.Utilities.base64Decode = (b) => Array.from(Buffer.from(b, "base64"));
  ctx.Utilities.newBlob = (bytes, tipo, nombre) => ({ bytes, tipo, nombre });
  ctx.DriveApp.getFoldersByName = () => ({ hasNext: () => false });
  ctx.DriveApp.createFolder = () => ({ createFile: (blob) => { drive.push(blob); return { getId: () => "F" + drive.length, getUrl: () => "https://drive.google.com/file/d/F" + drive.length }; } });
  const fetchOrig = ctx.UrlFetchApp.fetch;
  ctx.UrlFetchApp.fetch = (url, opt) => {
    if (url.indexOf("api.anthropic.com") === -1) return fetchOrig(url, opt);
    claudeReq = { url, opt, body: JSON.parse(opt.payload) };
    return { getResponseCode: () => claude.code, getContentText: () => JSON.stringify(claude.json) };
  };
  const foto = { job: "jobA", nombre: "factura.jpg", tipo: "image/jpeg", data: Buffer.from("imagen-falsa").toString("base64"), catalogo: ['"CREATINA MONOHIDRATO  300 gr||" · marca: ENA'] };

  let r = ctx.compraArchivo(foto);
  check("sin clave de Claude: el archivo se guarda igual y avisa qué falta", r.ok && r.archivo.id === "F1" && /ANTHROPIC_API_KEY/.test(r.errorLectura) && drive.length === 1 && !claudeReq, r);
  check("  ...el resultado queda para que el CRM lo consulte", ctx.compraArchivoEstado({ job: "jobA" }).archivo.id === "F1");
  check("trabajo desconocido → pendiente", ctx.compraArchivoEstado({ job: "otro" }).pendiente === true);

  props.ANTHROPIC_API_KEY = "sk-ant-prueba";
  claude = { code: 200, json: { stop_reason: "end_turn", content: [
    { type: "thinking", thinking: "" },
    { type: "text", text: JSON.stringify({ proveedor: " El Nogal ", fecha: "22/10/2026", total: 45365.4, notas: "", dudas: "",
      items: [
        { marca: "ENA", producto: "Creatina Monohidrato 300 g", variante: "", cantidad: 3, precioUnitario: 15121.8, catalogo: "CREATINA MONOHIDRATO  300 gr||" },
        { marca: "", producto: "", variante: "", cantidad: 1, precioUnitario: 1, catalogo: "" },
        { marca: "Star", producto: "Whey", variante: "Vainilla", cantidad: -2, precioUnitario: "x", catalogo: "" },
      ] }) },
  ] } };
  r = ctx.compraArchivo(Object.assign({}, foto, { job: "jobB" }));
  const a = r.analisis || {};
  check("foto leída: proveedor, productos, cantidades y precios", r.ok && a.proveedor === "El Nogal" && a.items.length === 2 && a.items[0].cantidad === 3 && a.items[0].precioUnitario === 15121.8 && a.items[0].catalogo === "CREATINA MONOHIDRATO  300 gr||", a);
  check("  ...descarta renglones vacíos y números inválidos; fecha inválida queda vacía", a.items[1].cantidad === 0 && a.items[1].precioUnitario === 0 && a.fecha === "");
  const req = claudeReq.body, h = claudeReq.opt.headers;
  check("pedido a Claude: modelo, versión de API, clave por header y salida con esquema", req.model === "claude-haiku-5-5" && h["anthropic-version"] === "2026-10-21" && h["x-api-key"] === "sk-ant-prueba" && req.output_config.format.type === "json_schema" && !("fallbacks" in req) && !h["anthropic-beta"]);
  check("  ...la foto va como imagen y el catálogo en el mensaje", req.messages[0].content[0].type === "image" && req.messages[0].content[0].source.media_type === "image/jpeg" && /CREATINA MONOHIDRATO/.test(req.messages[0].content[1].text));
  check("  ...sin temperature/top_p (la versión 2026-10-21 los rechaza)", !("temperature" in req) && !("top_p" in req) && !("top_k" in req));

  const nDrive = drive.length;
  r = ctx.compraArchivo({ job: "jobC", texto: "El Nogal: 3 creatinas ENA 300 g a 15.121,80", catalogo: [] });
  check("compra escrita a mano: se lee sin guardar nada en Drive", r.ok && !r.archivo && drive.length === nDrive && claudeReq.body.messages[0].content[0].type === "text" && /3 creatinas/.test(claudeReq.body.messages[0].content[0].text));

  r = ctx.compraArchivo({ job: "jobD", nombre: "lista.xlsx", tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data: Buffer.from("zip").toString("base64"), texto: "Producto | Cant | Precio\nCreatina | 3 | 15121,80" });
  check("Excel: se guarda el original y se lee el texto extraído", r.ok && r.archivo && claudeReq.body.messages[0].content[0].type === "text" && /lista\.xlsx/.test(claudeReq.body.messages[0].content[0].text));

  r = ctx.compraArchivo({ job: "jobE", nombre: "x.zip", tipo: "application/zip", data: Buffer.from("zip").toString("base64") });
  check("tipo que no se puede leer: se guarda y avisa", r.ok && r.archivo && /no se puede leer/.test(r.errorLectura));

  claude = { code: 401, json: { error: { message: "invalid x-api-key" } } };
  r = ctx.compraArchivo(Object.assign({}, foto, { job: "jobF" }));
  check("clave inválida: mensaje claro", /no es válida/.test(r.errorLectura));
  claude = { code: 200, json: { stop_reason: "max_tokens", content: [] } };
  r = ctx.compraArchivo({ job: "jobG", texto: "mucho" });
  check("respuesta cortada (texto solo): error claro", r.ok === false && /muy largo/.test(r.error));
  check("sin archivo ni texto: error", ctx.compraArchivo({ job: "jobH" }).ok === false);
  check("sin token: no se puede leer ni consultar", call({ action: "compra_archivo_estado", job: "jobB" }).error === "auth" && call({ action: "compra_archivo", job: "z" }, { texto: "x" }).error === "auth");
  delete props.ANTHROPIC_API_KEY;
  ctx.UrlFetchApp.fetch = fetchOrig;
}

console.log("Compras pendientes (se revisan y se suman después)");
{
  const sumado = (id) => { const k = ctx.keysOf("Compras"); return book.sheets.Compras.rows.find((r) => r[0] === id)[k.indexOf("sumado")]; };
  const itemsDe = (id) => { const k = ctx.keysOf("Compras"); return book.sheets.Compras.rows.find((r) => r[0] === id)[k.indexOf("items")]; };
  const c0 = cant("CREATINA MONOHIDRATO  300 gr");
  ctx.addRow("Compras", { id: "idPend1", proveedor: "El Nogal", detalle: "2 x Star · Creatina", total: "40000", sumar: "no", items: JSON.stringify([{ n: "CREATINA MONOHIDRATO  300 gr", q: 2, i: 0 }]) });
  check("guardada sin sumar: queda pendiente y el stock no cambia", sumado("idPend1") === "no" && cant("CREATINA MONOHIDRATO  300 gr") === c0 && /CREATINA/.test(itemsDe("idPend1")));
  ctx.updateRow("Compras", "idPend1", { proveedor: "El Nogal", items: JSON.stringify([{ n: "CREATINA MONOHIDRATO  300 gr", q: 3, i: 0 }]) });
  check("  ...editarla cambia los productos sin tocar el stock", cant("CREATINA MONOHIDRATO  300 gr") === c0 && /"q":3/.test(itemsDe("idPend1")) && sumado("idPend1") === "no");
  let r = call({ action: "compra_sumar_stock", id: "idPend1" });
  check("sin token no se puede sumar", r.error === "auth" && cant("CREATINA MONOHIDRATO  300 gr") === c0);
  ctx.compraSumarStock("idPend1");
  check("sumar al stock: suma las unidades y queda marcada", cant("CREATINA MONOHIDRATO  300 gr") === c0 + 3 && sumado("idPend1") === "sí");
  const otra = ctx.compraSumarStock("idPend1");
  check("  ...sumar de nuevo (doble clic) no vuelve a sumar", otra.yaEstaba === true && cant("CREATINA MONOHIDRATO  300 gr") === c0 + 3);
  ctx.addRow("Compras", { id: "idPend2", proveedor: "X", detalle: "1 x Star · Creatina", total: "1", sumar: "no", items: JSON.stringify([{ n: "CREATINA MONOHIDRATO  300 gr", q: 1, i: 0 }]) });
  ctx.updateRow("Compras", "idPend2", { proveedor: "X", sumar: "sí", items: JSON.stringify([{ n: "CREATINA MONOHIDRATO  300 gr", q: 4, i: 0 }]) });
  check("editar una pendiente con 'sumar al stock': suma lo editado una sola vez", cant("CREATINA MONOHIDRATO  300 gr") === c0 + 7 && sumado("idPend2") === "sí");
  ctx.addRow("Compras", { id: "idPend3", proveedor: "X", detalle: "1 x Star · Creatina", total: "1", items: JSON.stringify([{ n: "CREATINA MONOHIDRATO  300 gr", q: 1, i: 0 }]) });
  check("sin indicar nada (CRM viejo): suma al guardar como antes", cant("CREATINA MONOHIDRATO  300 gr") === c0 + 8 && sumado("idPend3") === "sí");
  ctx.addRow("Compras", { id: "idPend4", proveedor: "X", detalle: "1 x Algo", total: "1", sumar: "no", items: "[]" });
  let err = ""; try { ctx.compraSumarStock("idPend4"); } catch (e) { err = e.message; }
  check("pendiente sin productos asociados: avisa y no suma", /no tiene productos/.test(err));
  ctx.deleteRow("Compras", "idPend1"); ctx.deleteRow("Compras", "idPend2"); ctx.deleteRow("Compras", "idPend3"); ctx.deleteRow("Compras", "idPend4");
  check("borrar las compras sumadas resta lo sumado (vuelve al stock inicial)", cant("CREATINA MONOHIDRATO  300 gr") === c0);
}

console.log("Copias automáticas");
const mq = ctx.quitarBackupsAutomaticos();
check("quita los 2 disparadores de copias y deja 1 de avisos", triggers.length === 1 && triggers[0].getHandlerFunction() === "resumenDiario", [mq, triggers.map((t) => t.getHandlerFunction())]);
ctx.quitarBackupsAutomaticos();
check("  ...repetirlo no agrega otro", triggers.length === 1);

console.log(`\n${ok} OK · ${fail} fallas`);
process.exit(fail ? 1 : 0);
