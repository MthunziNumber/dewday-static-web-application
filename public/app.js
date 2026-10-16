const form = document.querySelector("#contact-form");
const status = document.querySelector("#form-status");
const year = document.querySelector("#year");
const themeToggle = document.querySelector(".toggle-mode");
const sections = document.querySelectorAll(".content-section");
const navigationLinks = document.querySelectorAll("nav a[href^='#']");

if (year) year.textContent = String(new Date().getFullYear());

function showSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section?.classList.contains("content-section")) return;

  sections.forEach((item) => item.classList.toggle("active", item === section));
  document.body.classList.toggle("entertainment-mode", sectionId === "entertainment");
  navigationLinks.forEach((link) => {
    if (link.hash === `#${sectionId}`) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function syncSectionWithHash() {
  const sectionId = window.location.hash.slice(1);
  if (sectionId) showSection(sectionId);
}

window.addEventListener("hashchange", syncSectionWithHash);
syncSectionWithHash();

if (themeToggle) {
  const savedTheme = window.localStorage.getItem("dewday-theme");
  const initialTheme = savedTheme === "dark" ? "dark" : "light";
  document.body.classList.toggle("dark-mode", initialTheme === "dark");
  document.body.classList.toggle("light-mode", initialTheme === "light");
  themeToggle.setAttribute("aria-pressed", String(initialTheme === "dark"));
  themeToggle.setAttribute(
    "aria-label",
    initialTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );

  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode", !isDark);
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    window.localStorage.setItem("dewday-theme", isDark ? "dark" : "light");
  });
}

if (form && status) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      number: String(formData.get("number") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    const email = payload.email.toLowerCase();
    const isValid =
      payload.name.length >= 2 &&
      email.length <= 254 &&
      /^(?:[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(email) &&
      payload.number.length >= 3 &&
      payload.number.length <= 30 &&
      /^[+()\d\s.-]+$/.test(payload.number) &&
      payload.message.length >= 10 &&
      payload.message.length <= 2000;

    if (!isValid) {
      status.textContent = "Please enter a valid name, email, contact number, and message.";
      status.classList.add("error");
      return;
    }

    status.textContent = "Sending your message…";
    status.classList.remove("error");
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to send message.");
      }

      form.reset();
      status.textContent = "Message sent. We’ll be in touch soon.";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Unable to send message. Please try again.";
      status.classList.add("error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
