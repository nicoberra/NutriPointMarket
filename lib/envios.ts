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
  | { tipo: "retiro"; costo: 0; etiqueta: "Retiro en persona"; resumen: "Retiro en persona" }
  | { tipo: "zona"; costo: number; zona: ZonaEnvio; partido: string; etiqueta: string; resumen: string }
  | { tipo: "interior"; costo: 0; etiqueta: string; resumen: string }
  | { tipo: "pendiente"; costo: 0; etiqueta: string; resumen: "" };

/**
 * Calcula el envío según lo elegido en el checkout.
 * - CABA → Capital. Buenos Aires → según el partido. Otra provincia → Vía Cargo (a coordinar).
 */
export function calcularEnvio(opts: {
  retiro: boolean;
  provincia: string;
  partido: string;
}): ResultadoEnvio {
  if (opts.retiro) return { tipo: "retiro", costo: 0, etiqueta: "Retiro en persona", resumen: "Retiro en persona" };
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
