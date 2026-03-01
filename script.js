const form = document.getElementById("leadForm");
const formMessage = document.getElementById("formMessage");
const year = document.getElementById("year");
const phoneInput = document.getElementById("telefone");
const consentInput = document.getElementById("consentimento");
const leadMagnetLink = document.getElementById("leadMagnetLink");
const themeToggleButton = document.getElementById("themeToggle");
const countdownElement = document.getElementById("countdown");
const whatsappFloatButton = document.getElementById("whatsappFloat");
const mapButton = document.getElementById("openMapBtn");
const heroTitle = document.getElementById("heroTitle");
const heroSubtitle = document.getElementById("heroSubtitle");
const heroPrimaryCta = document.getElementById("heroPrimaryCta");
const scheduleButtons = document.querySelectorAll(".schedule-btn");
const THEME_STORAGE_KEY = "petshop-theme";
const HERO_VARIANT_STORAGE_KEY = "petshop-hero-variant";
const trackedScrollMilestones = new Set();
let pageTimeTracked = false;

const DEFAULT_MARKETING_CONFIG = {
  gaMeasurementId: "G-XXXXXXXXXX",
  metaPixelId: "000000000000000",
  leadWebhookUrl: "",
  followUpWebhookUrl: "",
  rdStationWebhookUrl: "",
  rdConversionIdentifier: "LP Pet Shop - Lead",
  hubspotWebhookUrl: "",
  hubspotPortalId: "",
  hubspotFormGuid: "",
};

const marketingConfig = {
  ...DEFAULT_MARKETING_CONFIG,
  ...(window.MARKETING_CONFIG || {}),
};

const isGAConfigured =
  typeof marketingConfig.gaMeasurementId === "string" &&
  /^G-[A-Z0-9]+$/i.test(marketingConfig.gaMeasurementId) &&
  marketingConfig.gaMeasurementId !== DEFAULT_MARKETING_CONFIG.gaMeasurementId;

const isMetaConfigured =
  typeof marketingConfig.metaPixelId === "string" &&
  /^\d{8,20}$/.test(marketingConfig.metaPixelId) &&
  marketingConfig.metaPixelId !== DEFAULT_MARKETING_CONFIG.metaPixelId;

const isWebhookConfigured =
  typeof marketingConfig.leadWebhookUrl === "string" &&
  /^https?:\/\//i.test(marketingConfig.leadWebhookUrl);

const isFollowUpWebhookConfigured =
  typeof marketingConfig.followUpWebhookUrl === "string" &&
  /^https?:\/\//i.test(marketingConfig.followUpWebhookUrl);

const isRDWebhookConfigured =
  typeof marketingConfig.rdStationWebhookUrl === "string" &&
  /^https?:\/\//i.test(marketingConfig.rdStationWebhookUrl);

const isHubspotWebhookConfigured =
  typeof marketingConfig.hubspotWebhookUrl === "string" &&
  /^https?:\/\//i.test(marketingConfig.hubspotWebhookUrl);

const isHubspotFormConfigured =
  typeof marketingConfig.hubspotPortalId === "string" &&
  marketingConfig.hubspotPortalId.trim() !== "" &&
  typeof marketingConfig.hubspotFormGuid === "string" &&
  marketingConfig.hubspotFormGuid.trim() !== "";

function loadScript(src) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function initGA4() {
  if (!isGAConfigured) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  loadScript(
    `https://www.googletagmanager.com/gtag/js?id=${marketingConfig.gaMeasurementId}`,
  );
  window.gtag("js", new Date());
  window.gtag("config", marketingConfig.gaMeasurementId, {
    anonymize_ip: true,
  });
}

function initMetaPixel() {
  if (!isMetaConfigured || window.fbq) return;

  window.fbq = function fbq() {
    if (window.fbq.callMethod) {
      window.fbq.callMethod.apply(window.fbq, arguments);
      return;
    }
    window.fbq.queue.push(arguments);
  };
  window.fbq.push = window.fbq;
  window.fbq.loaded = true;
  window.fbq.version = "2.0";
  window.fbq.queue = [];

  loadScript("https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", marketingConfig.metaPixelId);
  window.fbq("track", "PageView");
}

function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }

  if (typeof window.fbq === "function") {
    if (eventName === "generate_lead") {
      window.fbq("track", "Lead", params);
    } else if (eventName === "cta_click") {
      window.fbq("trackCustom", "CtaClick", params);
    } else {
      window.fbq("trackCustom", eventName, params);
    }
  }
}

async function sendLeadWebhook(payload) {
  if (!isWebhookConfigured) return;

  try {
    await fetch(marketingConfig.leadWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    console.error("Falha no webhook de lead", error);
  }
}

function splitName(fullName) {
  const name = String(fullName || "").trim();
  if (!name) return { firstName: "", lastName: "" };

  const parts = name.split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function buildRDStationPayload(lead) {
  return {
    event_type: "CONVERSION",
    event_family: "CDP",
    payload: {
      conversion_identifier:
        marketingConfig.rdConversionIdentifier || "LP Pet Shop - Lead",
      name: lead.nome,
      email: lead.email,
      personal_phone: lead.telefone,
      mobile_phone: lead.telefone,
      cf_interesse: lead.interesse,
      tags: ["landing-page", "pet-shop", "lead"],
    },
  };
}

function buildHubspotPayload(lead) {
  const { firstName, lastName } = splitName(lead.nome);

  return {
    submittedAt: Date.now(),
    fields: [
      { name: "firstname", value: firstName },
      { name: "lastname", value: lastName || firstName },
      { name: "email", value: lead.email },
      { name: "phone", value: lead.telefone },
      { name: "interesse", value: lead.interesse },
      { name: "lead_source", value: lead.source },
    ],
    context: {
      pageUri: window.location.href,
      pageName: document.title,
    },
  };
}

async function postJson(url, payload) {
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    console.error("Falha no envio para endpoint de marketing", error);
  }
}

async function sendRDStationLead(lead) {
  if (!isRDWebhookConfigured) return;
  await postJson(
    marketingConfig.rdStationWebhookUrl,
    buildRDStationPayload(lead),
  );
}

async function sendHubspotLead(lead) {
  const payload = buildHubspotPayload(lead);

  if (isHubspotFormConfigured) {
    const formEndpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(marketingConfig.hubspotPortalId)}/${encodeURIComponent(marketingConfig.hubspotFormGuid)}`;
    await postJson(formEndpoint, payload);
    return;
  }

  if (isHubspotWebhookConfigured) {
    await postJson(marketingConfig.hubspotWebhookUrl, payload);
  }
}

initGA4();
initMetaPixel();

function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  } catch (error) {
    console.error("Não foi possível acessar o localStorage", error);
  }
  return null;
}

function getPreferredTheme() {
  const savedTheme = getSavedTheme();
  if (savedTheme) return savedTheme;

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function updateThemeToggleLabel(theme) {
  if (!themeToggleButton) return;

  const isDarkMode = theme === "dark";
  themeToggleButton.textContent = isDarkMode
    ? "☀️ Modo claro"
    : "🌙 Modo escuro";
  themeToggleButton.setAttribute("aria-pressed", String(isDarkMode));
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeToggleLabel(theme);
}

function setupHeroABTest() {
  if (!heroTitle || !heroSubtitle || !heroPrimaryCta) return;

  const variants = {
    A: {
      title: "Mais saúde, conforto e alegria para o seu melhor amigo",
      subtitle:
        "Banho e tosa com carinho, consulta veterinária e os melhores produtos em um só lugar. Cadastre-se e receba um cupom de boas-vindas.",
      cta: "Ganhar cupom agora",
    },
    B: {
      title:
        "Agende hoje e deixe seu pet limpo, cheiroso e feliz em poucas horas",
      subtitle:
        "Atendimento rápido em Belo Horizonte com equipe especializada para cães e gatos. Receba atendimento prioritário no WhatsApp.",
      cta: "Agendar com prioridade",
    },
  };

  let variant = "A";
  try {
    const saved = localStorage.getItem(HERO_VARIANT_STORAGE_KEY);
    if (saved === "A" || saved === "B") {
      variant = saved;
    } else {
      variant = Math.random() < 0.5 ? "A" : "B";
      localStorage.setItem(HERO_VARIANT_STORAGE_KEY, variant);
    }
  } catch (error) {
    variant = Math.random() < 0.5 ? "A" : "B";
  }

  heroTitle.textContent = variants[variant].title;
  heroSubtitle.textContent = variants[variant].subtitle;
  heroPrimaryCta.textContent = variants[variant].cta;

  trackEvent("hero_ab_variant", {
    lead_source: "landing_page",
    variant,
  });
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error("Não foi possível salvar tema no localStorage", error);
  }
}

const initialTheme = getPreferredTheme();
applyTheme(initialTheme);

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  });
}

if (year) {
  year.textContent = new Date().getFullYear();
}

document.querySelectorAll('a[href="#contato"]').forEach((ctaElement) => {
  ctaElement.addEventListener("click", () => {
    trackEvent("cta_click", {
      section: "landing_page",
      label: (ctaElement.textContent || "cta").trim().toLowerCase(),
    });
  });
});

function setMessage(type, text) {
  formMessage.className = `form-message ${type}`;
  formMessage.textContent = text;
}

function updateCountdown() {
  if (!countdownElement) return;

  const deadlineValue = countdownElement.getAttribute("data-deadline");
  const deadline = deadlineValue ? new Date(deadlineValue) : null;
  if (!deadline || Number.isNaN(deadline.getTime())) return;

  const diffMs = Math.max(deadline.getTime() - Date.now(), 0);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const elDays = document.getElementById("cdDays");
  const elHours = document.getElementById("cdHours");
  const elMinutes = document.getElementById("cdMinutes");
  const elSeconds = document.getElementById("cdSeconds");

  if (elDays) elDays.textContent = String(days).padStart(2, "0");
  if (elHours) elHours.textContent = String(hours).padStart(2, "0");
  if (elMinutes) elMinutes.textContent = String(minutes).padStart(2, "0");
  if (elSeconds) elSeconds.textContent = String(seconds).padStart(2, "0");
}

function setupFunnelTracking() {
  document.addEventListener(
    "scroll",
    () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      const maxScrollable = Math.max(fullHeight - viewportHeight, 1);
      const percent = Math.round((scrollTop / maxScrollable) * 100);

      [50, 90].forEach((milestone) => {
        if (percent >= milestone && !trackedScrollMilestones.has(milestone)) {
          trackedScrollMilestones.add(milestone);
          trackEvent("scroll_depth", {
            lead_source: "landing_page",
            percent: milestone,
          });
        }
      });
    },
    { passive: true },
  );

  setTimeout(() => {
    if (!pageTimeTracked) {
      pageTimeTracked = true;
      trackEvent("time_on_page", {
        lead_source: "landing_page",
        seconds: 30,
      });
    }
  }, 30000);
}

function setupFaqTracking() {
  document.querySelectorAll(".faq-list details").forEach((detailElement) => {
    detailElement.addEventListener("toggle", () => {
      if (!detailElement.open) return;
      const summary = detailElement.querySelector("summary");
      trackEvent("faq_open", {
        lead_source: "landing_page",
        question: (summary?.textContent || "faq").trim(),
      });
    });
  });
}

function setupWhatsappTracking() {
  if (!whatsappFloatButton) return;

  whatsappFloatButton.addEventListener("click", () => {
    trackEvent("whatsapp_click", {
      lead_source: "landing_page",
      placement: "floating_button",
    });
  });
}

function setupMapTracking() {
  if (!mapButton) return;

  mapButton.addEventListener("click", () => {
    trackEvent("map_open", {
      lead_source: "landing_page",
    });
  });
}

function setupServiceSchedulingTracking() {
  scheduleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      trackEvent("service_schedule_click", {
        lead_source: "landing_page",
        service: button.getAttribute("data-service") || "service",
      });
    });
  });
}

function isEmailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhoneValid(value) {
  const onlyDigits = value.replace(/\D/g, "");
  return onlyDigits.length >= 10 && onlyDigits.length <= 11;
}

function formatPhone(value) {
  const onlyDigits = value.replace(/\D/g, "").slice(0, 11);
  if (onlyDigits.length <= 2) return onlyDigits;
  if (onlyDigits.length <= 6)
    return `(${onlyDigits.slice(0, 2)}) ${onlyDigits.slice(2)}`;
  if (onlyDigits.length <= 10) {
    return `(${onlyDigits.slice(0, 2)}) ${onlyDigits.slice(2, 6)}-${onlyDigits.slice(6)}`;
  }
  return `(${onlyDigits.slice(0, 2)}) ${onlyDigits.slice(2, 7)}-${onlyDigits.slice(7)}`;
}

if (phoneInput) {
  phoneInput.addEventListener("input", (event) => {
    event.target.value = formatPhone(event.target.value);
  });
}

updateCountdown();
setInterval(updateCountdown, 1000);
setupFunnelTracking();
setupFaqTracking();
setupWhatsappTracking();
setupMapTracking();
setupServiceSchedulingTracking();
setupHeroABTest();

async function sendFollowUpAutomation(lead) {
  if (!isFollowUpWebhookConfigured) return;

  const payload = {
    event: "lead_followup_start",
    source: "landing_page_pet_shop",
    lead,
    steps: [
      { offsetMinutes: 5, channel: "whatsapp", messageType: "welcome_offer" },
      {
        offsetMinutes: 1440,
        channel: "whatsapp",
        messageType: "testimonial_reminder",
      },
      {
        offsetMinutes: 4320,
        channel: "whatsapp",
        messageType: "last_call_coupon",
      },
    ],
  };

  await postJson(marketingConfig.followUpWebhookUrl, payload);
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("", "");
    if (leadMagnetLink) {
      leadMagnetLink.hidden = true;
    }

    const formData = new FormData(form);
    const nome = String(formData.get("nome") || "").trim();
    const telefone = String(formData.get("telefone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const interesse = String(formData.get("interesse") || "").trim();

    if (!nome || !telefone || !email || !interesse) {
      setMessage("error", "Preencha todos os campos para continuar.");
      return;
    }

    if (!isEmailValid(email)) {
      setMessage("error", "Informe um e-mail válido.");
      return;
    }

    if (!isPhoneValid(telefone)) {
      setMessage("error", "Informe um telefone/WhatsApp válido com DDD.");
      return;
    }

    if (!consentInput?.checked) {
      setMessage(
        "error",
        "Para continuar, aceite a Política de Privacidade e o consentimento de contato.",
      );
      return;
    }

    const endpoint = form.getAttribute("action") || "";
    if (!endpoint || endpoint.includes("SEU_EMAIL_AQUI")) {
      setMessage(
        "error",
        "Configuração pendente: substitua SEU_EMAIL_AQUI no formulário pelo e-mail de destino.",
      );
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Falha no envio");
      }

      trackEvent("generate_lead", {
        lead_source: "landing_page",
        interesse,
      });

      const leadPayload = {
        source: "landing_page_pet_shop",
        nome,
        telefone,
        email,
        interesse,
        submittedAt: new Date().toISOString(),
      };

      sendLeadWebhook(leadPayload);
      sendRDStationLead(leadPayload);
      sendHubspotLead(leadPayload);
      sendFollowUpAutomation(leadPayload);

      setMessage(
        "success",
        "Cadastro enviado com sucesso! Baixe seu checklist gratuito abaixo e aguarde nossas ofertas.",
      );
      if (leadMagnetLink) {
        leadMagnetLink.hidden = false;
      }
      form.reset();
    } catch (error) {
      trackEvent("lead_submit_error", {
        lead_source: "landing_page",
      });
      setMessage(
        "error",
        "Não foi possível enviar agora. Tente novamente em instantes.",
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Quero receber ofertas";
    }
  });
}
