import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAuthToken() {
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("auth_token");
}

export function getApiOptions() {
  const token = getAuthToken();
  return {
    request: {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  };
}
