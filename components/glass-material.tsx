"use client";
import { Glass } from "@samasante/liquid-glass";

export function GlassMaterial() {
  return <Glass aria-hidden="true" className="product-glass-material" style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", borderRadius:"inherit", background:"rgba(243,232,188,.24)" }} optics={{ frost:8, strength:.012, dispersion:.08, brightness:.02 }} />;
}
