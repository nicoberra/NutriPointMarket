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
var API_VERSION = "v2";

// Repo de GitHub donde se guardan las fotos de productos (en public/productos/).
// El token NO va acá: se guarda en Propiedades del script como GITHUB_TOKEN.
var GITHUB_REPO = "nicoberra/NutriPointMarket";
var GITHUB_BRANCH = "main";

// Dominio del sitio (para las páginas de retorno de Mercado Pago).
var SITE_URL = "https://suplemarket.com.ar";

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
    switch (action) {
      case "version":
        out = { ok: true, version: API_VERSION };
        break;
      case "productos_list":
        // Con token (CRM) incluye costos; público, sin costos.
        out = { ok: true, data: listProductos(esAdmin) };
        break;
      case "productos_save":
        out = { ok: true, data: saveProducto(parseData(p)) };
        break;
      case "list":
        out = { ok: true, data: listTable(p.tab) };
        break;
      case "add":
        out = { ok: true, data: addRow(p.tab, parseData(p)) };
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
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return respond(out, p.callback);
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
  if (tab === "Clientes") {
    var existing = findClienteRow(obj);
    if (existing > 0) return updateRowByNumber(tab, existing, obj);
  }
  if (TABLES[tab].idField === "id" && !obj.id) obj.id = "id" + Date.now();
  if (keys.indexOf("fecha") !== -1 && !obj.fecha) obj.fecha = now();
  var line = keys.map(function (k) {
    return sanitize(k, obj[k]);
  });
  sh.appendRow(line);
  return obj;
}

function updateRow(tab, id, obj) {
  var n = findRowById(tab, id);
  if (n < 0) throw new Error("No se encontró: " + id);
  return updateRowByNumber(tab, n, obj);
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
  sheetFor(tab).deleteRow(n);
  return { deleted: id };
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
  return value;
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
  var n = findRowById("Pedidos", p.pedido);
  if (n > 0) updateRowByNumber("Pedidos", n, { comprobante: url });
  return { ok: true, url: url };
}

/* ----------------------------- Mercado Pago ------------------------------ */

// Crea una preferencia de pago (Checkout Pro) y devuelve el link (init_point).
// El Access Token va en Propiedades del script como MP_ACCESS_TOKEN (NO en el
// código ni en la web).
function mpCrearPreferencia(p) {
  var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "Falta MP_ACCESS_TOKEN en Propiedades del script" };
  var monto = Number(p.monto) || 0;
  if (monto <= 0) return { ok: false, error: "Monto inválido" };
  var exec = "";
  try { exec = ScriptApp.getService().getUrl(); } catch (e0) {}

  var pref = {
    items: [
      {
        title: String(p.titulo || "Pedido Suple Market"),
        quantity: 1,
        unit_price: monto,
        currency_id: "ARS",
      },
    ],
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
      if (n > 0) updateRowByNumber("Pedidos", n, { estado: "pagado" });
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
  if (findClienteRow({ email: obj.email }) > 0)
    return { ok: false, error: "Ya existe una cuenta con ese email" };
  addRow("Clientes", {
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

/* ---------------------- Restaurar costos (una sola vez) ------------------ */
// Ejecutar desde el editor (Ejecutar ▶ restaurarCostos) si los costos de la
// planilla quedaron en 0: vuelve a escribir los costos de respaldo (ARS).
// Es inofensivo repetirlo. No requiere redeploy.
function restaurarCostos() {
  var COSTOS = {
    "Tape": 1000,
    "WHEY PROTEIN TRUE MADE 1kg": 67545,
    "WHEY PROTEIN DOYPACK 1kg": 69584.19,
    "CREATINA MICRONIZADA SABOR NEUTRO 150gr": 15122,
    "CREATINA MICRONIZADA SABOR NEUTRO 300gr": 19400,
    "CREATINA MONOHIDRATO  300 gr": 20077,
    "CREATINA MONOHIDRATO / DOYPACK. 300 gr DOYPACK": 18132,
    "Pancakes Proteicos Dulces": 9832,
    "Pancakes Proteicos salados": 9832,
    "Proteína + Creatina": 89661,
    "Shaker ENA True Made con compartimentos": 4165,
    "Proteina + Creatina + Shaker": 125000
  };
  var ok = [], falta = [];
  for (var nombre in COSTOS) {
    var n = findRowById("Productos", nombre);
    if (n > 0) {
      updateRowByNumber("Productos", n, { costo: COSTOS[nombre], costoMoneda: "ARS" });
      ok.push(nombre + " = " + COSTOS[nombre]);
    } else {
      falta.push(nombre);
    }
  }
  Logger.log("Costos restaurados (" + ok.length + "):\n" + ok.join("\n"));
  if (falta.length) Logger.log("No encontrados (renombrados?): " + falta.join(", "));
  return { restaurados: ok.length, noEncontrados: falta };
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
function resetProductos() {
  var sh = ss().getSheetByName("Productos");
  if (!sh) sh = ss().insertSheet("Productos");
  sh.clear();
  writeHeader(sh, "Productos");
  SpreadsheetApp.getActive().toast("Pestaña Productos lista (vacía).", "NutriPointMarket", 5);
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
