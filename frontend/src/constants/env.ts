export const APP_NAME = import.meta.env.VITE_APP_NAME ?? "DIGITAL MAIN-LiT";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";
export const ENABLE_AI = import.meta.env.VITE_ENABLE_AI !== "false";
export const ENABLE_DARK_MODE = import.meta.env.VITE_ENABLE_DARK_MODE !== "false";
export const API_TIMEOUT_MS = 20_000;
