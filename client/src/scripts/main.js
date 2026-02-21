// Apply theme immediately to prevent flashing of unstyled content
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

function loadCSS(path) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = path;
  document.head.appendChild(link);
}

function loadJS(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = path;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function loadComponent(url, placeholderId, cssPath = null, jsPath = null) {
  if (cssPath) loadCSS(cssPath);

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.text();
    })
    .then((html) => {
      const placeholder = document.getElementById(placeholderId);
      // Silent return to prevent console errors if placeholder is legitimately missing (like on dashboards)
      if (!placeholder) return;

      placeholder.innerHTML = html;

      if (jsPath) {
        loadJS(jsPath)
          .then(() => {
            if (
              placeholderId === "header-placeholder" &&
              typeof initHeader === "function"
            )
              initHeader();
            if (
              placeholderId === "footer-placeholder" &&
              typeof initFooter === "function"
            )
              initFooter();
            if (
              placeholderId === "cart-placeholder" &&
              typeof initCart === "function"
            )
              initCart();
          })
          .catch((err) =>
            console.error(`Error loading script ${jsPath}:`, err),
          );
      }
    })
    .catch((err) => console.error(`Error loading component ${url}:`, err));
}

document.addEventListener("DOMContentLoaded", () => {
  // AUTOMATICALLY INJECT CART PLACEHOLDER SO YOU DON'T HAVE TO DO IT IN HTML
  if (!document.getElementById("cart-placeholder")) {
    const cartPlaceholder = document.createElement("div");
    cartPlaceholder.id = "cart-placeholder";
    document.body.appendChild(cartPlaceholder);
  }

  // Check if placeholder exists before loading to prevent console errors
  if (document.getElementById("header-placeholder")) {
    loadComponent(
      "../components/header/header.html",
      "header-placeholder",
      "../components/header/header.css",
      "../components/header/header.js",
    );
  }

  if (document.getElementById("cart-placeholder")) {
    loadComponent(
      "../components/cart/cart.html",
      "cart-placeholder",
      "../components/cart/cart.css",
      "../components/cart/cart.js",
    );
  }

  if (document.getElementById("footer-placeholder")) {
    loadComponent(
      "../components/footer/footer.html",
      "footer-placeholder",
      "../components/footer/footer.css",
      "../components/footer/footer.js",
    );
  }
});
