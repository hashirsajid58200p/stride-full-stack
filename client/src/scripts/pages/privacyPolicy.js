document.addEventListener("DOMContentLoaded", () => {
  // Smooth scroll for Table of Contents anchors
  const tocLinks = document.querySelectorAll('.toc-list a[href^="#"]');

  tocLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        // The scroll-margin-top in CSS handles the offset for the fixed navbar
        targetElement.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });
});
