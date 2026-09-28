import type { Language } from "../i18n/translations";

export const formatCurrency = (amount: number, language: Language, currency = "EUR") => new Intl.NumberFormat(
  language === "it" ? "it-IT" : "en-GB",
  { style: "currency", currency, maximumFractionDigits: 2 },
).format(amount);

export const formatDate = (date: string, language: Language) => new Intl.DateTimeFormat(
  language === "it" ? "it-IT" : "en-GB",
  { day: "2-digit", month: "short", year: "numeric" },
).format(new Date(`${date}T12:00:00Z`));

export const formatMonth = (date: string, language: Language) => new Intl.DateTimeFormat(
  language === "it" ? "it-IT" : "en-GB",
  { month: "short", year: "2-digit", timeZone: "UTC" },
).format(new Date(`${date.slice(0, 7)}-01T12:00:00Z`));

export const formatPercent = (rate: number, language: Language) => new Intl.NumberFormat(
  language === "it" ? "it-IT" : "en-GB",
  { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2, signDisplay: "exceptZero" },
).format(rate);

export const formatQuantity = (quantity: number, language: Language, signed = false) => new Intl.NumberFormat(
  language === "it" ? "it-IT" : "en-GB",
  { maximumFractionDigits: 8, signDisplay: signed ? "exceptZero" : "auto" },
).format(quantity);

export const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};
