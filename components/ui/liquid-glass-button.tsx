import type { ComponentPropsWithRef } from "react";

/** Native button semantics with the shared cream/teal glass treatment.
 * CSS supplies the optical layers, so controls need no effects or SVG filters.
 * Links share the liquid-button class and keep their native navigation behavior.
 */
export function LiquidButton({
  className = "",
  ...props
}: ComponentPropsWithRef<"button">) {
  return <button {...props} className={`liquid-button ${className}`} />;
}
