document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // TEXT MARQUEE OPTIMIZATION (CSS Based)
  // ==========================================

  const textContents = document.querySelectorAll(
    ".hero-marquee-content, .text-marquee-content",
  );

  textContents.forEach((content) => {
    const originalItems = Array.from(content.children);
    for (let i = 0; i < 6; i++) {
      originalItems.forEach((item) => {
        content.appendChild(item.cloneNode(true));
      });
    }
  });

  const textTracks = document.querySelectorAll(
    ".hero-marquee-track, .text-marquee-track",
  );

  textTracks.forEach((track) => {
    const content = track.children[0];
    if (content) {
      const clone = content.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    }
  });

  // ==========================================
  // BRAND SHOWCASE: FLAWLESS JS CIRCULAR SCROLL
  // ==========================================
  const brandRows = document.querySelectorAll(".marquee-row");

  brandRows.forEach((row) => {
    const track = row.querySelector(".marquee-track");
    const content = track.querySelector(".marquee-content");

    // Multiply items heavily so it fills even ultrawide screens multiple times over
    const originalItems = Array.from(content.children);
    for (let i = 0; i < 8; i++) {
      originalItems.forEach((item) => {
        content.appendChild(item.cloneNode(true));
      });
    }

    // Clone once to perfectly set up the mathematical loop point
    const clone = content.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);

    let isHovered = false;

    // Timeout ensures DOM has painted and scrollWidth is accurate before doing math
    setTimeout(() => {
      const halfWidth = track.scrollWidth / 2;

      // Calculate speed dynamically: equivalent to completing a 50% shift every 45 seconds at ~60 FPS
      const speedAmt = halfWidth / (200 * 60);
      const speed = row.classList.contains("reverse") ? -speedAmt : speedAmt;

      let currentScroll = row.scrollLeft;

      // Start reversed rows in the middle so they don't hit 0 immediately and snap visibly
      if (speed < 0) {
        currentScroll = halfWidth;
        row.scrollLeft = currentScroll;
      }

      row.addEventListener("mouseenter", () => (isHovered = true));
      row.addEventListener("mouseleave", () => (isHovered = false));

      // If user swipes natively, capture their scroll position to keep the math synced
      row.addEventListener("scroll", () => {
        if (isHovered) {
          currentScroll = row.scrollLeft;
        }
      });

      function autoScroll() {
        if (!isHovered) {
          currentScroll += speed;

          // The flawless infinite loop math
          if (speed > 0 && currentScroll >= halfWidth) {
            currentScroll -= halfWidth;
          } else if (speed < 0 && currentScroll <= 0) {
            currentScroll += halfWidth;
          }

          row.scrollLeft = currentScroll;
        }
        requestAnimationFrame(autoScroll);
      }

      requestAnimationFrame(autoScroll);
    }, 200);
  });

  // ==========================================
  // TESTIMONIALS CAROUSEL LOGIC
  // ==========================================
  const testimonialTrack = document.getElementById("testimonial-track");
  const prevBtn = document.querySelector(".carousel-btn.prev");
  const nextBtn = document.querySelector(".carousel-btn.next");

  if (testimonialTrack && prevBtn && nextBtn) {
    const scrollAmount = () => {
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
