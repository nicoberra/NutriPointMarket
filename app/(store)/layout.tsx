import { StoreShell } from "@/components/StoreShell";

/** Layout de la TIENDA pública (header, footer, carrito, WhatsApp, toasts). */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
