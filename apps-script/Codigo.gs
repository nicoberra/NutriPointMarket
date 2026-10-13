/* ============================================================================
 * NUTRIPOINTMARKET · BACKEND (Google Apps Script)
 * ----------------------------------------------------------------------------
 * API entre la planilla de Google Sheets y la tienda / el CRM.
 *
 * MODELO DE PRODUCTOS (importante):
 *   - El CATÁLOGO (nombre, categoría, descripción, fotos, sabores) vive en el
 *     código de la web (data/products.ts). Casi no cambia.
 *   - La PLANILLA guarda solo lo que cambia seguido: Precio, Stock (sí/no),
 *     Precio ML (precio tachado, opcional) y Destacado (sí/no).
 *   - La web cruza ambos por el NOMBRE del producto (tiene que coincidir EXACTO).
 *
 * PUESTA EN MARCHA (una vez): Extensiones → Apps Script → pegar esto → guardar →
 * ejecutar `setup` (autorizar) → Deploy → Aplicación web (Ejecutar como: Yo /
 * Acceso: Cualquier usuario) → copiar la URL /exec.
 * Al cambiar el código: Deploy → Administrar implementaciones → editar → Versión
 * nueva → Desplegar. (Guardar NO publica.)
 * ============================================================================ */

var SHEET_ID = "12paAzW6OcSgYv4u6L7QVI4tpvrEx1yqnujW0OjcieMc";
var API_VERSION = "v3"; // v3: validación de pedidos, bloqueo, caché y registro de errores

// Repo de GitHub donde se guardan las fotos de productos (en public/productos/).
// El token NO va acá: se guarda en Propiedades del script como GITHUB_TOKEN.
var GITHUB_REPO = "nicoberra/NutriPointMarket";
var GITHUB_BRANCH = "main";

// Dominio del sitio (para las páginas de retorno de Mercado Pago).
var SITE_URL = "https://suplemarket.com.ar";

// Modelo de precios (tiene que coincidir con lib/config.ts): la planilla guarda
// el precio CON transferencia; la web publica ese precio + 10% redondeado a la
// centena. Mercado Pago cobra el precio publicado; transferencia/efectivo el base.
var DESCUENTO_TRANSFERENCIA = 0.1;
// Costos de envío por zona (tienen que coincidir con lib/envios.ts).
var ENVIOS = { "Capital": 5500, "GBA 1": 7000, "GBA 2": 9000, "GBA 3": 15000 };
// Tamaño máximo del comprobante (base64, ~2.5 MB de imagen).
var COMPROBANTE_MAX_B64 = 3500000;

/* ----------------------------- ESQUEMA DE TABLAS -------------------------- */

var TABLES = {
  Productos: {
    // Fuente COMPLETA de productos. Vos agregás filas acá y aparecen en la web.
    // La clave (para actualizar) es "nombre".
    columns: [
      ["nombre", "Nombre"],
      ["marca", "Marca"],
      ["categoria", "Categoría"],
      ["precio", "Precio"],
      ["precioML", "Precio ML"],
      ["variantes", "Variantes"],
      ["stock", "Stock"],
      ["destacado", "Destacado"],
      ["costo", "Costo"],
      ["costoMoneda", "Costo moneda"],
      ["imagen", "Imagen"],
      ["cantidad", "Cantidad"],
      ["variantesFotos", "Variantes fotos"],
      ["descripcion", "Descripción"],
      ["modoUso", "Modo de uso"],
      ["infoNutricional", "Información nutricional"],
      ["ingredientes", "Ingredientes"],
      ["combo", "Combo"],
    ],
    idField: "nombre",
  },
  Categorias: {
    // Categorías de la tienda, editables desde el CRM. La clave es "nombre".
    columns: [
      ["nombre", "Nombre"],
      ["orden", "Orden"],
      ["imagen", "Imagen"],
    ],
    idField: "nombre",
  },
  Suscriptores: {
    columns: [
      ["fecha", "Fecha"],
      ["email", "Email"],
    ],
    idField: null,
  },
  Clientes: {
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["nombre", "Nombre"],
      ["telefono", "Teléfono"],
      ["email", "Email"],
      ["ciudad", "Ciudad"],
      ["notas", "Notas"],
      ["dni", "CUIT/DNI"],
      ["direccion", "Dirección"],
      ["origen", "Origen"],
      ["clave", "Clave"],
    ],
    idField: "id",
    secret: ["clave"],
  },
  Pedidos: {
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["cliente", "Cliente"],
      ["telefono", "Teléfono"],
      ["detalle", "Detalle"],
      ["monto", "Monto"],
      ["estado", "Estado"],
      ["notas", "Notas"],
      ["envio", "Envío"],
      ["envioCobrado", "Envío cobrado"],
      ["montoEnvio", "Monto envío"],
      ["costo", "Costo"],
      ["pago", "Pago"],
      ["items", "Items"],
      ["descontado", "Descontado"],
      ["comprobante", "Comprobante"],
      ["cobrado", "Cobrado"],
    ],
    idField: "id",
  },
  Seguimientos: {
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["cliente", "Cliente"],
      ["telefono", "Teléfono"],
      ["motivo", "Motivo"],
      ["fechaObjetivo", "Fecha objetivo"],
      ["estado", "Estado"],
      ["notas", "Notas"],
    ],
    idField: "id",
  },
  Eventos: {
    columns: [
      ["fecha", "Fecha"],
      ["tipo", "Tipo"],
      ["item", "Item"],
      ["sesion", "Sesión"],
      ["fuente", "Fuente"],
      ["contacto", "Contacto"],
      ["monto", "Monto"],
      ["pais", "País"],
      ["region", "Región"],
      ["ciudad", "Ciudad"],
      ["dispositivo", "Dispositivo"],
      ["so", "SO"],
      ["navegador", "Navegador"],
      ["idioma", "Idioma"],
      ["pantalla", "Pantalla"],
    ],
    idField: null,
  },
};

/* ================================ ROUTER ================================== */

function doGet(e) {
  return handle(e);
}
function doPost(e) {
  return handle(e);
}

function handle(e) {
  var p = (e && e.parameter) || {};
  // Subidas de imagen llegan por POST con el JSON en el cuerpo.
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      for (var k in body) p[k] = body[k];
    } catch (err) {}
  }
  var action = p.action || "version";
  var out;
  try {
    // ---- Seguridad ---------------------------------------------------------
    // Solo las acciones que necesita la tienda pública entran sin token (ver
    // esAccionPublica). Todo lo demás (CRM) exige el token que devuelve
    // crm_login; si falta o venció, responde {ok:false, error:"auth"}.
    var esAdmin = tokenValido(p.token);
    if (!esAdmin && !esAccionPublica(action, p)) {
      return respond({ ok: false, error: "auth" }, p.callback);
    }
    // Las escrituras van de a una (bloqueo): así dos pedidos simultáneos no
    // pisan el stock. Al terminar se borra el caché del catálogo.
    if (ACCIONES_ESCRITURA[action]) {
      out = conBloqueo(function () { return ejecutar(action, p, e, esAdmin); });
    } else {
      out = ejecutar(action, p, e, esAdmin);
    }
  } catch (err) {
    registrarError(action, err, p);
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return respond(out, p.callback);
}

// Acciones que escriben en la planilla (se ejecutan con bloqueo).
var ACCIONES_ESCRITURA = {
  productos_save: 1, add: 1, update: 1, delete: 1, categoria_rename: 1, producto_rename: 1,
  subir_imagen: 1, borrar_imagen: 1, subir_comprobante: 1, mp_webhook: 1, aprobar_pedido: 1, registrar: 1,
};

function conBloqueo(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error("Hay mucha demanda en este momento. Probá de nuevo en unos segundos.");
  }
  try {
    return fn();
  } finally {
    try { borrarCacheCatalogo(); } catch (eC) {}
    lock.releaseLock();
  }
}

function ejecutar(action, p, e, esAdmin) {
  var out;
    switch (action) {
      case "version":
        out = { ok: true, version: API_VERSION };
        break;
      case "productos_list":
        // Con token (CRM) incluye costos y siempre lee la planilla; la tienda
        // pública usa el caché (se borra con cada cambio).
        out = { ok: true, data: esAdmin ? listProductos(true) : leerCacheado("cat_productos", function () { return listProductos(false); }) };
        break;
      case "productos_save":
        out = { ok: true, data: saveProducto(parseData(p)) };
        break;
      case "list":
        out = {
          ok: true,
          data: !esAdmin && p.tab === "Categorias"
            ? leerCacheado("cat_categorias", function () { return listTable("Categorias"); })
            : listTable(p.tab),
        };
        break;
      case "add":
        // Sin token (tienda pública) solo pasan los campos permitidos y el
        // monto se recalcula acá con los precios de la planilla.
        if (esAdmin) {
          out = { ok: true, data: addRow(p.tab, parseData(p)) };
        } else {
          var alta = validarAltaPublica(p.tab, parseData(p));
          // Reintento del mismo pedido (misma compra): no se duplica.
          out = alta.__repetido
            ? { ok: true, data: { id: alta.id }, repetido: true }
            : { ok: true, data: addRow(p.tab, alta) };
        }
        break;
      case "update":
        out = { ok: true, data: updateRow(p.tab, p.id, parseData(p)) };
        break;
      case "delete":
        out = { ok: true, data: deleteRow(p.tab, p.id) };
        break;
      case "categoria_rename":
        out = { ok: true, data: categoriaRename(p.from, p.to) };
        break;
      case "producto_rename":
        out = { ok: true, data: productoRename(p.from, p.to) };
        break;
      case "subir_imagen":
        out = subirImagen(p);
        break;
      case "borrar_imagen":
        out = borrarImagen(p);
        break;
      case "subir_comprobante":
        out = subirComprobante(p);
        break;
      case "mp_crear_pref":
        out = mpCrearPreferencia(p);
        break;
      case "mp_webhook":
        out = mpWebhook(p, e);
        break;
      case "aprobar_pedido":
        out = aprobarPedido(p.id);
        break;
      case "registrar":
        out = registrar(parseData(p));
        break;
      case "login":
        out = login(p.email, p.password);
        break;
      case "crm_login":
        out = crmLogin(p.pin);
        break;
      case "crm_logout":
        out = crmLogout(p.token);
        break;
      default:
        out = { ok: false, error: "Acción desconocida: " + action };
    }
  return out;
}

function respond(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ")").setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* ============================ ACCESO A LA PLANILLA ======================== */

function ss() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}
function sheetFor(tab) {
  var sh = ss().getSheetByName(tab);
  if (!sh) throw new Error("No existe la pestaña: " + tab);
  return sh;
}
function keysOf(tab) {
  return TABLES[tab].columns.map(function (c) {
    return c[0];
  });
}

function listTable(tab) {
  if (!TABLES[tab]) throw new Error("Pestaña inválida: " + tab);
  var sh = sheetFor(tab);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var keys = keysOf(tab);
  var secret = TABLES[tab].secret || [];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join("") === "") continue;
    var obj = {};
    for (var c = 0; c < keys.length; c++) {
      if (secret.indexOf(keys[c]) !== -1) continue;
      obj[keys[c]] = formatValue(row[c]);
    }
    rows.push(obj);
  }
  return rows;
}

function formatValue(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "GMT-3", "yyyy-MM-dd HH:mm");
  return v;
}

/* ------------------------------- Escritura ------------------------------- */

function addRow(tab, obj) {
  if (!TABLES[tab]) throw new Error("Pestaña inválida: " + tab);
  var sh = sheetFor(tab);
  var keys = keysOf(tab);
  if (tab === "Clientes" && !obj.sinFusion) {
    var existing = findClienteRow(obj);
    if (existing > 0) return updateRowByNumber(tab, existing, obj);
  }
  delete obj.sinFusion;
  if (TABLES[tab].idField === "id" && !obj.id) obj.id = "id" + Date.now();
  if (keys.indexOf("fecha") !== -1 && !obj.fecha) obj.fecha = now();
  // Pedidos: el stock se descuenta al crear el pedido (web o CRM). Si el
  // pedido se elimina, deleteRow lo repone. "Aprobar" ya no descuenta de nuevo.
  if (tab === "Pedidos") {
    var itemsP = [];
    try { itemsP = JSON.parse(obj.items || "[]"); } catch (eP) {}
    if (itemsP.length && String(obj.descontado || "").trim().toLowerCase() !== "sí") {
      for (var ip = 0; ip < itemsP.length; ip++) {
        descontarProducto(itemsP[ip].n, Number(itemsP[ip].q) || 0, itemsP[ip].v, itemsP[ip].cv);
      }
      obj.descontado = "sí";
    }
  }
  var line = keys.map(function (k) {
    return sanitize(k, obj[k]);
  });
  sh.appendRow(line);
  return obj;
}

function updateRow(tab, id, obj) {
  var n = findRowById(tab, id);
  if (n < 0) throw new Error("No se encontró: " + id);
  if (tab === "Pedidos" && obj.hasOwnProperty("items")) ajustarStockPorEdicion(n, obj);
  return updateRowByNumber(tab, n, obj);
}

// Al editar los productos de un pedido: repone lo que tenía (si ya se había
// descontado) y descuenta lo nuevo, así el stock queda por la diferencia.
function ajustarStockPorEdicion(n, obj) {
  var sh = sheetFor("Pedidos");
  var keys = keysOf("Pedidos");
  var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
  var viejo = String(row[keys.indexOf("items")] || "[]");
  var nuevo = String(obj.items || "[]");
  if (viejo === nuevo) return;
  var yaDesc = String(row[keys.indexOf("descontado")] || "").trim().toLowerCase() === "sí";
  var itemsV = [], itemsN = [];
  try { itemsV = JSON.parse(viejo); } catch (e1) {}
  try { itemsN = JSON.parse(nuevo); } catch (e2) {}
  if (yaDesc) {
    for (var i = 0; i < itemsV.length; i++) ajustarProducto(itemsV[i].n, Number(itemsV[i].q) || 0, itemsV[i].v, itemsV[i].cv, +1);
  }
  for (var j = 0; j < itemsN.length; j++) ajustarProducto(itemsN[j].n, Number(itemsN[j].q) || 0, itemsN[j].v, itemsN[j].cv, -1);
  obj.descontado = "sí";
}

function updateRowByNumber(tab, rowNumber, obj) {
  var sh = sheetFor(tab);
  var keys = keysOf(tab);
  var current = sh.getRange(rowNumber, 1, 1, keys.length).getValues()[0];
  for (var c = 0; c < keys.length; c++) {
    if (obj.hasOwnProperty(keys[c]) && obj[keys[c]] !== "") {
      current[c] = sanitize(keys[c], obj[keys[c]]);
    }
  }
  sh.getRange(rowNumber, 1, 1, keys.length).setValues([current]);
  return obj;
}

function deleteRow(tab, id) {
  var n = findRowById(tab, id);
  if (n < 0) throw new Error("No se encontró: " + id);
  // Si es un pedido con el pago aprobado (stock ya descontado), repone el
  // stock de cada producto antes de borrarlo.
  if (tab === "Pedidos") reponerStockPedido(n);
  guardarEnPapelera(tab, n);
  sheetFor(tab).deleteRow(n);
  return { deleted: id };
}

// Copia la fila a la pestaña "Papelera" (se crea sola) antes de borrarla, con
// fecha y pestaña de origen. Para recuperar: copiar los valores de vuelta.
function guardarEnPapelera(tab, n) {
  try {
    var sh = sheetFor(tab);
    var keys = keysOf(tab);
    var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
    var book = ss();
    var pap = book.getSheetByName("Papelera");
    if (!pap) {
      pap = book.insertSheet("Papelera");
      pap.appendRow(["Borrado el", "Pestaña", "Datos (en el orden de las columnas de esa pestaña)"]);
      pap.getRange(1, 1, 1, 3).setFontWeight("bold");
      pap.setFrozenRows(1);
    }
    pap.appendRow([now(), tab].concat(row));
  } catch (e) {
    // La papelera nunca debe impedir la operación, pero sí quedar registrada.
    console.error("Papelera: " + e);
  }
}

function reponerStockPedido(n) {
  var sh = sheetFor("Pedidos");
  var keys = keysOf("Pedidos");
  var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
  var desc = String(row[keys.indexOf("descontado")] || "").trim().toLowerCase();
  if (desc !== "sí") return;
  var items = [];
  try { items = JSON.parse(row[keys.indexOf("items")] || "[]"); } catch (e) {}
  for (var i = 0; i < items.length; i++) {
    ajustarProducto(items[i].n, Number(items[i].q) || 0, items[i].v, items[i].cv, +1);
  }
}

function findRowById(tab, id) {
  // Un id vacío no puede coincidir con una fila sin id: sería borrar/editar
  // una fila cualquiera.
  if (id === undefined || id === null || String(id).trim() === "") return -1;
  var sh = sheetFor(tab);
  var keys = keysOf(tab);
  var idCol = keys.indexOf(TABLES[tab].idField);
  if (idCol < 0) return -1;
  var last = Math.max(sh.getLastRow() - 1, 0);
  if (last === 0) return -1;
  var col = sh.getRange(2, idCol + 1, last, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (low(col[i][0]) === low(id)) return i + 2;
  }
  return -1;
}

function findClienteRow(obj) {
  var sh = sheetFor("Clientes");
  var keys = keysOf("Clientes");
  var data = sh.getDataRange().getValues();
  var iEmail = keys.indexOf("email"),
    iDni = keys.indexOf("dni"),
    iNom = keys.indexOf("nombre");
  for (var r = 1; r < data.length; r++) {
    if (obj.email && data[r][iEmail] && low(data[r][iEmail]) === low(obj.email)) return r + 1;
    if (obj.dni && data[r][iDni] && String(data[r][iDni]) === String(obj.dni)) return r + 1;
    if (obj.nombre && data[r][iNom] && low(data[r][iNom]) === low(obj.nombre)) return r + 1;
  }
  return -1;
}

// Limpieza por columna al guardar.
function sanitize(key, value) {
  if (value === undefined || value === null) return "";
  if (key === "telefono") return cleanPhone(value);
  if (key === "stock" || key === "destacado") return siNo(value); // guardar "sí"/"no"
  // Un texto que empieza con = + - @ o un tabulador lo interpretaría Sheets
  // como fórmula. El apóstrofo inicial lo fuerza a texto (no se ve en la celda
  // ni vuelve al leer).
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
}

/* --------------------------- Altas públicas ------------------------------ */

// Campos que puede mandar la tienda pública (sin token) al crear una fila.
var CAMPOS_PUBLICOS = {
  Pedidos: ["id", "cliente", "telefono", "detalle", "monto", "notas", "envio", "montoEnvio", "pago", "items"],
  Suscriptores: ["email"],
};

// Deja solo los campos permitidos, fija los que no puede decidir el cliente y
// recalcula el total del pedido con los precios de la planilla. Si el total
// que mandó la web no coincide (precios viejos o manipulados), rechaza.
function validarAltaPublica(tab, obj) {
  var permitidos = CAMPOS_PUBLICOS[tab];
  if (!permitidos) throw new Error("Alta no permitida: " + tab);
  var limpio = {};
  for (var i = 0; i < permitidos.length; i++) {
    var k = permitidos[i];
    if (obj[k] !== undefined && obj[k] !== null) {
      limpio[k] = typeof obj[k] === "string" ? obj[k].slice(0, 2000) : obj[k];
    }
  }
  if (tab === "Suscriptores") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(limpio.email || ""))) throw new Error("Email inválido");
    return limpio;
  }
  // Pedidos
  if (!/^ped\d{10,16}$/.test(String(limpio.id || ""))) throw new Error("Id de pedido inválido");
  var nExiste = findRowById("Pedidos", limpio.id);
  if (nExiste > 0) {
    // Mismo id: si es la misma compra (reintento por mala conexión) se
    // responde OK sin crear otro pedido ni descontar stock de nuevo.
    var kEx = keysOf("Pedidos");
    var rowEx = sheetFor("Pedidos").getRange(nExiste, 1, 1, kEx.length).getValues()[0];
    if (String(rowEx[kEx.indexOf("items")]) === String(limpio.items || "") &&
        low(rowEx[kEx.indexOf("cliente")]) === low(limpio.cliente)) {
      return { __repetido: true, id: limpio.id };
    }
    throw new Error("El pedido ya existe");
  }
  var pago = String(limpio.pago || "").trim();
  if (["Mercado Pago", "Transferencia", "Efectivo"].indexOf(pago) === -1) throw new Error("Medio de pago inválido");
  var items = [];
  try { items = JSON.parse(limpio.items || "[]"); } catch (e) {}
  if (!items.length) throw new Error("El pedido no tiene productos");
  if (items.length > 50) throw new Error("Demasiados productos");

  verificarStock(items);
  var calc = calcularTotalPedido(items, pago);
  var envio = envioSegunTexto(limpio.envio);
  var total = calc.subtotal + envio;
  if (Math.abs(Number(limpio.monto) - total) > 1) {
    throw new Error("Los precios se actualizaron. Recargá la página y volvé a confirmar el pedido.");
  }
  limpio.monto = total;
  limpio.montoEnvio = envio;
  limpio.estado = pago === "Mercado Pago" ? "pendiente de pago" : "nuevo";
  limpio.descontado = "no";
  limpio.cobrado = "";
  limpio.comprobante = "";
  limpio.costo = "";
  return limpio;
}

// Revisa que haya stock para todo el pedido (se llama con el bloqueo tomado,
// justo antes de descontar). Reglas:
//  - Stock "no" en la planilla → sin stock.
//  - Variante con cantidad ("Vainilla:3") → no se puede pedir más que eso.
//  - Cantidad total cargada (> 0) → no se puede pedir más que eso.
//  - Si la cantidad no está cargada (0 o vacía) y el stock es "sí", se acepta.
//  - Combos: se revisa cada producto que lo compone.
function verificarStock(items) {
  var values = sheetFor("Productos").getDataRange().getValues();
  var keys = keysOf("Productos");
  var iN = keys.indexOf("nombre"), iS = keys.indexOf("stock"), iC = keys.indexOf("cantidad"),
    iV = keys.indexOf("variantes"), iCo = keys.indexOf("combo");
  var prods = {};
  for (var r = 1; r < values.length; r++) {
    var nm = low(values[r][iN]);
    if (nm) prods[nm] = values[r];
  }
  var porProducto = {}, porVariante = {};
  function sumar(nombre, variante, q) {
    var row = prods[low(nombre)];
    if (!row) return; // el total del pedido ya avisa "Producto no disponible"
    var comboRaw = String(row[iCo] || "").trim();
    if (comboRaw) {
      var comps = [];
      try { comps = JSON.parse(comboRaw); } catch (e) {}
      for (var c = 0; c < comps.length; c++) {
        sumar(comps[c].n, (variante && variante[comps[c].n]) || comps[c].v, q * (Number(comps[c].q) || 1));
      }
      return;
    }
    var k = low(nombre);
    porProducto[k] = (porProducto[k] || 0) + q;
    if (variante && typeof variante === "string") {
      var kv = k + "|" + low(variante);
      porVariante[kv] = (porVariante[kv] || 0) + q;
    }
  }
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var q = Math.floor(Number(it.q) || 0);
    var row0 = prods[low(it.n)];
    var esCombo = row0 && String(row0[iCo] || "").trim();
    sumar(it.n, esCombo ? (it.cv || null) : (it.v || ""), q);
  }
  for (var k2 in porProducto) {
    var row2 = prods[k2];
    var nombreReal = String(row2[iN]);
    var stockTxt = String(row2[iS] === undefined ? "" : row2[iS]).trim();
    if (stockTxt !== "" && !parseSiNo(stockTxt)) throw new Error("Sin stock: " + nombreReal);
    var cant = Number(row2[iC]) || 0;
    if (cant > 0 && porProducto[k2] > cant) {
      throw new Error("Solo quedan " + cant + " unidades de " + nombreReal);
    }
  }
  for (var kv2 in porVariante) {
    var partes = kv2.split("|");
    var row3 = prods[partes[0]];
    var vars = String(row3[iV] || "").split(",");
    for (var j = 0; j < vars.length; j++) {
      var idx = vars[j].lastIndexOf(":");
      if (idx <= 0) continue;
      if (low(vars[j].slice(0, idx)) !== partes[1]) continue;
      var disp = Number(vars[j].slice(idx + 1).trim()) || 0;
      if (porVariante[kv2] > disp) {
        var vNom = vars[j].slice(0, idx).trim();
        throw new Error(disp > 0
          ? "Solo quedan " + disp + " de " + String(row3[iN]) + " (" + vNom + ")"
          : "Sin stock: " + String(row3[iN]) + " (" + vNom + ")");
      }
    }
  }
}

/* ------------------------------- Caché ----------------------------------- */

// Guarda en caché (2 minutos) la respuesta de una lectura pública. Se parte en
// trozos porque cada clave admite ~100 KB. Cualquier escritura la borra.
var CACHE_TTL_S = 120;
var CACHE_CLAVES = ["cat_productos", "cat_categorias"];

function leerCacheado(clave, fn) {
  var cache = CacheService.getScriptCache();
  try {
    var n = Number(cache.get(clave + "_n") || 0);
    if (n > 0) {
      var keys = [];
      for (var i = 0; i < n; i++) keys.push(clave + "_" + i);
      var partes = cache.getAll(keys);
      var txt = "";
      for (var j = 0; j < n; j++) {
        if (partes[clave + "_" + j] == null) { txt = null; break; }
        txt += partes[clave + "_" + j];
      }
      if (txt) return JSON.parse(txt);
    }
  } catch (eR) {}
  var data = fn();
  try {
    var json = JSON.stringify(data);
    var TAM = 90000, obj = {}, cant = Math.ceil(json.length / TAM);
    if (cant <= 50) {
      for (var k = 0; k < cant; k++) obj[clave + "_" + k] = json.slice(k * TAM, (k + 1) * TAM);
      obj[clave + "_n"] = String(cant);
      cache.putAll(obj, CACHE_TTL_S);
    }
  } catch (eW) {}
  return data;
}

function borrarCacheCatalogo() {
  var cache = CacheService.getScriptCache();
  var keys = [];
  for (var i = 0; i < CACHE_CLAVES.length; i++) keys.push(CACHE_CLAVES[i] + "_n");
  cache.removeAll(keys); // sin el contador, los trozos se ignoran
}

/* --------------------------- Registro de errores -------------------------- */

// Anota el error en la pestaña "Errores" (se crea sola). Sin datos sensibles:
// solo acción, mensaje, pestaña e id. Nunca debe romper la respuesta.
function registrarError(action, err, p) {
  try {
    var book = ss();
    var sh = book.getSheetByName("Errores");
    if (!sh) {
      sh = book.insertSheet("Errores");
      sh.appendRow(["Fecha", "Acción", "Mensaje", "Pestaña", "Id"]);
      sh.getRange(1, 1, 1, 5).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    var msg = String(err && err.message ? err.message : err).slice(0, 300);
    sh.appendRow([now(), String(action || "").slice(0, 40), sanitize("m", msg), sanitize("t", String((p && p.tab) || "").slice(0, 40)), sanitize("i", String((p && (p.id || p.pedido)) || "").slice(0, 60))]);
  } catch (e2) {
    console.error("registrarError: " + e2);
  }
}

// Mail diario (lo dispara backupDiario) SOLO si hubo errores, pagos para
// revisar o la planilla se acerca al límite de celdas.
function resumenDiario() {
  var book = ss();
  var avisos = [];
  var shE = book.getSheetByName("Errores");
  if (shE && shE.getLastRow() > 1) {
    var desde = Utilities.formatDate(new Date(Date.now() - 24 * 3600 * 1000), "GMT-3", "yyyy-MM-dd HH:mm");
    var filas = shE.getRange(2, 1, shE.getLastRow() - 1, 3).getValues().filter(function (f) {
      var fecha = f[0] instanceof Date ? Utilities.formatDate(f[0], "GMT-3", "yyyy-MM-dd HH:mm") : String(f[0]);
      return fecha >= desde;
    });
    if (filas.length) {
      avisos.push("Errores en las últimas 24 h: " + filas.length);
      filas.slice(-10).forEach(function (f) { avisos.push("  · " + f[1] + ": " + f[2]); });
    }
  }
  var pedidos = listTable("Pedidos").filter(function (r) { return low(r.estado) === "revisar pago"; });
  if (pedidos.length) {
    avisos.push("Pedidos con pago para revisar (monto distinto en Mercado Pago): " + pedidos.length);
    pedidos.slice(0, 10).forEach(function (r) { avisos.push("  · " + r.id + " · " + r.cliente); });
  }
  var celdas = 0;
  book.getSheets().forEach(function (shx) { celdas += shx.getMaxRows() * shx.getMaxColumns(); });
  if (celdas > 5000000) avisos.push("La planilla tiene " + celdas + " celdas (límite de Google: 10.000.000). Conviene archivar pedidos viejos.");
  if (!avisos.length) return "sin avisos";
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Suple Market · avisos del sistema", avisos.join("\n") +
    "\n\nDetalle en la planilla, pestañas Errores y Pedidos.");
  return avisos.length + " avisos enviados";
}

// Precio publicado en la web a partir del precio base de la planilla.
function precioWeb(base) {
  if (!base || base <= 0) return 0;
  return Math.round(base / (1 - DESCUENTO_TRANSFERENCIA) / 100) * 100;
}

// Suma los productos de un pedido con los precios ACTUALES de la planilla.
// Mercado Pago: precio publicado. Transferencia / efectivo: precio base.
function calcularTotalPedido(items, pago) {
  var sh = sheetFor("Productos");
  var values = sh.getDataRange().getValues();
  var precios = {};
  for (var r = 1; r < values.length; r++) {
    var nombre = low(values[r][0]);
    if (nombre) precios[nombre] = Number(values[r][3]) || 0;
  }
  var subtotal = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var q = Math.floor(Number(it.q) || 0);
    if (q <= 0 || q > 99) throw new Error("Cantidad inválida");
    var base = precios[low(it.n)];
    if (base === undefined) throw new Error("Producto no disponible: " + String(it.n || "").slice(0, 60));
    if (!base) throw new Error("Producto sin precio: " + String(it.n || "").slice(0, 60));
    subtotal += (pago === "Mercado Pago" ? precioWeb(base) : base) * q;
  }
  return { subtotal: subtotal };
}

// Costo de envío según el texto que guarda el checkout ("... · Envío GBA 1 · Morón").
function envioSegunTexto(txt) {
  var t = String(txt || "");
  for (var zona in ENVIOS) {
    if (t.indexOf("Envío " + zona) !== -1) return ENVIOS[zona];
  }
  return 0; // retiro, interior (Vía Cargo a coordinar) o sin dato
}

function cleanPhone(v) {
  return String(v).replace(/^[+\-=@]+\s*/, "").trim();
}

/* ------------------------------ Productos -------------------------------- */

// ¿Es "sí"? Acepta sí/si/true/x/1.
function parseSiNo(v) {
  if (v === true) return true;
  var s = String(v).trim().toLowerCase();
  return s === "si" || s === "sí" || s === "true" || s === "x" || s === "1";
}
function siNo(v) {
  return parseSiNo(v) ? "sí" : "no";
}

// Devuelve los productos completos de la planilla.
// conCostos: true solo para el CRM (con token). La tienda pública no recibe
// costo ni costoMoneda.
function listProductos(conCostos) {
  var sh = sheetFor("Productos");
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var nombre = String(row[0] || "").trim();
    if (!nombre) continue;
    list.push({
      nombre: nombre,
      marca: String(row[1] || "").trim(),
      categoria: String(row[2] || "").trim(),
      precio: Number(row[3]) || 0,
      precioML: row[4] === "" || row[4] == null ? 0 : Number(row[4]) || 0,
      variantes: String(row[5] || "").trim(),
      stock: row[6] === "" || row[6] == null ? true : parseSiNo(row[6]),
      destacado: parseSiNo(row[7]),
      costo: row[8] === "" || row[8] == null ? 0 : Number(row[8]) || 0,
      costoMoneda: String(row[9] || "").trim().toUpperCase() === "USD" ? "USD" : "ARS",
      imagen: String(row[10] || "").trim(),
      cantidad: row[11] === "" || row[11] == null ? 0 : Number(row[11]) || 0,
      variantesFotos: String(row[12] || "").trim(),
      descripcion: String(row[13] || "").trim(),
      modoUso: String(row[14] || "").trim(),
      infoNutricional: String(row[15] || "").trim(),
      ingredientes: String(row[16] || "").trim(),
      combo: String(row[17] || "").trim(),
    });
  }
  if (!conCostos) {
    for (var j = 0; j < list.length; j++) {
      delete list[j].costo;
      delete list[j].costoMoneda;
    }
  }
  return list;
}

// Crea o actualiza una fila de precio, cruzando por nombre.
function saveProducto(obj) {
  if (!obj.nombre) throw new Error("Falta el nombre del producto");
  var n = findRowById("Productos", obj.nombre);
  if (n > 0) return updateRow("Productos", obj.nombre, obj);
  return addRow("Productos", obj);
}

/* ------------------------------ Imágenes --------------------------------- */

// Sube una imagen (base64) al repo de GitHub en public/productos/ y guarda el
// link en la columna "imagen" del producto. El token va en Propiedades del
// script como GITHUB_TOKEN (NO en el código).
function subirImagen(p) {
  if (!p.nombre || !p.data) return { ok: false, error: "Faltan datos" };
  var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) return { ok: false, error: "Falta GITHUB_TOKEN en Propiedades del script" };
  var path = "public/productos/" + slugImagen(p.nombre) + "-" + Date.now() + ".jpg";
  var api = "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + path;
  var res = UrlFetchApp.fetch(api, {
    method: "put",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "suplemarket-crm",
    },
    payload: JSON.stringify({
      message: "foto: " + p.nombre,
      content: p.data, // ya viene en base64
      branch: GITHUB_BRANCH,
    }),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    return { ok: false, error: "GitHub " + code + ": " + res.getContentText().slice(0, 180) };
  }
  var url =
    "https://raw.githubusercontent.com/" + GITHUB_REPO + "/" + GITHUB_BRANCH + "/" + path;

  // Foto de una CATEGORÍA.
  if (p.categoria) {
    var cn = findRowById("Categorias", p.categoria);
    if (cn > 0) updateRowByNumber("Categorias", cn, { imagen: url });
    else addRow("Categorias", { nombre: p.categoria, imagen: url });
    return { ok: true, url: url };
  }

  var n = findRowById("Productos", p.nombre);
  if (n < 0) {
    if (p.variante) addRow("Productos", { nombre: p.nombre, variantesFotos: JSON.stringify(mapVar(p.variante, [url])) });
    else addRow("Productos", { nombre: p.nombre, imagen: url });
    return { ok: true, url: url };
  }
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  if (p.variante) {
    // Varias fotos por variante → array.
    var iVF = keys.indexOf("variantesFotos");
    var vf = {};
    try { vf = JSON.parse(sh.getRange(n, iVF + 1).getValue() || "{}"); } catch (e1) {}
    var arr = vf[p.variante];
    if (Object.prototype.toString.call(arr) !== "[object Array]") arr = arr ? [arr] : [];
    arr.push(url);
    vf[p.variante] = arr;
    sh.getRange(n, iVF + 1).setValue(JSON.stringify(vf));
  } else {
    // Galería del producto: agrega a la lista (separada por "|").
    var iImg = keys.indexOf("imagen");
    var cur = String(sh.getRange(n, iImg + 1).getValue() || "").trim();
    sh.getRange(n, iImg + 1).setValue(cur ? cur + "|" + url : url);
  }
  return { ok: true, url: url };
}

function mapVar(k, v) {
  var o = {};
  o[k] = v;
  return o;
}

// Borra la referencia a una foto (no borra el archivo de GitHub).
function borrarImagen(p) {
  // Foto de una categoría.
  if (p.categoria) {
    var cn = findRowById("Categorias", p.categoria);
    if (cn > 0) updateRowByNumber("Categorias", cn, { imagen: " " });
    return { ok: true };
  }
  if (!p.nombre) return { ok: false, error: "Falta el producto" };
  var n = findRowById("Productos", p.nombre);
  if (n < 0) return { ok: false, error: "Producto no encontrado" };
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  if (p.variante) {
    var iVF = keys.indexOf("variantesFotos");
    var vf = {};
    try { vf = JSON.parse(sh.getRange(n, iVF + 1).getValue() || "{}"); } catch (e2) {}
    if (p.url) {
      // Quita una foto puntual de esa variante.
      var arr = vf[p.variante];
      if (Object.prototype.toString.call(arr) !== "[object Array]") arr = arr ? [arr] : [];
      arr = arr.filter(function (u) { return u && !mismaImagen(u, p.url); });
      if (arr.length) vf[p.variante] = arr;
      else delete vf[p.variante];
    } else {
      delete vf[p.variante]; // quita todas las de esa variante
    }
    sh.getRange(n, iVF + 1).setValue(JSON.stringify(vf));
  } else if (p.url) {
    var iImg = keys.indexOf("imagen");
    var list = String(sh.getRange(n, iImg + 1).getValue() || "")
      .split("|")
      .map(function (s) { return s.trim(); })
      .filter(function (u) { return u && !mismaImagen(u, p.url); });
    sh.getRange(n, iImg + 1).setValue(list.join("|"));
  }
  return { ok: true };
}

// Compara dos URLs de imagen por NOMBRE DE ARCHIVO: la web puede mandar la
// ruta local ("/productos/x.jpg") y la planilla guarda la URL completa de
// GitHub. Así borrar una foto funciona siempre.
function mismaImagen(a, b) {
  var fa = String(a || "").split("?")[0].split("/").pop();
  var fb = String(b || "").split("?")[0].split("/").pop();
  return !!fa && fa === fb;
}

function slugImagen(s) {
  return (
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "producto"
  );
}

// Sube el comprobante de transferencia de un pedido a GitHub y guarda el link
// en la columna Comprobante del pedido.
function subirComprobante(p) {
  if (!p.pedido || !p.data) return { ok: false, error: "Faltan datos" };
  var data = String(p.data);
  // Solo JPEG (la web lo convierte siempre a JPEG) y con un tamaño acotado.
  if (data.indexOf("/9j/") !== 0 || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 200))) {
    return { ok: false, error: "El comprobante tiene que ser una imagen JPEG" };
  }
  if (data.length > COMPROBANTE_MAX_B64) return { ok: false, error: "La imagen es demasiado grande" };
  // Solo pedidos reales por transferencia que todavía no estén cobrados.
  var nPed = findRowById("Pedidos", p.pedido);
  if (nPed < 0) return { ok: false, error: "Pedido no encontrado" };
  var keysPed = keysOf("Pedidos");
  var rowPed = sheetFor("Pedidos").getRange(nPed, 1, 1, keysPed.length).getValues()[0];
  if (String(rowPed[keysPed.indexOf("pago")] || "").trim() !== "Transferencia") {
    return { ok: false, error: "Este pedido no es por transferencia" };
  }
  if (low(rowPed[keysPed.indexOf("estado")]) === "pagado" || low(rowPed[keysPed.indexOf("cobrado")]) === "sí") {
    return { ok: false, error: "El pedido ya está cobrado" };
  }
  var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) return { ok: false, error: "Falta GITHUB_TOKEN en Propiedades del script" };
  var path = "public/comprobantes/" + slugImagen(p.pedido) + "-" + Date.now() + ".jpg";
  var api = "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + path;
  var res = UrlFetchApp.fetch(api, {
    method: "put",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "suplemarket-crm",
    },
    payload: JSON.stringify({ message: "comprobante: " + p.pedido, content: p.data, branch: GITHUB_BRANCH }),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    return { ok: false, error: "GitHub " + code + ": " + res.getContentText().slice(0, 180) };
  }
  var url = "https://raw.githubusercontent.com/" + GITHUB_REPO + "/" + GITHUB_BRANCH + "/" + path;
  updateRowByNumber("Pedidos", nPed, { comprobante: url });
  return { ok: true, url: url };
}

/* ----------------------------- Mercado Pago ------------------------------ */

// Crea una preferencia de pago (Checkout Pro) y devuelve el link (init_point).
// El Access Token va en Propiedades del script como MP_ACCESS_TOKEN (NO en el
// código ni en la web).
function mpCrearPreferencia(p) {
  var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "Falta MP_ACCESS_TOKEN en Propiedades del script" };
  // El monto NO se toma de la web: se lee del pedido ya guardado en la planilla
  // (cuyo total se validó al crearlo).
  var nPed = findRowById("Pedidos", p.pedido);
  if (nPed < 0) return { ok: false, error: "Pedido no encontrado" };
  var keysPed = keysOf("Pedidos");
  var rowPed = sheetFor("Pedidos").getRange(nPed, 1, 1, keysPed.length).getValues()[0];
  if (String(rowPed[keysPed.indexOf("pago")] || "").trim() !== "Mercado Pago") {
    return { ok: false, error: "Este pedido no es por Mercado Pago" };
  }
  if (low(rowPed[keysPed.indexOf("estado")]) === "pagado") return { ok: false, error: "El pedido ya está pagado" };
  var monto = Number(rowPed[keysPed.indexOf("monto")]) || 0;
  if (monto <= 0) return { ok: false, error: "Monto inválido" };
  var exec = "";
  try { exec = ScriptApp.getService().getUrl(); } catch (e0) {}

  // El envío va como ítem aparte (una sola vez), el resto son los productos.
  var envioMonto = Number(rowPed[keysPed.indexOf("montoEnvio")]) || 0;
  if (envioMonto < 0 || envioMonto >= monto) envioMonto = 0;
  var itemsMP = [
    {
      title: String(p.titulo || "Pedido Suple Market"),
      quantity: 1,
      unit_price: monto - envioMonto,
      currency_id: "ARS",
    },
  ];
  if (envioMonto > 0) {
    itemsMP.push({
      title: String(p.envioTitulo || "Envío a domicilio"),
      quantity: 1,
      unit_price: envioMonto,
      currency_id: "ARS",
    });
  }
  var pref = {
    items: itemsMP,
    external_reference: String(p.pedido || ""),
    back_urls: {
      success: SITE_URL + "/pago/exito/",
      failure: SITE_URL + "/pago/error/",
      pending: SITE_URL + "/pago/pendiente/",
    },
    auto_return: "approved",
  };
  if (exec) pref.notification_url = exec + "?action=mp_webhook";
  if (p.email) pref.payer = { email: String(p.email) };

  var res = UrlFetchApp.fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(pref),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  var body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e1) {}
  if (code < 200 || code >= 300) {
    return { ok: false, error: "MP " + code + ": " + res.getContentText().slice(0, 180) };
  }
  return { ok: true, init_point: body.init_point, id: body.id };
}

// Webhook de Mercado Pago: cuando un pago se aprueba, marca el pedido como
// "pagado" en la planilla. MP manda el id del pago por query (?data.id=) o en
// el cuerpo. Consultamos el pago para leer el estado y el nº de pedido.
function mpWebhook(p, e) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
    if (!token) return { ok: false };

    var type = p.type || p.topic || "";
    if (type && String(type).indexOf("payment") === -1) return { ok: true }; // solo pagos

    var payId = p["data.id"] || p.id || "";
    if (!payId && e && e.postData && e.postData.contents) {
      try {
        var b = JSON.parse(e.postData.contents);
        payId = (b.data && b.data.id) || b.id || "";
      } catch (er) {}
    }
    if (!payId) return { ok: true };

    var r = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments/" + payId, {
      headers: { Authorization: "Bearer " + token },
      muteHttpExceptions: true,
    });
    var pay = {};
    try { pay = JSON.parse(r.getContentText()); } catch (er2) {}

    var ref = pay.external_reference;
    if (pay.status === "approved" && ref) {
      var n = findRowById("Pedidos", ref);
      if (n > 0) {
        var keysW = keysOf("Pedidos");
        var rowW = sheetFor("Pedidos").getRange(n, 1, 1, keysW.length).getValues()[0];
        var montoPedido = Number(rowW[keysW.indexOf("monto")]) || 0;
        var pagado = Number(pay.transaction_amount) || 0;
        var notasW = String(rowW[keysW.indexOf("notas")] || "");
        var marca = "MP #" + payId;
        if (notasW.indexOf(marca) === -1) notasW = (notasW ? notasW + " · " : "") + marca + " $" + pagado;
        if (Math.abs(pagado - montoPedido) <= 1) {
          updateRowByNumber("Pedidos", n, { estado: "pagado", notas: notasW });
        } else {
          // Pagó otro monto: no se marca pagado, queda para revisar en el CRM.
          updateRowByNumber("Pedidos", n, {
            estado: "revisar pago",
            notas: notasW + " (pedido $" + montoPedido + ")",
          });
        }
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/* ------------------------------ Stock / ventas --------------------------- */

// Aprueba el pago de un pedido: descuenta el stock de sus productos (una sola
// vez) y lo marca como pagado. Idempotente: si ya se descontó, no vuelve a bajar.
function aprobarPedido(id) {
  if (!id) return { ok: false, error: "Falta el id del pedido" };
  var n = findRowById("Pedidos", id);
  if (n < 0) return { ok: false, error: "Pedido no encontrado" };
  var sh = sheetFor("Pedidos");
  var keys = keysOf("Pedidos");
  var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
  var iDesc = keys.indexOf("descontado");
  var iItems = keys.indexOf("items");

  if (String(row[iDesc] || "").trim().toLowerCase() === "sí") {
    updateRowByNumber("Pedidos", n, { estado: "pagado" });
    return { ok: true, yaDescontado: true };
  }

  var items = [];
  try { items = JSON.parse(row[iItems] || "[]"); } catch (e) {}
  for (var i = 0; i < items.length; i++) {
    // items[i].cv: en combos, la variante elegida por el cliente para cada
    // producto del combo ({ "WHEY ...": "Vainilla" }).
    descontarProducto(items[i].n, Number(items[i].q) || 0, items[i].v, items[i].cv);
  }
  updateRowByNumber("Pedidos", n, { estado: "pagado", descontado: "sí" });
  return { ok: true, descontados: items.length };
}

// Baja la cantidad de un producto (por nombre). Si se indica la variante, baja
// el stock de esa variante en el texto "Rojo:5, Azul:3". Si el total llega a 0,
// marca el producto sin stock.
// comboVars (opcional): si el producto es un combo, variante elegida por el
// cliente para cada componente ({ nombreProducto: variante }).
function descontarProducto(nombre, cant, variante, comboVars) {
  ajustarProducto(nombre, cant, variante, comboVars, -1);
}

// Ajusta el stock de un producto: signo -1 descuenta (venta), +1 repone
// (pedido eliminado). Maneja variantes y combos (recursivo).
function ajustarProducto(nombre, cant, variante, comboVars, signo) {
  if (!nombre || !cant || cant <= 0) return;
  var n = findRowById("Productos", nombre);
  if (n < 0) return;
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  var iCant = keys.indexOf("cantidad");
  var iStock = keys.indexOf("stock");
  var iVar = keys.indexOf("variantes");

  // Si es un COMBO, descuenta el stock de cada producto que lo compone
  // (y no toca el stock propio del combo).
  var iCombo = keys.indexOf("combo");
  var comboRaw = iCombo >= 0 ? String(sh.getRange(n, iCombo + 1).getValue() || "").trim() : "";
  if (comboRaw) {
    var comps = [];
    try { comps = JSON.parse(comboRaw); } catch (ec) {}
    for (var ci = 0; ci < comps.length; ci++) {
      // La variante que eligió el cliente manda; si no eligió, la fija del combo.
      var cv = comboVars && comboVars[comps[ci].n] ? comboVars[comps[ci].n] : comps[ci].v;
      ajustarProducto(comps[ci].n, cant * (Number(comps[ci].q) || 1), cv, null, signo);
    }
    return;
  }

  // Descontar de la variante específica (si corresponde).
  if (variante) {
    var raw = String(sh.getRange(n, iVar + 1).getValue() || "");
    var parts = raw.split(",").map(function (s) { return s.trim(); }).filter(String);
    for (var i = 0; i < parts.length; i++) {
      var idx = parts[i].lastIndexOf(":");
      var vname = idx > 0 ? parts[i].slice(0, idx).trim() : parts[i];
      if (vname.toLowerCase() === String(variante).trim().toLowerCase() && idx > 0) {
        var q = Number(parts[i].slice(idx + 1).trim()) || 0;
        parts[i] = vname + ":" + Math.max(0, q + signo * cant);
      }
    }
    sh.getRange(n, iVar + 1).setValue(parts.join(", "));
  }

  // Descontar del total.
  var actual = Number(sh.getRange(n, iCant + 1).getValue()) || 0;
  var nuevo = Math.max(0, actual + signo * cant);
  sh.getRange(n, iCant + 1).setValue(nuevo);
  sh.getRange(n, iStock + 1).setValue(nuevo > 0 ? "sí" : "no");
}

/* ------------------------------ Categorías ------------------------------- */

// Renombra una categoría y arrastra el cambio a todos los productos de esa
// categoría (para que no queden "huérfanos").
function categoriaRename(from, to) {
  if (!from || !to) throw new Error("Faltan datos");
  var n = findRowById("Categorias", from);
  if (n > 0) updateRowByNumber("Categorias", n, { nombre: to });
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  var iCat = keys.indexOf("categoria");
  if (iCat >= 0) {
    var data = sh.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      if (low(data[r][iCat]) === low(from)) sh.getRange(r + 1, iCat + 1).setValue(to);
    }
  }
  return { from: from, to: to };
}

// Categorías por defecto (se cargan en la planilla la primera vez).
var CATEGORIAS_DEFAULT = [
  "Proteínas", "Creatinas", "Pre entreno", "Aminoácidos", "Vitaminas",
  "Minerales", "Colágeno", "Barras y snacks", "Combos",
];

function seedCategorias() {
  var sh = ss().getSheetByName("Categorias");
  if (!sh) return;
  if (sh.getLastRow() > 1) return; // ya tiene datos
  for (var i = 0; i < CATEGORIAS_DEFAULT.length; i++) {
    sh.appendRow([CATEGORIAS_DEFAULT[i], i + 1]);
  }
}

/* --------------------------- Cuentas de clientes -------------------------- */

function registrar(obj) {
  if (!obj.email || !obj.password) return { ok: false, error: "Faltan email o contraseña" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(obj.email))) return { ok: false, error: "Email inválido" };
  if (String(obj.password).length < 6) return { ok: false, error: "La contraseña tiene que tener al menos 6 caracteres" };
  if (findClienteRow({ email: obj.email }) > 0)
    return { ok: false, error: "Ya existe una cuenta con ese email" };
  // Siempre fila nueva: si se fusionara por nombre o DNI con un cliente que ya
  // existe, cualquiera podría pisarle la clave registrándose con su nombre.
  addRow("Clientes", {
    sinFusion: true,
    nombre: obj.nombre || "",
    email: obj.email,
    telefono: obj.telefono || "",
    origen: obj.origen || "web",
    clave: nuevaClave(obj.password),
  });
  return { ok: true, user: { nombre: obj.nombre || "", email: obj.email } };
}

function login(email, password) {
  if (!email || !password) return { ok: false, error: "Faltan datos" };
  var sh = sheetFor("Clientes");
  var keys = keysOf("Clientes");
  var data = sh.getDataRange().getValues();
  var iEmail = keys.indexOf("email"),
    iClave = keys.indexOf("clave"),
    iNom = keys.indexOf("nombre");
  for (var r = 1; r < data.length; r++) {
    if (low(data[r][iEmail]) === low(email)) {
      if (verificarClave(data[r][iClave], password)) {
        // Migración transparente: las claves viejas (sin salt) se regraban con
        // el formato nuevo la primera vez que el cliente entra bien.
        if (String(data[r][iClave]).indexOf("v2$") !== 0) {
          sh.getRange(r + 1, iClave + 1).setValue(nuevaClave(password));
        }
        return { ok: true, user: { nombre: data[r][iNom], email: data[r][iEmail] } };
      }
      return { ok: false, error: "Contraseña incorrecta" };
    }
  }
  return { ok: false, error: "No existe una cuenta con ese email" };
}

/**
 * Login del CRM. El PIN NO está en este código (repo público) sino en una
 * Propiedad del Script (Configuración del proyecto → Propiedades del script →
 * CRM_PIN). Se puede setear con la función setCrmPin() (ver abajo) y borrarla.
 */
function crmLogin(pin) {
  var stored = PropertiesService.getScriptProperties().getProperty("CRM_PIN");
  if (!stored) return { ok: false, error: "PIN no configurado" };
  // Fuerza bruta: tras 5 PIN incorrectos se bloquea el login 15 minutos.
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get("crm_fails") || 0);
  if (fails >= 5) return { ok: false, error: "bloqueado", minutos: 15 };
  if (String(pin || "").trim() !== String(stored).trim()) {
    cache.put("crm_fails", String(fails + 1), 15 * 60);
    return { ok: false, error: "pin", restantes: Math.max(0, 4 - fails) };
  }
  cache.remove("crm_fails");
  var t = crearToken();
  return { ok: true, token: t.token, expires: t.expires };
}

function crmLogout(token) {
  if (token) {
    var t = leerTokens();
    delete t[token];
    guardarTokens(t);
  }
  return { ok: true };
}

/* ------------------------- Tokens de sesión del CRM ----------------------- */
// crm_login devuelve un token aleatorio que vence a los 30 días. Se guardan en
// la Propiedad del Script CRM_TOKENS ({ token: vencimientoMs }). Las acciones
// de administración exigen un token válido (ver handle / esAccionPublica).

var TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function leerTokens() {
  try {
    return JSON.parse(PropertiesService.getScriptProperties().getProperty("CRM_TOKENS") || "{}");
  } catch (e) {
    return {};
  }
}
function guardarTokens(t) {
  PropertiesService.getScriptProperties().setProperty("CRM_TOKENS", JSON.stringify(t));
}
function tokenValido(token) {
  if (!token) return false;
  var t = leerTokens();
  return Number(t[String(token)] || 0) > Date.now();
}
function crearToken() {
  var t = leerTokens();
  var now = Date.now();
  for (var k in t) if (Number(t[k]) < now) delete t[k]; // limpia vencidos
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  t[token] = now + TOKEN_TTL_MS;
  guardarTokens(t);
  return { token: token, expires: t[token] };
}

// Acciones que la tienda pública puede llamar SIN token. Todo lo demás es del
// CRM. "list" solo para Categorias; "add" solo para Pedidos y Suscriptores.
function esAccionPublica(action, p) {
  switch (action) {
    case "version":
    case "productos_list":
    case "registrar":
    case "login":
    case "subir_comprobante":
    case "mp_crear_pref":
    case "mp_webhook":
    case "crm_login":
    case "crm_logout":
      return true;
    case "list":
      return p.tab === "Categorias";
    case "add":
      return p.tab === "Pedidos" || p.tab === "Suscriptores";
    default:
      return false;
  }
}

/* ------------------------- Contraseñas de clientes ------------------------ */
// Formato nuevo: "v2$<salt>$<sha256(salt::password)>" (salt único por cuenta).
// Las claves viejas (sha256 con prefijo fijo, sin salt) siguen validando y se
// migran solas al formato nuevo en el primer login correcto.

function hashV2(pwd, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + "::" + pwd);
  return raw
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
}
function nuevaClave(pwd) {
  var salt = Utilities.getUuid().replace(/-/g, "");
  return "v2$" + salt + "$" + hashV2(pwd, salt);
}
function verificarClave(stored, pwd) {
  var s = String(stored || "");
  if (s.indexOf("v2$") === 0) {
    var parts = s.split("$");
    return parts.length === 3 && hashV2(pwd, parts[1]) === parts[2];
  }
  return s === hash(pwd); // formato viejo
}

function hash(txt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "npm::" + txt);
  return raw
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

/* ------------------------- Renombrar un producto ------------------------- */
// El nombre es la clave del producto. Al renombrar, también se actualizan los
// combos que lo incluyen (columna combo: [{n,q}]) para que no se rompan.
function productoRename(from, to) {
  from = String(from || "").trim();
  to = String(to || "").trim();
  if (!from || !to) throw new Error("Faltan datos");
  if (from === to) return { renamed: false };
  if (findRowById("Productos", to) > 0) throw new Error("Ya existe un producto con ese nombre");
  var n = findRowById("Productos", from);
  if (n < 0) throw new Error("No se encontró: " + from);
  updateRowByNumber("Productos", n, { nombre: to });

  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  var iCombo = keys.indexOf("combo");
  var combosActualizados = 0;
  if (iCombo >= 0) {
    var data = sh.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      var raw = String(data[r][iCombo] || "").trim();
      if (!raw) continue;
      try {
        var comps = JSON.parse(raw);
        var changed = false;
        for (var i = 0; i < comps.length; i++) {
          if (comps[i].n === from) {
            comps[i].n = to;
            changed = true;
          }
        }
        if (changed) {
          sh.getRange(r + 1, iCombo + 1).setValue(JSON.stringify(comps));
          combosActualizados++;
        }
      } catch (e) {}
    }
  }
  return { renamed: true, from: from, to: to, combosActualizados: combosActualizados };
}

/* -------------------------------- Utils ---------------------------------- */

function parseData(p) {
  if (p.data) {
    try {
      return JSON.parse(p.data);
    } catch (e) {}
  }
  var obj = {};
  for (var k in p) {
    if (["action", "callback", "tab", "id", "data"].indexOf(k) === -1) obj[k] = p[k];
  }
  return obj;
}
function now() {
  return Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd HH:mm");
}
function low(v) {
  return String(v || "").trim().toLowerCase();
}

/* ============================ SETUP / MANTENIMIENTO ====================== */

// Copia de seguridad: duplica la planilla completa en una carpeta "Backups
// Suple Market" de tu Drive y conserva las últimas 30 copias.
function backupAhora() {
  var file = DriveApp.getFileById(ss().getId());
  var folders = DriveApp.getFoldersByName("Backups Suple Market");
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Backups Suple Market");
  var stamp = Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "yyyy-MM-dd HH:mm");
  file.makeCopy("Backup Suple Market " + stamp, folder);
  // Conserva las 30 más nuevas
  var copias = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var c = it.next();
    if (c.getName().indexOf("Backup Suple Market ") === 0) copias.push(c);
  }
  copias.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (var i = 30; i < copias.length; i++) copias[i].setTrashed(true);
  return copias.length;
}

// Ejecutar UNA vez: deja programado el backup automático todos los días a las 4 am.
function instalarBackupDiario() {
  var ya = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "backupDiario"; });
  if (!ya) ScriptApp.newTrigger("backupDiario").timeBased().everyDays(1).atHour(4).create();
  backupAhora();
  SpreadsheetApp.getActive().toast("Backup diario instalado y primera copia hecha.", "Suple Market", 5);
}

function backupDiario() {
  backupAhora();
  try { resumenDiario(); } catch (e) { registrarError("resumenDiario", e, {}); }
}

// Ejecutar UNA vez desde el editor (▶ tareasPendientes). Hace los pendientes:
//  1) borra los pedidos de prueba "PRUEBA CLAUDE (borrar)" (quedan en Papelera
//     y, si habían descontado stock, lo repone);
//  2) actualiza los encabezados de Pedidos;
//  3) instala el backup diario (4 am) y hace la primera copia en Drive.
// Es seguro repetirla: si no hay nada que hacer, no cambia nada.
// Pedidos creados por pruebas automáticas (13/10/2026) contra la versión vieja.
var IDS_PRUEBA = ["ped1791863284000", "hack"];

function tareasPendientes() {
  var sh = sheetFor("Pedidos");
  var keys = keysOf("Pedidos");
  var iCli = keys.indexOf("cliente");
  var data = sh.getDataRange().getValues();
  var borrados = 0;
  for (var r = data.length - 1; r >= 1; r--) {
    var idFila = String(data[r][keys.indexOf("id")] || "");
    if (String(data[r][iCli] || "").toUpperCase().indexOf("PRUEBA CLAUDE") !== -1 ||
        IDS_PRUEBA.indexOf(idFila) !== -1) {
      reponerStockPedido(r + 1);
      guardarEnPapelera("Pedidos", r + 1);
      sh.deleteRow(r + 1);
      borrados++;
    }
  }
  writeHeader(sh, "Pedidos");
  // Cliente de prueba registrado con email inválido
  var shC = sheetFor("Clientes");
  var kC = keysOf("Clientes");
  var dC = shC.getDataRange().getValues();
  for (var rc = dC.length - 1; rc >= 1; rc--) {
    if (low(dC[rc][kC.indexOf("email")]) === "no-es-email") {
      guardarEnPapelera("Clientes", rc + 1);
      shC.deleteRow(rc + 1);
      borrados++;
    }
  }
  borrarCacheCatalogo();
  var ya = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "backupDiario"; });
  if (!ya) ScriptApp.newTrigger("backupDiario").timeBased().everyDays(1).atHour(4).create();
  var copias = backupAhora();
  var msg = "Filas de prueba borradas: " + borrados + " · Backup diario " + (ya ? "ya estaba instalado" : "instalado") +
    " · Copias en Drive: " + copias;
  Logger.log(msg);
  try { SpreadsheetApp.getActive().toast(msg, "Suple Market", 8); } catch (e) {}
  return msg;
}

function setup() {
  var book = ss();
  Object.keys(TABLES).forEach(function (tab, idx) {
    var sh = book.getSheetByName(tab);
    if (!sh) {
      if (idx === 0 && book.getSheets().length === 1) sh = book.getSheets()[0].setName(tab);
      else sh = book.insertSheet(tab);
    }
    writeHeader(sh, tab);
  });
  seedCategorias();
  SpreadsheetApp.getActive().toast("Listo: pestañas creadas.", "NutriPointMarket", 5);
}

// Reescribe SOLO la pestaña Productos con las columnas correctas y la deja
// VACÍA (los productos los cargás vos). Útil si venías de un formato viejo.
// PELIGRO: borra todos los productos. Para ejecutarla hay que crear antes la
// propiedad del script PERMITIR_RESET = "si" (y borrarla después).
function resetProductos_BORRA_TODO() {
  if (PropertiesService.getScriptProperties().getProperty("PERMITIR_RESET") !== "si") {
    throw new Error("Bloqueado: creá la propiedad PERMITIR_RESET = si para habilitarlo.");
  }
  var sh = ss().getSheetByName("Productos");
  if (!sh) sh = ss().insertSheet("Productos");
  sh.clear();
  writeHeader(sh, "Productos");
  SpreadsheetApp.getActive().toast("Pestaña Productos lista (vacía).", "NutriPointMarket", 5);
}

// Escribe (o actualiza) SOLO la fila de encabezados de Pedidos, sin tocar los
// datos. Ejecutar una vez después de agregar la columna "Cobrado".
function encabezadosPedidos() {
  writeHeader(sheetFor("Pedidos"), "Pedidos");
  SpreadsheetApp.getActive().toast("Encabezados de Pedidos actualizados (incluye Cobrado).", "Suple Market", 5);
}

function writeHeader(sh, tab) {
  var titles = TABLES[tab].columns.map(function (c) {
    return c[1];
  });
  sh.getRange(1, 1, 1, titles.length).setValues([titles]);
  sh.getRange(1, 1, 1, titles.length)
    .setFontWeight("bold")
    .setBackground("#0C1E33")
    .setFontColor("#FFFFFF");
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, titles.length);
}

// Ejecutá esta función UNA vez y aceptá el permiso "Conectarse a un servicio
// externo". Sirve para autorizar los pedidos a internet (Mercado Pago, GitHub).
// Después republicá: Implementar → Administrar implementaciones → Versión nueva.
function autorizar() {
  var r = UrlFetchApp.fetch("https://api.mercadopago.com/", { muteHttpExceptions: true });
  Logger.log("Autorización OK. Respuesta de Mercado Pago: " + r.getResponseCode());
  return r.getResponseCode();
}

// Función opcional para setear el PIN del CRM y NO dejarlo en el código.
// Cambiá el valor, ejecutala UNA vez, y después volvé a poner "" para no dejarlo.
function setCrmPin() {
  var PIN = ""; // ← poné el PIN acá, ejecutá, y luego borralo
  if (PIN) {
    PropertiesService.getScriptProperties().setProperty("CRM_PIN", String(PIN));
    SpreadsheetApp.getActive().toast("PIN del CRM configurado.", "NutriPointMarket", 4);
  }
}
