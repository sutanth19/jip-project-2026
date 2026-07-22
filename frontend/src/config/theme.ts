export const theme = {
  colors: {
    primary: "#2563EB",
    secondary: "#10B981",
    accent: "#F59E0B",
    info: "#0EA5E9",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",

    background: "#F8FAFC",
    surface: "#FFFFFF",

    text: "#1E293B",
    border: "#E2E8F0",
  },

  radius: {
    button: "rounded-xl",
    input: "rounded-xl",
    card: "rounded-2xl",
    dialog: "rounded-2xl",
    badge: "rounded-full",
  },

  spacing: {
    section: "py-20",
    container: "max-w-7xl mx-auto px-6",
    card: "p-6",
  },

  typography: {
  hero: "text-6xl font-bold",
  h1: "text-4xl font-bold",
  h2: "text-3xl font-bold",
  h3: "text-2xl font-semibold",
  cardTitle: "text-xl font-semibold",
  body: "text-base",
  small: "text-sm",
},

shadow: {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
},

button: {
  primary:
    "bg-[var(--primary)] text-white hover:brightness-90 rounded-xl px-5 py-2",
  secondary:
    "bg-[var(--secondary)] text-white hover:brightness-90 rounded-xl px-5 py-2",
  outline:
    "border border-[var(--border)] bg-white text-[var(--text)] hover:bg-slate-50 rounded-xl px-5 py-2",
},
} as const;