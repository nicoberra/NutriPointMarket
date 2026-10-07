import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { WelcomeToast } from "@/components/WelcomeToast";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ToastHost } from "@/components/ToastHost";

/** Armazón de la TIENDA (header, footer, carrito, WhatsApp, toasts). */
export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WelcomeToast />
      <WhatsAppButton />
      <ToastHost />
    </div>
  );
}
