document.addEventListener("DOMContentLoaded", () => {
  // --- ACCORDION FUNCTIONALITY ---
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const header = item.querySelector(".faq-question-header");
    const answer = item.querySelector(".faq-answer");
    const icon = item.querySelector(".faq-toggle-icon");

    header.addEventListener("click", () => {
      const isActive = item.classList.contains("active");

      // Close all other items
      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove("active");
          otherItem.querySelector(".faq-answer").style.maxHeight = "0px";
          const otherIcon = otherItem.querySelector(".faq-toggle-icon");
          otherIcon.classList.remove("bi-dash-lg");
          otherIcon.classList.add("bi-plus-lg");
        }
      });

      // Toggle the clicked item
      if (isActive) {
        // Close it
        item.classList.remove("active");
        answer.style.maxHeight = "0px";
        icon.classList.remove("bi-dash-lg");
        icon.classList.add("bi-plus-lg");
      } else {
        // Open it
        item.classList.add("active");
        answer.style.maxHeight = answer.scrollHeight + "px";
        icon.classList.remove("bi-plus-lg");
        icon.classList.add("bi-dash-lg");
      }
    });
  });

  // --- SMOOTH SCROLLING FOR "JUMP TO SECTION" ---
  document.querySelectorAll(".jump-link").forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      // Remove active class from all links
      document
        .querySelectorAll(".jump-link")
        .forEach((link) => link.classList.remove("active"));
      // Add active class to clicked link
      this.classList.add("active");

      const targetId = this.getAttribute("href");
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        // Smooth scroll to the target card
        targetElement.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });
});
