import { TRUST_ITEMS } from "@/lib/config";
import { ShieldIcon, TruckIcon, CardIcon, StoreIcon, PercentIcon, WhatsappIcon } from "./Icons";

const ICONS = {
  shield: ShieldIcon,
  truck: TruckIcon,
  card: CardIcon,
  store: StoreIcon,
  percent: PercentIcon,
  whatsapp: WhatsappIcon,
} as const;

/** Franja de confianza (envíos, pagos, originales, retiro). */
export function TrustStrip() {
  return (
    <section className="border-y border-line bg-white">
      <div className="container-page grid grid-cols-2 gap-x-4 gap-y-6 py-6 lg:grid-cols-4">
        {TRUST_ITEMS.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? ShieldIcon;
          return (
            <div key={item.title} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
                <Icon className="h-5.5 w-5.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{item.title}</p>
                <p className="truncate text-xs text-muted">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
