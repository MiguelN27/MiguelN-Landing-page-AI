const THEME_KEY = "ashborne-theme";

function parseRgbChannels(color) {
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const channels = match[1].split(",").map((value) => Number.parseFloat(value.trim()));
  if (channels.length < 3 || channels.some((value) => Number.isNaN(value))) return null;
  return channels;
}

function relativeLuminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function findSolidBackground(element) {
  let current = element;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const color = style.backgroundColor;
    const channels = parseRgbChannels(color);
    if (channels && channels[3] !== 0) return channels;
    current = current.parentElement;
  }
  return [251, 251, 254, 1];
}

function updateLightModeContrast() {
  const isDark = document.documentElement.classList.contains("dark");
  const candidates = document.querySelectorAll("#features, .glass-card, .feature-card, #testimonials figure, #pricing article");

  candidates.forEach((element) => {
    element.classList.remove("force-light-text");
    if (isDark) return;

    const bgChannels = findSolidBackground(element);
    const luminance = relativeLuminance(bgChannels);
    if (luminance < 122) {
      element.classList.add("force-light-text");
    }
  });
}

function applyTheme(isDark) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", isDark ? "dark" : "light");
  root.style.colorScheme = isDark ? "dark" : "light";
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
}

function updateThemeIcon(buttonIcon) {
  if (!buttonIcon) return;
  const isDark = document.documentElement.classList.contains("dark");
  buttonIcon.textContent = isDark ? "☾" : "☀";
}

function toggleTheme(buttonIcon, toggleButton) {
  const isDark = !document.documentElement.classList.contains("dark");
  applyTheme(isDark);
  if (toggleButton) {
    toggleButton.setAttribute("aria-pressed", String(isDark));
  }
  updateThemeIcon(buttonIcon);
  updateLightModeContrast();
}

function initThemeToggle() {
  const toggleButton = document.getElementById("theme-toggle");
  const icon = document.getElementById("theme-icon");

  const isDark = document.documentElement.classList.contains("dark");
  applyTheme(isDark);
  updateThemeIcon(icon);

  if (!toggleButton) return;
  toggleButton.setAttribute("aria-pressed", String(isDark));

  toggleButton.addEventListener("click", () => toggleTheme(icon, toggleButton));
}

function initRevealObserver() {
  const revealElements = document.querySelectorAll(".reveal");
  if (!revealElements.length) return;

  const observer = new IntersectionObserver(
    (entries, io) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -7% 0px",
    }
  );

  revealElements.forEach((element) => observer.observe(element));
}

function initSmoothAnchorEnhancements() {
  const internalLinks = document.querySelectorAll('a[href^="#"]');
  internalLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const section = document.querySelector(href);
      if (!section) return;
      section.classList.add("ring-2", "ring-ember/40", "ring-offset-4", "dark:ring-offset-zinc-950");
      setTimeout(() => {
        section.classList.remove("ring-2", "ring-ember/40", "ring-offset-4", "dark:ring-offset-zinc-950");
      }, 1000);
    });
  });
}

function initPage() {
  initThemeToggle();
  initRevealObserver();
  initSmoothAnchorEnhancements();
  updateLightModeContrast();
}

document.addEventListener("DOMContentLoaded", initPage);