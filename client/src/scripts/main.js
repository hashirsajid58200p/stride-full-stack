// main.js - dynamically load header and footer with CSS & JS

/**
 * Dynamically load a CSS file
 * @param {string} path - Path to the CSS file
 */
function loadCSS(path) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = path;
  document.head.appendChild(link);
}

/**
 * Dynamically load a JS file
 * @param {string} path - Path to the JS file
 */
function loadJS(path) {
  const script = document.createElement("script");
  script.src = path;
  script.defer = true; // ensures script runs after HTML parsing
  document.body.appendChild(script);
}

/**
 * Load an HTML component into a placeholder
 * @param {string} url - The URL of the HTML component
 * @param {string} placeholderId - The ID of the div where the component will be injected
 * @param {string} cssPath - Optional CSS path for this component
 * @param {string} jsPath - Optional JS path for this component
 */
function loadComponent(url, placeholderId, cssPath = null, jsPath = null) {
  // Load CSS if provided
  if (cssPath) loadCSS(cssPath);

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.text();
    })
    .then((html) => {
      const placeholder = document.getElementById(placeholderId);
      if (!placeholder)
        throw new Error(`Placeholder #${placeholderId} not found`);
      placeholder.innerHTML = html;

      // Load JS if provided
      if (jsPath) loadJS(jsPath);

      // Optional: run init functions if defined inside component JS
      if (
        placeholderId === "header-placeholder" &&
        typeof initHeader === "function"
      ) {
        initHeader();
      }
      if (
        placeholderId === "footer-placeholder" &&
        typeof initFooter === "function"
      ) {
        initFooter();
      }
    })
    .catch((err) => console.error(err));
}

// Automatically load header and footer after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  loadComponent(
    "../components/header/header.html",
    "header-placeholder",
    "../components/header/header.css",
    "../components/header/header.js",
  );

  loadComponent(
    "../components/footer/footer.html",
    "footer-placeholder",
    "../components/footer/footer.css",
    "../components/footer/footer.js",
  );
});
