/* ============================================================================
   CONFIGURACIÓN GLOBAL DE NUTRIPOINTMARKET
   ----------------------------------------------------------------------------
   Datos de contacto, WhatsApp, mensajes y navegación. TODO acá es placeholder
   y está pensado para reemplazarse fácilmente cuando existan datos reales.
   ============================================================================ */

/**
 * Prefijo para assets estáticos (imágenes del logo, etc.).
 * Con dominio propio el sitio vive en la raíz "/", así que no lleva prefijo.
 * Debe coincidir con `basePath` de next.config.mjs (hoy vacío).
 */
export const ASSET_PREFIX = "";

export const SITE = {
  name: "Suple Market",
  /** Se resalta esta palabra en el logotipo tipográfico */
  nameHighlight: "Market",
  tagline: "Suplementos deportivos, nutrición y rendimiento.",
  description:
    "Proteínas, creatinas, vitaminas, aminoácidos y suplementos deportivos. Suple Market.",
  email: "suplemarketargentina@gmail.com",
  phone: "+54 9 11 5164-0472",
  address: "Buenos Aires, Argentina", // placeholder
  instagram: "https://www.instagram.com/suplemarket.ar/",
};

/**
 * Nutricionista recomendada (sección en la home).
 * Datos reales cargados; la foto está en public/nutri.jpg.
 */
export const NUTRI = {
  name: "Jesica Cuevas",
  title: "Licenciada en Nutrición",
  license: "M.N. 12233",
  photo: "/nutri.jpg",
  whatsapp: "5491137978217",
  instagram: "https://www.instagram.com/nutricionista.cj/",
  bio: "Planes 100% personalizados según tu objetivo. Consultorio en Morón y seguimiento por WhatsApp. Agendá tu turno y contale que venís de Suple Market.",
  tags: [
    "Nutrición deportiva",
    "Antropometría (composición corporal)",
    "Dietas específicas: vegetarianos, veganos, celíacos",
    "Nutrición clínica general",
    "Cambio de hábitos",
    "Planes infantiles, embarazo y lactancia",
  ],
  /** Formación destacada (certificados en la carpeta JESI). */
  training: [
    "Antropometrista ISAK nivel 1",
    "Posgrado en nutrición en personas mayores (AADYND)",
    "Abordaje nutricional del embarazo (Univ. Austral)",
    "Nutrición integral en veganos y vegetarianos",
    "Suplementación en deportistas adolescentes",
  ],
  message: "Hola! Vengo de Suple Market y quería consultar por una consulta de nutrición.",
};

/**
 * Datos para pagos por TRANSFERENCIA. Reemplazá por los reales (te los muestra
 * la web al cliente cuando elige transferencia).
 */
export const TRANSFER = {
  alias: "suple.market", // ← alias (se puede cambiar cuando quieras)
  cvu: "0000168300000014412189", // CVU/CBU
  titular: "Nicolas Thiago Berra", // titular de la cuenta
  banco: "", // ← opcional: banco / billetera (Mercado Pago, Ualá, etc.)
};

/**
 * URL de la API (Google Apps Script) que lee/escribe la planilla de Google Sheets.
 * Es la "base de datos" de NutriPointMarket. Se lee desde la web con JSONP.
 * Si redeployás con URL nueva, cambiala acá.
 */
export const SHEETS_API_URL =
  "https://script.google.com/macros/s/AKfycbxLxwZdBzKzo3lUH5XDI6-0l-c1Lv7b4bTiqBNsqxEIfeQdC3bvdGm95910jjp_o86atw/exec";

/** Número real de WhatsApp (formato internacional sin +) */
export const WHATSAPP_NUMBER = "5491151640472";
export const WHATSAPP_MESSAGE = "Hola Suple Market, quería consultar por…";

export function whatsappLink(message: string = WHATSAPP_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Mensajes de la barra promocional superior (rotan en mobile) */
export const PROMO_MESSAGES = [
  "✅ Productos 100% originales",
  "💰 10% de descuento pagando por transferencia",
  "🏦 Aceptamos transferencia bancaria y Mercado Pago",
];

/** Beneficios de la franja de confianza */
export const TRUST_ITEMS = [
  {
    icon: "shield",
    title: "Productos originales",
    text: "Trabajamos solo con distribuidores oficiales.",
  },
  {
    icon: "percent",
    title: "Descuento por transferencia",
    text: "10% de descuento pagando por transferencia.",
  },
  {
    icon: "card",
    title: "Pago seguro",
    text: "Transferencia bancaria y Mercado Pago.",
  },
  {
    icon: "whatsapp",
    title: "Coordinás por WhatsApp",
    text: "Te asesoramos y coordinamos la entrega.",
  },
];

/** Navegación principal. `children` genera submenús (dropdown en desktop). */
export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
  highlight?: boolean;
}

export const NAV: NavItem[] = [
  { label: "Inicio", href: "/" },
  {
    label: "Productos",
    href: "/productos",
    children: [
      { label: "Ver todo", href: "/productos" },
      { label: "Más vendidos", href: "/productos?orden=mas-vendidos" },
      { label: "Novedades", href: "/productos?orden=novedades" },
      { label: "Destacados", href: "/productos?orden=destacados" },
    ],
  },
  { label: "Marcas", href: "/marcas" },
  { label: "Proteínas", href: "/productos?categoria=proteinas" },
  { label: "Creatinas", href: "/productos?categoria=creatinas" },
  { label: "Pre entrenos", href: "/productos?categoria=pre-entreno" },
  {
    label: "Nutrientes",
    href: "/productos",
    children: [
      { label: "Aminoácidos", href: "/productos?categoria=aminoacidos" },
      { label: "Vitaminas", href: "/productos?categoria=vitaminas" },
      { label: "Minerales", href: "/productos?categoria=minerales" },
      { label: "Colágeno", href: "/productos?categoria=colageno" },
    ],
  },
  { label: "Barras y snacks", href: "/productos?categoria=barras-snacks" },
  { label: "Combos", href: "/productos?categoria=combos" },
  { label: "Ofertas", href: "/ofertas", highlight: true },
  { label: "Contacto", href: "/contacto" },
];

/** Enlaces del footer */
export const FOOTER_HELP = [
  { label: "Cómo comprar", href: "/contacto#como-comprar" },
  { label: "Envíos", href: "/contacto#envios" },
  { label: "Medios de pago", href: "/contacto#pagos" },
  { label: "Cambios y devoluciones", href: "/contacto#devoluciones" },
  { label: "Preguntas frecuentes", href: "/contacto#faq" },
];

export const FOOTER_NAV = [
  { label: "Inicio", href: "/" },
  { label: "Productos", href: "/productos" },
  { label: "Marcas", href: "/marcas" },
  { label: "Ofertas", href: "/ofertas" },
  { label: "Contacto", href: "/contacto" },
];

/** Enlaces legales (placeholders requeridos en Argentina) */
export const FOOTER_LEGAL = [
  { label: "Términos y condiciones", href: "#" },
  { label: "Política de privacidad", href: "#" },
  { label: "Defensa de las y los consumidores", href: "#" },
];

/** Descuento pagando por transferencia (10%). Se muestra el precio final en cada producto. */
export const TRANSFER_DISCOUNT = 0.1;
export function transferPrice(price: number): number {
  return Math.round(price * (1 - TRANSFER_DISCOUNT));
}

/**
 * Precio PUBLICADO en la web a partir del precio con transferencia (el que se
 * carga en el CRM): se le suma el margen para absorber el 10% de descuento
 * (base / 0,9, redondeado a $100). Pagando por transferencia se vuelve al base.
 */
export function listPrice(base: number): number {
  if (!base || base <= 0) return 0;
  return Math.round(base / (1 - TRANSFER_DISCOUNT) / 100) * 100;
}
