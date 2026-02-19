document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("testimonial-track");
  const prevBtn = document.querySelector(".carousel-btn.prev");
  const nextBtn = document.querySelector(".carousel-btn.next");

  if (track && prevBtn && nextBtn) {
    const scrollAmount = () => {
      // Find the width of one card plus its gap
      const card = track.querySelector(".testimonial-card");
      const gap = parseInt(window.getComputedStyle(track).gap) || 0;
      return card.offsetWidth + gap;
    };

    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: scrollAmount(), behavior: "smooth" });
    });

    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
    });
  }
});
