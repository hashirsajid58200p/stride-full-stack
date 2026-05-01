// client/src/scripts/pages/about.js

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // COMPONENT LOADER: Fetch Newsletter
  // ==========================================
  async function loadNewsletterComponent() {
    const placeholder = document.getElementById("newsletter-placeholder");
    if (!placeholder) return;

    try {
      const response = await fetch("../components/newsletter.html");
      const html = await response.text();
      placeholder.innerHTML = html;

      // Read the data attribute and apply the custom background image
      const bgImage = placeholder.getAttribute("data-bg");
      if (bgImage) {
        const newsletterSection = placeholder.querySelector(".newsletter");
        if (newsletterSection) {
          newsletterSection.style.backgroundImage = `url('${bgImage}')`;
        }
      }

      // Execute any scripts contained within the newsletter HTML
      const scripts = placeholder.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      });
    } catch (err) {
      console.error("Failed to load newsletter component:", err);
    }
  }

  // Execute the loader
  loadNewsletterComponent();
});
