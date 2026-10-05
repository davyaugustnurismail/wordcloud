"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { applyViewportScale } from "@/lib/viewport-scale";

export function ViewportScale() {
  const pathname = usePathname();

  useEffect(() => {
    const apply = () => applyViewportScale(pathname);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [pathname]);

  return null;
}
