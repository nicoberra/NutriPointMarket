/**
 * Zonas de envío y costos. ÚNICO lugar para cambiar precios, partidos o colores.
 * Los colores son los de la identidad de Suple Market (ver app/globals.css).
 */
export interface ZonaEnvio {
  id: "capital" | "gba1" | "gba2" | "gba3";
  nombre: string;
  /** Nombre corto para el resumen del pedido ("Envío GBA 1 · Morón") */
  corto: string;
  precio: number;
  /** Color de la zona (tarjetas y mapa) */
  color: string;
  /** Color del texto sobre el color de la zona */
  texto: string;
  partidos: string[];
}

export const ZONAS_ENVIO: ZonaEnvio[] = [
  {
    id: "capital",
    nombre: "Capital (CABA)",
    corto: "Capital",
    precio: 5500,
    color: "#E0F912", // lima Suple Market
    texto: "#161940",
    partidos: ["Ciudad Autónoma de Buenos Aires"],
  },
  {
    id: "gba1",
    nombre: "GBA 1",
    corto: "GBA 1",
    precio: 7000,
    color: "#2129E3", // azul principal
    texto: "#FFFFFF",
    partidos: [
      "Avellaneda",
      "General San Martín",
      "Hurlingham",
      "Ituzaingó",
      "La Matanza Norte (San Justo, Ramos Mejía, Lomas del Mirador, Isidro Casanova, Tapiales)",
      "Lanús",
      "Lomas de Zamora",
      "Morón",
      "San Fernando",
      "San Isidro",
      "Tres de Febrero",
      "Vicente López",
    ],
  },
  {
    id: "gba2",
    nombre: "GBA 2",
    corto: "GBA 2",
    precio: 9000,
    color: "#EF4444", // rojo Suple (ofertas)
    texto: "#FFFFFF",
    partidos: [
      "Almirante Brown",
      "Berazategui",
      "Esteban Echeverría",
      "Ezeiza",
      "Florencio Varela",
      "José C. Paz",
      "La Matanza Sur (Laferrere, González Catán, Virrey del Pino)",
      "Malvinas Argentinas",
      "Merlo",
      "Moreno",
      "Quilmes",
      "San Miguel",
      "Tigre",
    ],
  },
  {
    id: "gba3",
    nombre: "GBA 3",
    corto: "GBA 3",
    precio: 15000,
    color: "#161940", // azul muy oscuro
    texto: "#FFFFFF",
    partidos: [
      "Berisso",
      "Cañuelas",
      "Ensenada",
      "Escobar (Garín, Maschwitz)",
      "General Rodríguez",
      "La Plata",
      "Marcos Paz",
      "Pilar (Derqui, Villa Rosa)",
      "Presidente Perón (Guernica)",
      "San Vicente",
    ],
  },
];

/** Texto para el resto del país (no se suma al total). */
export const ENVIO_INTERIOR = "Envío por Vía Cargo · A coordinar";

/** Provincias para el selector del checkout (CABA y Buenos Aires primero). */
export const PROVINCIAS = [
  "CABA",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

export function zonaPorId(id: string | undefined): ZonaEnvio | undefined {
  return ZONAS_ENVIO.find((z) => z.id === id);
}

/** Zona a la que pertenece un partido del GBA (o undefined). */
export function zonaDePartido(partido: string): ZonaEnvio | undefined {
  return ZONAS_ENVIO.find((z) => z.id !== "capital" && z.partidos.includes(partido));
}

export type ResultadoEnvio =
  | { tipo: "zona"; costo: number; zona: ZonaEnvio; partido: string; etiqueta: string; resumen: string }
  | { tipo: "interior"; costo: 0; etiqueta: string; resumen: string }
  | { tipo: "pendiente"; costo: 0; etiqueta: string; resumen: "" };

/**
 * Calcula el envío según lo elegido en el checkout.
 * - CABA → Capital. Buenos Aires → según el partido. Otra provincia → Vía Cargo (a coordinar).
 */
/** Envío gratis en CABA y GBA cuando los productos suman desde este monto (precio publicado). */
export const ENVIO_GRATIS_DESDE = 120000;

export function calcularEnvio(opts: {
  provincia: string;
  partido: string;
}): ResultadoEnvio {
  if (!opts.provincia) return { tipo: "pendiente", costo: 0, etiqueta: "Elegí tu provincia", resumen: "" };
  if (opts.provincia === "CABA") {
    const zona = ZONAS_ENVIO[0];
    return {
      tipo: "zona",
      costo: zona.precio,
      zona,
      partido: "CABA",
      etiqueta: `Envío a Capital: ${formatARS(zona.precio)}`,
      resumen: "Envío Capital · CABA",
    };
  }
  if (opts.provincia === "Buenos Aires") {
    if (!opts.partido) return { tipo: "pendiente", costo: 0, etiqueta: "Elegí tu partido", resumen: "" };
    const zona = zonaDePartido(opts.partido);
    if (!zona) return { tipo: "interior", costo: 0, etiqueta: ENVIO_INTERIOR, resumen: "Envío Vía Cargo · a coordinar" };
    const corto = opts.partido.replace(/\s*\(.*\)$/, "");
    return {
      tipo: "zona",
      costo: zona.precio,
      zona,
      partido: opts.partido,
      etiqueta: `Envío a ${corto} · ${zona.corto}: ${formatARS(zona.precio)}`,
      resumen: `Envío ${zona.corto} · ${corto}`,
    };
  }
  return { tipo: "interior", costo: 0, etiqueta: ENVIO_INTERIOR, resumen: `Envío Vía Cargo · ${opts.provincia} · a coordinar` };
}

/** $ 7.000 (formato argentino) */
export function formatARS(n: number): string {
  return "$ " + Math.round(n).toLocaleString("es-AR");
}

/* ----------------------- Detección de zona por localidad ------------------- */

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// La Matanza tiene dos zonas: se decide por la localidad.
const MATANZA_NORTE = ["san justo", "ramos mejia", "lomas del mirador", "isidro casanova", "tapiales"];
const MATANZA_SUR = ["gregorio de laferrere", "laferrere", "gonzalez catan", "virrey del pino"];

/** Partido de la planilla de zonas que corresponde a un departamento de Georef. */
function partidoDeDepartamento(departamento: string, localidad: string): string | null {
  const d = norm(departamento);
  if (d === "la matanza") {
    const l = norm(localidad);
    const norte = ZONAS_ENVIO[1].partidos.find((p) => p.startsWith("La Matanza Norte"));
    const sur = ZONAS_ENVIO[2].partidos.find((p) => p.startsWith("La Matanza Sur"));
    if (MATANZA_NORTE.includes(l)) return norte ?? null;
    if (MATANZA_SUR.includes(l)) return sur ?? null;
    return null; // otra localidad de La Matanza: que el cliente elija Norte o Sur
  }
  for (const z of ZONAS_ENVIO) {
    for (const p of z.partidos) if (norm(p.replace(/\s*\(.*\)$/, "")) === d) return p;
  }
  return "Otro partido"; // partido de Buenos Aires fuera de las zonas → Vía Cargo
}

export type ZonaDetectada = {
  provincia: string; // valor de PROVINCIAS
  partido: string; // "" si hay que elegirlo (La Matanza)
  localidad: string; // nombre oficial
  departamento: string; // partido / comuna / departamento oficial
};

/**
 * Detecta provincia y partido a partir de la localidad o barrio que escribe el
 * cliente, con la API pública Georef del Estado argentino (sin clave).
 * Prioriza Capital y Gran Buenos Aires. Devuelve null si no la reconoce.
 */
export async function detectarZona(texto: string, signal?: AbortSignal): Promise<ZonaDetectada | null> {
  const q = norm(texto);
  if (q.length < 3) return null;
  if (["caba", "capital", "capital federal", "ciudad autonoma de buenos aires", "ciudad de buenos aires"].includes(q)) {
    return { provincia: "CABA", partido: "", localidad: "Ciudad Autónoma de Buenos Aires", departamento: "" };
  }
  const url =
    "https://apis.datos.gob.ar/georef/api/localidades?max=20&campos=nombre,departamento.nombre,provincia.id,provincia.nombre&nombre=" +
    encodeURIComponent(texto.trim());
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    localidades?: { nombre: string; departamento?: { nombre?: string }; provincia: { id: string; nombre: string } }[];
  };
  const list = j.localidades ?? [];
  const amba = (l: (typeof list)[number]) => l.provincia.id === "02" || l.provincia.id === "06";
  const exacta = (l: (typeof list)[number]) => norm(l.nombre) === q;
  const parcial = (l: (typeof list)[number]) => norm(l.nombre).includes(q) || q.includes(norm(l.nombre));
  const pick =
    list.find((l) => amba(l) && exacta(l)) ??
    list.find((l) => amba(l) && parcial(l)) ??
    list.find((l) => exacta(l)) ??
    null;
  if (!pick) return null;
  const departamento = pick.departamento?.nombre ?? "";
  if (pick.provincia.id === "02") return { provincia: "CABA", partido: "", localidad: pick.nombre, departamento };
  if (pick.provincia.id === "06") {
    return {
      provincia: "Buenos Aires",
      partido: partidoDeDepartamento(departamento, pick.nombre) ?? "",
      localidad: pick.nombre,
      departamento,
    };
  }
  const provNorm = norm(pick.provincia.nombre);
  const provincia = PROVINCIAS.find((p) => provNorm.startsWith(norm(p))) ?? pick.provincia.nombre;
  return { provincia, partido: "", localidad: pick.nombre, departamento };
}
