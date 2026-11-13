import { THEME_KEY } from "../config.js";

export function createThemeFeature({ state, elements, services, actions }) {
  function setupTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === "dark") document.body.classList.add("dark");
  }

  function toggleTheme() {
    document.body.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
  }

  return { setupTheme, toggleTheme };
}
