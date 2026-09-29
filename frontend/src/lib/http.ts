import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  headers: {
    Accept: "application/json",
  },
});

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError<{ detail?: unknown; message?: unknown }>(error)) {
    const { detail, message } = error.response?.data ?? {};
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const entry = item as { loc?: unknown; msg?: unknown };
          const location = Array.isArray(entry.loc)
            ? entry.loc.filter((part): part is string | number => typeof part === "string" || typeof part === "number").join(".")
            : "";
          return typeof entry.msg === "string"
            ? `${location ? `${location}: ` : ""}${entry.msg}`
            : null;
        })
        .filter((item): item is string => item !== null);
      if (messages.length) return messages.join(" ");
    }
    if (typeof message === "string") return message;
    if (error.response) return `Request failed (${error.response.status}).`;
    return fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
