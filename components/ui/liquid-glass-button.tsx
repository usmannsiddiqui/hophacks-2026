import type { ComponentPropsWithRef } from "react";

/** Adapted from the supplied liquid-glass reference. CSS pseudo-elements provide
 * its bevel and sheen without duplicating SVG filter IDs or blurring the label.
 * Native props/ref and link semantics stay intact throughout the app.
 */
export function LiquidButton({
  className = "",
  ...props
}: ComponentPropsWithRef<"button">) {
  return <button data-slot="button" {...props} className={`liquid-button ${className}`} />;
}
