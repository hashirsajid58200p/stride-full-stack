// Apply theme immediately to prevent flashing of unstyled content
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

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
 * Dynamically load a JS file and return a Promise
 * @param {string} path - Path to the JS file
 */
function loadJS(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = path;
    script.defer = true;
    script.onload = resolve; // Wait for the script to finish loading
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * Load an HTML component into a placeholder
 * @param {string} url - The URL of the HTML component
 * @param {string} placeholderId - The ID of the div where the component will be injected
 * @param {string} cssPath - Optional CSS path for this component
 * @param {string} jsPath - Optional JS path for this component
 */
function loadComponent(url, placeholderId, cssPath = null, jsPath = null) {
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

      // Load JS and wait for it to finish before initializing
      if (jsPath) {
        loadJS(jsPath)
          .then(() => {
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
          .catch((err) =>
            console.error(`Error loading script ${jsPath}:`, err),
          );
      }
    })
    .catch((err) => console.error(`Error loading component ${url}:`, err));
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
