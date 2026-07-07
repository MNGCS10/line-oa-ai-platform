import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatCurrencyTHB(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDateTimeTH(date: Date | string): string {
  return new Date(date).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
