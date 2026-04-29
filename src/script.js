const THEME_KEY = "ashborne-theme";
const BILLING_KEY = "ashborne-billing";

const pricingState = {
  billingCycle: "monthly",
  users: 1,
  compareActive: false,
  selectedPlans: [],
};

const COMPARE_SLOT_ORDER = ["instrument", "build", "consultation", "priority"];
const COMPARE_SLOT_LABELS = {
  instrument: "Instrument",
  build: "Build",
  consultation: "Consultation",
  priority: "Priority",
};

let parallaxScheduled = false;

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

function contrastRatio(luminanceA, luminanceB) {
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
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

function findTextColor(element) {
  const style = window.getComputedStyle(element);
  const channels = parseRgbChannels(style.color);
  return channels || [17, 24, 39, 1];
}

function updateLightModeContrast() {
  const isDark = document.documentElement.classList.contains("dark");
  const candidates = document.querySelectorAll(
    "header, footer, main section, main article, main figure, main div, main a, main button"
  );

  candidates.forEach((element) => {
    element.classList.remove("force-light-text");
    if (isDark) return;

    // Skip elements with no readable content.
    if (!element.textContent || !element.textContent.trim()) return;

    const bgChannels = findSolidBackground(element);
    const textChannels = findTextColor(element);
    const alpha = bgChannels[3] ?? 1;
    const bgLuminance = relativeLuminance(bgChannels);
    const textLuminance = relativeLuminance(textChannels);
    const ratio = contrastRatio((bgLuminance + 0.05) / 255, (textLuminance + 0.05) / 255);

    // In light mode, only force dark text when both text and background are bright,
    // and the contrast is poor enough to hurt readability.
    if (alpha > 0.3 && bgLuminance > 165 && textLuminance > 150 && ratio < 3.3) {
      element.classList.add("force-light-text");
    }
  });
}

function applyTheme(isDark) {
  const root = document.documentElement;
  root.classList.add("theme-transitioning");
  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", isDark ? "dark" : "light");
  root.style.colorScheme = isDark ? "dark" : "light";
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

  window.setTimeout(() => {
    root.classList.remove("theme-transitioning");
  }, 320);
}

function updateThemeIcon(buttonIcon) {
  if (!buttonIcon) return;
  const isDark = document.documentElement.classList.contains("dark");
  buttonIcon.style.transform = "rotate(-22deg) scale(0.92)";
  buttonIcon.style.opacity = "0.6";

  window.setTimeout(() => {
  buttonIcon.textContent = isDark ? "☾" : "☀";
    buttonIcon.style.transform = "rotate(0deg) scale(1)";
    buttonIcon.style.opacity = "1";
  }, 110);
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

  const staggerGroups = document.querySelectorAll("[data-stagger-group]");
  staggerGroups.forEach((group) => {
    const cards = group.querySelectorAll(".feature-card.reveal");
    cards.forEach((card, index) => {
      card.style.transitionDelay = `${index * 120}ms`;
    });
  });

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

function initIconObserver() {
  const iconHolders = document.querySelectorAll(".icon-animate");
  if (!iconHolders.length) return;

  const observer = new IntersectionObserver(
    (entries, io) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    },
    {
      threshold: 0.4,
      rootMargin: "0px 0px -6% 0px",
    }
  );

  iconHolders.forEach((icon) => observer.observe(icon));
}

function applyParallax() {
  const y = window.scrollY || 0;
  const ambient = document.querySelector(".ambient-bg");
  const heroGradient = document.querySelector(".hero-gradient");

  if (ambient) {
    ambient.style.transform = `translate3d(0, ${y * -0.04}px, 0)`;
  }

  if (heroGradient) {
    heroGradient.style.transform = `translate3d(0, ${y * 0.06}px, 0)`;
  }
}

function queueParallax() {
  if (parallaxScheduled) return;
  parallaxScheduled = true;

  window.requestAnimationFrame(() => {
    applyParallax();
    parallaxScheduled = false;
  });
}

function initParallax() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  applyParallax();
  window.addEventListener("scroll", queueParallax, { passive: true });
}

function initRippleEffect() {
  const targets = document.querySelectorAll(".ripple-btn");
  targets.forEach((element) => {
    element.addEventListener("click", (event) => {
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 0.7;
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.className = "ripple";
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      element.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 600);
    });
  });
}

function initPricing3DHover() {
  const cards = document.querySelectorAll(".pricing-card");
  cards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 4;
      const rotateX = ((centerY - y) / centerY) * 4;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "rotateX(0deg) rotateY(0deg) translateY(0)";
    });
  });
}

function initCtaLoadingStates() {
  const ctas = document.querySelectorAll(".cta-action");
  ctas.forEach((cta) => {
    cta.addEventListener("click", () => {
      cta.classList.add("is-loading");
      window.setTimeout(() => {
        cta.classList.remove("is-loading");
      }, 750);
    });
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function computePlanMonthly(baseMonthly, perUser, users) {
  return baseMonthly + Math.max(users - 1, 0) * perUser;
}

function getPricingElements() {
  const grid = document.getElementById("pricing-grid");
  if (!grid) return null;

  return {
    grid,
    cards: Array.from(grid.querySelectorAll(".pricing-card")),
    monthlyButton: document.getElementById("billing-monthly"),
    annualButton: document.getElementById("billing-annual"),
    compareButton: document.getElementById("compare-plans-btn"),
    recommendButton: document.getElementById("recommend-plan-btn"),
    usersSlider: document.getElementById("users-slider"),
    usersCount: document.getElementById("users-count"),
    savingsLabel: document.getElementById("annual-savings-label"),
    announce: document.getElementById("pricing-announce"),
    mostChosenBadge: document.getElementById("most-chosen-badge"),
  };
}

function updateBillingButtons(monthlyButton, annualButton, billingCycle) {
  if (!monthlyButton || !annualButton) return;
  const isMonthly = billingCycle === "monthly";
  monthlyButton.setAttribute("aria-pressed", String(isMonthly));
  annualButton.setAttribute("aria-pressed", String(!isMonthly));
}

function updatePricingCards(cards, billingCycle, users) {
  let highestDiscount = 0;

  // Recalculate each card from shared state so UI always stays in sync.
  cards.forEach((card) => {
    const baseMonthly = Number.parseFloat(card.dataset.baseMonthly || "0");
    const perUser = Number.parseFloat(card.dataset.perUser || "0");
    const discount = Number.parseFloat(card.dataset.annualDiscount || "0");
    const monthly = computePlanMonthly(baseMonthly, perUser, users);
    const annual = monthly * 12 * (1 - discount / 100);
    const savings = monthly * 12 - annual;

    const priceValue = card.querySelector("[data-price-value]");
    const pricePeriod = card.querySelector("[data-price-period]");
    const saveMessage = card.querySelector("[data-save-message]");

    if (priceValue) {
      priceValue.textContent = billingCycle === "annual" ? formatCurrency(Math.round(annual)) : formatCurrency(Math.round(monthly));
    }

    if (pricePeriod) {
      pricePeriod.textContent =
        billingCycle === "annual"
          ? `Billed annually • ${formatCurrency(Math.round(annual / 12))}/mo equivalent`
          : "Billed monthly";
    }

    if (saveMessage) {
      saveMessage.textContent = billingCycle === "annual" ? `Save ${Math.round(discount)}% (${formatCurrency(Math.round(savings))}/year)` : "";
    }

    highestDiscount = Math.max(highestDiscount, discount);
  });

  return highestDiscount;
}

function initPricingHoverDifferences(cards) {
  if (!cards.length) return;

  // Build a feature frequency map to highlight only differentiators.
  const featureCounts = new Map();
  cards.forEach((card) => {
    card.querySelectorAll(".pricing-feature[data-feature]").forEach((feature) => {
      const key = feature.dataset.feature;
      if (!key) return;
      featureCounts.set(key, (featureCounts.get(key) || 0) + 1);
    });
  });

  function clearStates() {
    if (pricingState.compareActive) return;
    cards.forEach((card) => {
      card.classList.remove("is-hovered", "is-dimmed");
      card.querySelectorAll(".pricing-feature").forEach((feature) => {
        feature.classList.remove("feature-diff");
      });
    });
  }

  function highlightFor(card) {
    if (pricingState.compareActive) return;
    clearStates();
    cards.forEach((targetCard) => {
      targetCard.classList.toggle("is-hovered", targetCard === card);
      targetCard.classList.toggle("is-dimmed", targetCard !== card);
    });

    card.querySelectorAll(".pricing-feature[data-feature]").forEach((feature) => {
      const key = feature.dataset.feature;
      if (!key) return;
      if (featureCounts.get(key) === 1) {
        feature.classList.add("feature-diff");
      }
    });
  }

  cards.forEach((card, index) => {
    card.setAttribute("tabindex", "0");
    card.addEventListener("mouseenter", () => highlightFor(card));
    card.addEventListener("focusin", () => highlightFor(card));
    card.addEventListener("mouseleave", clearStates);
    card.addEventListener("focusout", () => {
      if (!card.contains(document.activeElement)) {
        clearStates();
      }
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const targetIndex = (index + direction + cards.length) % cards.length;
      cards[targetIndex].focus();
      event.preventDefault();
    });
  });
}

function initPricingComparator() {
  const elements = getPricingElements();
  if (!elements) return;

  const {
    grid,
    cards,
    monthlyButton,
    annualButton,
    compareButton,
    recommendButton,
    usersSlider,
    usersCount,
    savingsLabel,
    announce,
    mostChosenBadge,
  } = elements;

  const storedBilling = localStorage.getItem(BILLING_KEY);
  pricingState.billingCycle = storedBilling === "annual" ? "annual" : "monthly";
  pricingState.users = Number.parseInt(usersSlider?.value || "1", 10) || 1;
  let badgeFadeTimeout = null;

  function normalizeCardFeatures(card) {
    const featureList = card.querySelector("ul");
    if (!featureList) return;

    const bySlot = new Map();
    card.querySelectorAll(".pricing-feature[data-compare-slot]").forEach((feature) => {
      const slot = feature.dataset.compareSlot;
      if (!slot || bySlot.has(slot)) return;
      bySlot.set(slot, feature);
    });

    COMPARE_SLOT_ORDER.forEach((slot) => {
      const feature = bySlot.get(slot);
      if (!feature) return;

      const existingLabel = feature.querySelector(".feature-label");
      if (!existingLabel) {
        const originalText = feature.textContent?.trim() || "";
        feature.textContent = "";
        const label = document.createElement("span");
        label.className = "feature-label";
        label.textContent = `${COMPARE_SLOT_LABELS[slot]}:`;
        const value = document.createElement("span");
        value.textContent = originalText;
        feature.append(label, value);
      }

      featureList.appendChild(feature);
    });
  }

  function clearComparison() {
    pricingState.selectedPlans = [];
    pricingState.compareActive = false;
    cards.forEach((card) => {
      card.classList.remove("compare-selected", "compare-muted");
    });
    grid.classList.remove("compare-active");
    if (compareButton) {
      compareButton.classList.remove("is-active");
      compareButton.setAttribute("aria-expanded", "false");
      compareButton.textContent = "Compare plans";
    }
  }

  function paintComparisonSelection() {
    const selectedSet = new Set(pricingState.selectedPlans);
    const hasTwo = pricingState.selectedPlans.length === 2;

    cards.forEach((card) => {
      card.classList.toggle("compare-selected", selectedSet.has(card.dataset.plan));
      card.classList.toggle("compare-muted", hasTwo && !selectedSet.has(card.dataset.plan));
    });

    pricingState.compareActive = hasTwo;
    grid.classList.toggle("compare-active", hasTwo);

    if (compareButton) {
      compareButton.classList.toggle("is-active", hasTwo);
      compareButton.setAttribute("aria-expanded", String(hasTwo));
      compareButton.textContent = hasTwo ? "Clear comparison" : "Compare plans";
    }
  }

  function selectPlanForComparison(plan) {
    const index = pricingState.selectedPlans.indexOf(plan);

    if (index >= 0) {
      pricingState.selectedPlans.splice(index, 1);
    } else if (pricingState.selectedPlans.length < 2) {
      pricingState.selectedPlans.push(plan);
    } else {
      pricingState.selectedPlans = [plan];
    }

    paintComparisonSelection();

    if (!announce) return;
    if (pricingState.selectedPlans.length === 0) {
      announce.textContent = "Comparison cleared.";
    } else if (pricingState.selectedPlans.length === 1) {
      announce.textContent = "First plan selected. Click a second plan to compare.";
    } else {
      announce.textContent = "Two plans selected. Features are aligned for direct comparison.";
    }
  }

  cards.forEach((card) => {
    normalizeCardFeatures(card);
    card.addEventListener("click", () => {
      const plan = card.dataset.plan;
      if (!plan) return;
      selectPlanForComparison(plan);
    });
  });

  function updatePricingUi(announceMessage = "") {
    // Keep state mirrored in data attributes for styling hooks and debugging.
    grid.dataset.billing = pricingState.billingCycle;
    grid.dataset.users = String(pricingState.users);

    if (usersCount) {
      usersCount.textContent = String(pricingState.users);
    }

    const bestDiscount = updatePricingCards(cards, pricingState.billingCycle, pricingState.users);
    updateBillingButtons(monthlyButton, annualButton, pricingState.billingCycle);

    if (savingsLabel) {
      savingsLabel.textContent = `Pay annually and save up to ${Math.round(bestDiscount)}%.`;
    }

    if (announce && announceMessage) {
      announce.textContent = announceMessage;
    }
  }

  function setBillingCycle(nextCycle, shouldAnnounce) {
    pricingState.billingCycle = nextCycle;
    localStorage.setItem(BILLING_KEY, nextCycle);
    const message =
      nextCycle === "annual"
        ? `Annual billing selected for ${pricingState.users} users.`
        : `Monthly billing selected for ${pricingState.users} users.`;
    updatePricingUi(shouldAnnounce ? message : "");
  }

  if (monthlyButton) {
    monthlyButton.addEventListener("click", () => setBillingCycle("monthly", true));
  }

  if (annualButton) {
    annualButton.addEventListener("click", () => setBillingCycle("annual", true));
  }

  if (usersSlider) {
    usersSlider.addEventListener("input", () => {
      pricingState.users = Number.parseInt(usersSlider.value, 10) || 1;
      updatePricingUi(`Updated to ${pricingState.users} users.`);
    });
  }

  if (recommendButton && cards.length > 1) {
    recommendButton.addEventListener("click", () => {
      cards.forEach((card) => card.classList.remove("recommended"));
      const middleCard = cards[1];
      middleCard.classList.add("recommended");
      if (mostChosenBadge) {
        if (badgeFadeTimeout) {
          window.clearTimeout(badgeFadeTimeout);
        }
        mostChosenBadge.classList.add("is-visible");
        mostChosenBadge.setAttribute("aria-hidden", "false");
        badgeFadeTimeout = window.setTimeout(() => {
          mostChosenBadge.classList.remove("is-visible");
          mostChosenBadge.setAttribute("aria-hidden", "true");
          badgeFadeTimeout = null;
        }, 5000);
      }
      middleCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      if (announce) {
        announce.textContent = "Recommended plan selected: Pro.";
      }
    });
  }

  if (compareButton) {
    compareButton.addEventListener("click", () => {
      clearComparison();
      if (announce) announce.textContent = "Comparison reset. Click two plan cards to compare.";
    });
  }

  initPricingHoverDifferences(cards);
  updatePricingUi();
}

function initSmoothAnchorEnhancements() {
  const internalLinks = document.querySelectorAll('a[href^="#"]');
  internalLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const section = document.querySelector(href);
      if (!section) return;

      event.preventDefault();
      const header = document.querySelector("header");
      const headerHeight = header ? header.offsetHeight : 0;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY - headerHeight - 14;
      window.scrollTo({ top: Math.max(sectionTop, 0), behavior: "smooth" });

      if (history.replaceState) {
        history.replaceState(null, "", href);
      }
    });
  });
}

function initPage() {
  document.body.classList.add("page-ready");
  initThemeToggle();
  initRevealObserver();
  initIconObserver();
  initParallax();
  initRippleEffect();
  initPricingComparator();
  initPricing3DHover();
  initCtaLoadingStates();
  initSmoothAnchorEnhancements();
  updateLightModeContrast();

  // Re-evaluate contrast on viewport changes.
  window.addEventListener("resize", updateLightModeContrast);
}

document.addEventListener("DOMContentLoaded", initPage);