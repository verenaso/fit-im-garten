"use client";

import { usePathname } from "next/navigation";
import PageHeader from "./PageHeader";

export default function RouteHeader() {
  const pathname = usePathname() || "";

  // Seiten ohne lila Box (z.B. Login/Register/Home)
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }

  // Damit Termine nicht doppelt wird, solange Termine-Seite noch eigenen Header hat
  if (pathname.startsWith("/termine")) return null;

  // Mapping für deine Routen
  const map = {
    "/uebungen": { title: "Neu", subtitle: "Workouts zusammenstellen & hinzufügen" },
    "/workouts": { title: "Historie", subtitle: "Vergangene Workouts & Termine" },
    "/fotos": { title: "Fotos", subtitle: "Momente aus Fit im Garten" },
  };

  // passende Route finden (auch für Unterseiten)
  const entry =
    Object.entries(map).find(([key]) => pathname === key || pathname.startsWith(key + "/"))?.[1];

  // Fallback: wenn mal neue Seite dazukommt
  const title =
    entry?.title ||
    (pathname.split("/").filter(Boolean)[0] || "Fit im Garten").replace(/^\w/, (c) => c.toUpperCase());

  const subtitle = entry?.subtitle || "";

  return <PageHeader title={title} subtitle={subtitle} />;
}
