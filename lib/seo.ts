/**
 * SEO on-page: palabra clave de cada página, textos de las páginas de
 * categoría y helpers para títulos / descripciones de producto.
 * ÚNICO lugar para cambiar palabras clave o textos SEO.
 */

export const SITE_URL = "https://suplemarket.com.ar";

/** Link canónico de una categoría. */
export function categoryHref(slug: string): string {
  return `/categoria/${slug}/`;
}

export type CategorySeo = {
  /** Palabra clave principal (búsqueda real en Google Argentina) */
  keyword: string;
  /** Variantes que se usan en los otros textos */
  variants: string[];
  /** H1 visible */
  h1: string;
  /** Meta title SIN la marca (el layout agrega "| Suple Market"). Máx. ~44 caracteres. */
  title: string;
  /** Meta descripción: arranca con la palabra clave, 140-155 caracteres. */
  description: string;
  /** Primer párrafo visible (debajo del H1). */
  intro: string;
  /** H2 visible al pie del listado. */
  h2: string;
  /** Párrafo debajo del H2. */
  body: string;
};

const ENVIO = "Envíos a CABA, GBA y al interior del país por Vía Cargo.";

export const CATEGORY_SEO: Record<string, CategorySeo> = {
  proteinas: {
    keyword: "proteína whey",
    variants: ["whey protein", "comprar proteína en polvo"],
    h1: "Proteína whey",
    title: "Proteína whey: comprar online",
    description:
      "Proteína whey 100% original en Suple Market: whey protein en distintos sabores y presentaciones. 10% off por transferencia. ¡Comprala online!",
    intro:
      "Proteína whey 100% original para sumar proteína a tu día de forma práctica. Elegí tu whey protein por sabor, marca y presentación.",
    h2: "Comprar proteína whey online en Argentina",
    body: `Si querés comprar proteína en polvo, en Suple Market tenés whey protein de marcas reconocidas, con 10% de descuento pagando por transferencia. ${ENVIO}`,
  },
  creatina: {
    keyword: "creatina monohidrato",
    variants: ["comprar creatina", "creatina micronizada"],
    h1: "Creatina monohidrato",
    title: "Creatina monohidrato: comprar online",
    description:
      "Creatina monohidrato y micronizada 100% original en Suple Market, en pote y doypack. 10% off por transferencia y envíos a todo el país. ¡Comprá online!",
    intro:
      "Creatina monohidrato y creatina micronizada 100% original, en pote y doypack. Elegí la presentación que mejor se adapte a tu entrenamiento.",
    h2: "Comprar creatina online en Argentina",
    body: `Comprá creatina micronizada o monohidrato en Suple Market con 10% de descuento pagando por transferencia. ${ENVIO}`,
  },
  "pancakes-proteicos": {
    keyword: "pancakes proteicos",
    variants: ["pancakes con proteína", "mezcla para pancakes proteicos"],
    h1: "Pancakes proteicos",
    title: "Pancakes proteicos: comprar online",
    description:
      "Pancakes proteicos dulces y salados en Suple Market: mezcla lista para preparar en minutos. 10% off por transferencia y envíos a todo el país. ¡Pedilos!",
    intro:
      "Pancakes proteicos dulces y salados, listos para preparar en minutos. Una opción práctica para desayunos y meriendas con más proteína.",
    h2: "Comprar pancakes con proteína online",
    body: `La mezcla para pancakes proteicos se prepara en minutos. Comprala en Suple Market con 10% de descuento pagando por transferencia. ${ENVIO}`,
  },
  combos: {
    keyword: "combo proteína y creatina",
    variants: ["combo de suplementos", "pack proteína creatina shaker"],
    h1: "Combos de proteína y creatina",
    title: "Combo proteína y creatina",
    description:
      "Combo proteína y creatina en Suple Market, con opción de sumar shaker: todo en un solo pedido. 10% off por transferencia y envíos a todo el país. ¡Comprá!",
    intro:
      "Combo proteína y creatina, con opción de sumar shaker: armá tu pack de suplementos y recibí todo en un solo pedido.",
    h2: "Comprar combos de suplementos online",
    body: `Elegí el combo de suplementos que necesitás, con proteína, creatina y shaker. 10% de descuento pagando por transferencia. ${ENVIO}`,
  },
  shakers: {
    keyword: "shaker para proteína",
    variants: ["vaso mezclador de proteína"],
    h1: "Shakers para proteína",
    title: "Shaker para proteína: comprar online",
    description:
      "Shaker para proteína en Suple Market: vaso mezclador con compartimentos para llevar tu whey o creatina. 10% off por transferencia y envíos. ¡Comprá online!",
    intro:
      "Shaker para proteína con compartimentos para llevar tu dosis lista. Mezclá tu whey o tu creatina en segundos, donde estés.",
    h2: "Comprar vaso mezclador de proteína online",
    body: `Un buen vaso mezclador de proteína evita grumos y te deja llevar el polvo aparte. 10% de descuento pagando por transferencia. ${ENVIO}`,
  },
  barritas: {
    keyword: "barritas saludables",
    variants: ["barra proteica"],
    h1: "Barritas saludables",
    title: "Barritas saludables: comprar online",
    description:
      "Barritas saludables en Suple Market: una colación práctica para llevar a donde vayas. 10% off por transferencia y envíos a todo el país. ¡Pedilas!",
    intro:
      "Barritas saludables para llevar en la mochila: una colación práctica para antes o después de entrenar.",
    h2: "Comprar barritas saludables online",
    body: `Encontrá barras proteicas como la de Íntegra, con 10% de descuento pagando por transferencia. ${ENVIO}`,
  },
  "kinesio-tape": {
    keyword: "kinesio tape",
    variants: ["cinta kinesiológica"],
    h1: "Kinesio tape",
    title: "Kinesio tape: comprar online",
    description:
      "Kinesio tape en Suple Market: cinta kinesiológica elástica y adhesiva para entrenar y para el día a día. 10% off por transferencia y envíos. ¡Comprala!",
    intro:
      "Kinesio tape: cinta kinesiológica elástica y adhesiva, para usar en el entrenamiento y en el día a día.",
    h2: "Comprar cinta kinesiológica online",
    body: `Comprá tu cinta kinesiológica en Suple Market con 10% de descuento pagando por transferencia. ${ENVIO}`,
  },
};

/** SEO de una categoría (o un texto genérico si es una categoría nueva del CRM). */
export function categorySeo(slug: string, name: string): CategorySeo {
  const known = CATEGORY_SEO[slug];
  if (known) return known;
  const n = prettyName(name);
  return {
    keyword: n.toLowerCase(),
    variants: [],
    h1: n,
    title: `${n}: comprar online`,
    description: clip(
      `${n} 100% originales en Suple Market. 10% off por transferencia y envíos a CABA, GBA y todo el país. ¡Comprá online!`,
      155,
    ),
    intro: `${n} 100% originales en Suple Market. Filtrá por marca y precio para encontrar el tuyo.`,
    h2: `Comprar ${n.toLowerCase()} online`,
    body: `10% de descuento pagando por transferencia. ${ENVIO}`,
  };
}

/* ------------------------------ Productos -------------------------------- */

/** "WHEY PROTEIN TRUE MADE 1kg" → "Whey Protein True Made 1kg" (siglas de 3 letras quedan). */
export function prettyName(s: string): string {
  return String(s)
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => {
      const letters = w.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
      if (letters.length > 3 && letters === letters.toUpperCase()) {
        return w.charAt(0) + w.slice(1).toLowerCase();
      }
      return w;
    })
    .join(" ");
}

/** Nombre de marca prolijo a partir de lo que viene de la planilla. */
export function prettyBrand(raw: string): string {
  const b = String(raw || "").split("/")[0].trim();
  if (!b) return "";
  if (/^star/i.test(b)) return "Star Nutrition";
  if (/^ena$/i.test(b)) return "ENA";
  if (/^integra$/i.test(b)) return "Íntegra";
  return prettyName(b.charAt(0).toUpperCase() + b.slice(1));
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.·-]+$/, "") + "…";
}

/** Palabra clave / meta title de un producto (sin "| Suple Market"). */
export function productTitle(name: string, brand: string): string {
  const n = prettyName(name);
  const b = prettyBrand(brand);
  const withBrand = b && !n.toLowerCase().includes(b.toLowerCase().split(" ")[0]) ? `${n} ${b}` : n;
  return withBrand.length <= 44 ? withBrand : n.length <= 44 ? n : clip(n, 44);
}

/** Meta descripción de un producto: arranca con su nombre, 140-155 caracteres. */
export function productDescription(name: string, brand: string, description: string): string {
  const kw = productTitle(name, brand);
  const cta = " 10% off por transferencia y envíos a todo el país.";
  const desc = String(description || "")
    .replace(/\s+/g, " ")
    .trim();
  const room = 155 - kw.length - 2 - cta.length;
  if (desc && room > 30) {
    return `${kw}: ${clip(desc, room)}${cta}`.slice(0, 160);
  }
  return clip(`${kw} 100% original en Suple Market.${cta} ¡Comprá online!`, 155);
}
