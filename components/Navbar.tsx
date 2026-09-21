"use client";

import Link from "next/link";
import { NAV } from "@/lib/config";
import { ChevronDownIcon } from "./Icons";

/** Navegación horizontal para desktop, con submenús desplegables. */
export function Navbar() {
  return (
    <nav aria-label="Navegación principal" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {NAV.map((item) => (
          <li key={item.label} className="group relative">
            <Link
              href={item.href}
              className={`flex items-center gap-1 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                item.highlight
                  ? "text-accent hover:text-accent"
                  : "text-white/90 hover:text-accent"
              }`}
            >
              {item.label}
              {item.children && <ChevronDownIcon className="h-3.5 w-3.5" />}
            </Link>

            {item.children && (
              <div className="invisible absolute left-0 top-full z-50 min-w-52 translate-y-1 pt-1 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <ul className="overflow-hidden rounded-xl border border-line bg-white py-1 shadow-drawer">
                  {item.children.map((child) => (
                    <li key={child.label}>
                      <Link
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-ink transition-colors hover:bg-page-soft hover:text-accent"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
