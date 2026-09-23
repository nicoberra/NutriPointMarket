/* ============================================================================
   CONFIGURACIÓN GLOBAL DE NUTRIPOINTMARKET
   ----------------------------------------------------------------------------
   Datos de contacto, WhatsApp, mensajes y navegación. TODO acá es placeholder
   y está pensado para reemplazarse fácilmente cuando existan datos reales.
   ============================================================================ */

/**
 * Prefijo para assets estáticos (imágenes del logo, etc.).
 * TEMPORAL: mientras el sitio vive en github.io/NutriPointMarket lleva el prefijo.
 * Cuando el dominio propio (nutripointmarket.com.ar) propague, poné ASSET_PREFIX = "".
 * Debe coincidir con `basePath` de next.config.mjs.
 */
export const ASSET_PREFIX =
  process.env.NODE_ENV === "production" ? "/NutriPointMarket" : "";

export const SITE = {
  name: "NutriPointMarket",
  /** Se resalta esta palabra en el logotipo tipográfico */
  nameHighlight: "Point",
  tagline: "Suplementos deportivos, nutrición y rendimiento.",
  description:
    "Proteínas, creatinas, vitaminas, aminoácidos y suplementos deportivos. NutriPointMarket.",
  email: "hola@nutripointmarket.com", // placeholder
  phone: "+54 9 11 0000-0000", // placeholder
  address: "Av. Siempre Activa 1234, Buenos Aires, Argentina", // placeholder
  instagram: "https://instagram.com/nutripointmarket", // placeholder
};

/**
 * URL de la API (Google Apps Script) que lee/escribe la planilla de Google Sheets.
 * Es la "base de datos" de NutriPointMarket. Se lee desde la web con JSONP.
 * Si redeployás con URL nueva, cambiala acá.
 */
export const SHEETS_API_URL =
  "https://script.google.com/macros/s/AKfycbyYjIkAmdpAE7PS6Oa4AvKlfcE8EU09ePkIq1dS-TuCAykVy2GIy_sFQAzeuS1hkjMBSA/exec";

/** Reemplazar por el número real (formato internacional sin +, ej: 5491100000000) */
export const WHATSAPP_NUMBER = "5491100000000";
export const WHATSAPP_MESSAGE = "Hola NutriPointMarket, quería consultar por…";

export function whatsappLink(message: string = WHATSAPP_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Mensajes de la barra promocional superior (rotan en mobile) */
export const PROMO_MESSAGES = [
  "✅ Productos 100% originales",
  "🚚 Envíos a todo el país",
  "💳 Todos los medios de pago · Hasta 12 cuotas",
];

/** Beneficios de la franja de confianza */
export const TRUST_ITEMS = [
  {
    icon: "shield",
    title: "Productos originales",
    text: "Trabajamos solo con distribuidores oficiales.",
  },
  {
    icon: "truck",
    title: "Envíos a todo el país",
    text: "Recibí tus suplementos estés donde estés.",
  },
  {
    icon: "card",
    title: "Todos los medios de pago",
    text: "Tarjetas, transferencia y hasta 12 cuotas.",
  },
  {
    icon: "store",
    title: "Retiro en el local",
    text: "Comprá online y retiralo sin costo.",
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
  { label: "Botón de arrepentimiento", href: "#" },
];
