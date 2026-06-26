import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`flex items-center justify-center w-9 h-9 rounded-2xl border transition duration-200
        bg-[var(--color-surface)] border-[var(--color-border)]
        hover:bg-[var(--color-surface-hover)]
        text-[var(--color-text)] ${className}`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
