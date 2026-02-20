document.addEventListener("DOMContentLoaded", () => {
  // --- MARQUEE OPTIMIZATION LOGIC ---

  // 1. Multiply unique items inside text marquees
  const textContents = document.querySelectorAll(
    ".hero-marquee-content, .text-marquee-content",
  );
  textContents.forEach((content) => {
    const originalItems = Array.from(content.children);
    // Duplicate unique items 5 times to ensure it spans the full screen width smoothly
    for (let i = 0; i < 5; i++) {
      originalItems.forEach((item) => {
        content.appendChild(item.cloneNode(true));
      });
    }
  });

  // 2. Clone the entire content block for seamless CSS scrolling
  const tracks = document.querySelectorAll(
    ".hero-marquee-track, .text-marquee-track",
  );
  tracks.forEach((track) => {
    const content = track.children[0];
    if (content) {
      const clone = content.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    }
  });

  // 3. Multiply unique items in Brand Showcase
  const brandTracks = document.querySelectorAll(".marquee-track");
  brandTracks.forEach((track) => {
    const originalItems = Array.from(track.children);
    // Duplicate unique brands 3 times so it's wide enough for large screens + infinite scroll
    for (let i = 0; i < 3; i++) {
      originalItems.forEach((item) => {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
    }
  });

  // --- TESTIMONIALS CAROUSEL LOGIC ---
  const testimonialTrack = document.getElementById("testimonial-track");
  const prevBtn = document.querySelector(".carousel-btn.prev");
  const nextBtn = document.querySelector(".carousel-btn.next");

  if (testimonialTrack && prevBtn && nextBtn) {
    const scrollAmount = () => {
      // Find the width of one card plus its gap
      const card = testimonialTrack.querySelector(".testimonial-card");
      const gap = parseInt(window.getComputedStyle(testimonialTrack).gap) || 0;
      return card.offsetWidth + gap;
    };

    nextBtn.addEventListener("click", () => {
      testimonialTrack.scrollBy({ left: scrollAmount(), behavior: "smooth" });
    });

    prevBtn.addEventListener("click", () => {
      testimonialTrack.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
    });
  }
});
