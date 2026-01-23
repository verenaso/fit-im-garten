"use client";

import { usePathname } from "next/navigation";
import PageHeader from "./PageHeader";

export default function RouteHeader() {
  const pathname = usePathname() || "";

  // Seiten ohne lila Box
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return null;
  }

  // Damit Termine nicht doppelt wird, solange Termine-Seite noch eigenen Header hat
  if (pathname.startsWith("/termine")) return null;

  // Wichtig: erst spezifische Pfade, dann allgemeine
  const rules = [
    { prefix: "/workouts/neu", title: "Neu", subtitle: "Neues Workout erstellen" },
    { prefix: "/uebungen", title: "Übungen", subtitle: "Übungsdatenbank" },
    { prefix: "/workouts", title: "Historie", subtitle: "Vergangene Workouts" },
    { prefix: "/fotos", title: "Fotos", subtitle: "Momente aus Fit im Garten" },
  ];

  const hit = rules.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));

  if (hit) return <PageHeader title={hit.title} subtitle={hit.subtitle} />;

  // Fallback: erster Pfadteil
  const base = pathname.split("/").filter(Boolean)[0] || "Fit im Garten";
  const title = base.replace(/^\w/, (c) => c.toUpperCase());
  return <PageHeader title={title} subtitle="" />;
}
