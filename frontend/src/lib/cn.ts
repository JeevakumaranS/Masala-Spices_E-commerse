import { clsx, type ClassValue } from "clsx";

/**
 * Tiny class-name helper. Use it everywhere className strings need to be
 * composed so conditional / conflicting utilities stay readable.
 *
 *   cn("btn", isActive && "btn-primary", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
