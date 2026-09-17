// --- LENIS LIQUID SMOOTH SCROLL ---
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// --- GSAP SCROLLTRIGGER SYNC & SMOOTH REVEALS ---
gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// --- TYPING TEXT LOOP ---
let typeText = ["GAMING MARATHONS", "TECH REVIEWS", "LIVE STREAMS", "DAILY VLOGS"];
let typeContent = document.querySelector(".typing-text");
let wordIndex = 0;
let charIndex = 0;
let removeChar = false;

function typing() {
  if (!typeContent) return;
  let currentIndex = typeText[wordIndex] || "CREATOR";
  let currentChar = currentIndex.substring(0, charIndex);

  typeContent.innerHTML = currentChar;

  if (!removeChar && charIndex < currentIndex.length) {
    charIndex++;
    setTimeout(typing, 90);
  } else if (removeChar && charIndex > 0) {
    charIndex--;
    setTimeout(typing, 90);
  } else {
    removeChar = !removeChar;
    wordIndex = !removeChar ? (wordIndex + 1) % typeText.length : wordIndex;
    setTimeout(typing, 1200);
  }
}

// --- GSAP SMOOTH SCROLL REVEAL ANIMATIONS (RICH SCROLL FX) ---
function initSmoothGsapAnimations() {
  // Ambient Glow Orbs Parallax Motion
  if (document.querySelector(".ambient-1")) {
    gsap.to(".ambient-1", {
      y: 220,
      scrollTrigger: { trigger: ".hero-section", start: "top top", end: "bottom bottom", scrub: 1.5 }
    });
  }
  if (document.querySelector(".ambient-2")) {
    gsap.to(".ambient-2", {
      y: -180,
      x: 80,
      scrollTrigger: { trigger: ".hero-section", start: "top top", end: "bottom bottom", scrub: 2 }
    });
  }

  // Navbar Scroll Shrink & Glass Effect
  ScrollTrigger.create({
    start: "top -40",
    onUpdate: (self) => {
      const nav = document.querySelector(".navbar");
      if (nav) {
        if (self.direction === 1 || window.scrollY > 60) {
          nav.classList.add("nav-scrolled");
        } else {
          nav.classList.remove("nav-scrolled");
        }
      }
    }
  });

  // Hero Entrance Timeline
  const heroTl = gsap.timeline();

  heroTl.from(".navbar", {
    y: -80,
    opacity: 0,
    duration: 1,
    ease: "power4.out"
  })
  .from(".hero-badge-pill", {
    scale: 0.5,
    opacity: 0,
    duration: 0.6,
    ease: "back.out(1.7)"
  }, "-=0.6")
  .from(".hero-title-main", {
    y: 50,
    opacity: 0,
    duration: 0.9,
    ease: "power3.out"
  }, "-=0.4")
  .from(".hero-subtitle", {
    y: 35,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out"
  }, "-=0.6")
  .from(".hero-btn-group > *", {
    y: 30,
    opacity: 0,
    scale: 0.9,
    duration: 0.7,
    stagger: 0.12,
    ease: "back.out(1.5)"
  }, "-=0.5")
  .from(".hero-spotlight-card", {
    scale: 0.82,
    rotationY: -12,
    opacity: 0,
    duration: 1.1,
    ease: "power4.out"
  }, "-=0.8");

  // Section Headers 3D Slide & Scale Reveal
  gsap.utils.toArray(".section-header").forEach(header => {
    gsap.from(header, {
      y: 50,
      scale: 0.95,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: {
        trigger: header,
        start: "top 82%",
        toggleActions: "play none none reverse"
      }
    });
  });

  // Stream Showcase 3D Flip & Parallax Entrance
  gsap.from(".stream-card-box", {
    y: 70,
    rotationX: 8,
    scale: 0.93,
    opacity: 0,
    duration: 1.1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".stream-section",
      start: "top 75%",
      toggleActions: "play none none reverse"
    }
  });

  // Subscriber Counter Card Elastic Bounce
  gsap.from(".sub-card-container", {
    scale: 0.85,
    y: 50,
    opacity: 0,
    duration: 1.1,
    ease: "back.out(1.5)",
    scrollTrigger: {
      trigger: ".subscriber-section",
      start: "top 75%",
      toggleActions: "play none none reverse",
      onEnter: () => {
        if (window.currentSubCount) {
          window.animateCountUp('subscriber-counter-val', window.currentSubCount, 2500);
        }
      }
    }
  });

  // About Section Dual Directional Slide Reveal
  gsap.from(".about-image-card", {
    x: -70,
    rotation: -3,
    opacity: 0,
    duration: 1.1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".about-section",
      start: "top 75%",
      toggleActions: "play none none reverse"
    }
  });

  gsap.from(".about-text-content", {
    x: 70,
    opacity: 0,
    duration: 1.1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".about-section",
      start: "top 75%",
      toggleActions: "play none none reverse"
    }
  });

  gsap.from(".stat-box", {
    scale: 0.75,
    opacity: 0,
    duration: 0.7,
    stagger: 0.15,
    ease: "back.out(1.7)",
    scrollTrigger: {
      trigger: ".stats-counter-grid",
      start: "top 82%"
    }
  });

  // Support / UPI Card Elastic Scale
  gsap.from(".support-wrapper", {
    scale: 0.88,
    y: 50,
    opacity: 0,
    duration: 1.2,
    ease: "elastic.out(1, 0.75)",
    scrollTrigger: {
      trigger: ".support-section",
      start: "top 75%",
      toggleActions: "play none none reverse"
    }
  });

  // Footer Social Links Bounce Entrance
  gsap.from(".footer-socials a, .footer-bottom p", {
    y: 35,
    opacity: 0,
    scale: 0.8,
    duration: 0.8,
    stagger: 0.08,
    ease: "back.out(2)",
    scrollTrigger: {
      trigger: ".main-footer",
      start: "top 85%"
    }
  });
}

// --- DYNAMIC CONTENT LOADER & API RENDERER ---
async function loadPublicContent() {
  let localData = null;
  try {
    const raw = localStorage.getItem('youtuber_site_data');
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  if (localData) {
    if (localData.settings) renderSettings(localData.settings);
    if (localData.streams) renderLiveStream(localData.streams);
    if (localData.subscribers) renderSubscribers(localData.subscribers);
    if (localData.videos) renderVideos(localData.videos);
    if (localData.support) renderSupport(localData.support);
    if (localData.socials) renderSocials(localData.socials);
  }

  try {
    const res = await fetch('/api/public/data');
    const json = await res.json();

    if (json.success && json.data) {
      const data = { ...(localData || {}), ...json.data };
      renderSettings(data.settings);
      renderLiveStream(data.streams);
      renderSubscribers(data.subscribers);
      renderVideos(data.videos);
      renderSupport(data.support);
      renderSocials(data.socials);
    }
  } catch (err) {
    console.warn('Failed to load API public website data, using local:', err);
  }
}

function renderSettings(settings) {
  if (!settings) return;
  if (settings.website_title) document.title = settings.website_title;

  if (settings.creator_name) {
    const nameEls = document.querySelectorAll('#header-creator-name, #spotlight-creator-name, #about-heading, #footer-brand-name');
    nameEls.forEach(el => {
      if (el.id === 'about-heading') el.innerText = `ABOUT ${settings.creator_name.toUpperCase()}`;
      else el.innerText = settings.creator_name.toUpperCase();
    });
  }

  if (settings.profile_image) {
    const profileImgs = document.querySelectorAll('#header-profile-img, #hero-avatar-img, #about-profile-img');
    profileImgs.forEach(img => img.src = settings.profile_image);
  }

  if (settings.hero_welcome_text) {
    const descEl = document.getElementById('hero-welcome-desc');
    if (descEl) descEl.innerText = settings.hero_welcome_text;
  }

  if (settings.hero_typing_texts && Array.isArray(settings.hero_typing_texts) && settings.hero_typing_texts.length > 0) {
    typeText = settings.hero_typing_texts;
  }

  if (settings.about_text) {
    const bioEl = document.getElementById('about-bio');
    if (bioEl) bioEl.innerText = settings.about_text;
  }
}

function renderLiveStream(streams) {
  if (!streams || streams.length === 0) return;
  const activeStream = streams.find(s => s.status === 'LIVE NOW') || streams[0];

  if (!activeStream) return;

  const thumbImg = document.getElementById('stream-thumb');
  const titleEl = document.getElementById('stream-title');
  const descEl = document.getElementById('stream-desc');
  const statusBadge = document.getElementById('stream-status-badge');
  const watchBtn = document.getElementById('stream-watch-btn');
  const heroStatusTag = document.getElementById('hero-status-tag');

  if (thumbImg && activeStream.thumbnail_url) thumbImg.src = activeStream.thumbnail_url;
  if (titleEl) titleEl.innerText = activeStream.title;
  if (descEl) descEl.innerText = activeStream.description || '';
  if (watchBtn && activeStream.youtube_url) watchBtn.href = activeStream.youtube_url;

  if (statusBadge) {
    statusBadge.innerText = activeStream.status;
    statusBadge.className = `stream-status-chip ${activeStream.status === 'LIVE NOW' ? 'live' : 'upcoming'}`;
  }

  if (heroStatusTag) {
    heroStatusTag.innerText = activeStream.status;
    heroStatusTag.style.background = activeStream.status === 'LIVE NOW' ? 'rgba(239, 68, 68, 0.95)' : 'var(--gold-gradient)';
    heroStatusTag.style.color = activeStream.status === 'LIVE NOW' ? '#fff' : '#000';
  }

  startCountdownTimer(activeStream.scheduled_date, activeStream.scheduled_time);
}

function startCountdownTimer(dateStr, timeStr) {
  if (!dateStr) return;
  const targetDate = new Date(`${dateStr}T${timeStr || '00:00'}:00`).getTime();

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      document.getElementById('cd-hours').innerText = '00';
      document.getElementById('cd-mins').innerText = '00';
      document.getElementById('cd-secs').innerText = '00';
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const hEl = document.getElementById('cd-hours');
    const mEl = document.getElementById('cd-mins');
    const sEl = document.getElementById('cd-secs');

    if (hEl) hEl.innerText = hours < 10 ? '0' + hours : hours;
    if (mEl) mEl.innerText = mins < 10 ? '0' + mins : mins;
    if (sEl) sEl.innerText = secs < 10 ? '0' + secs : secs;
  }

  update();
  setInterval(update, 1000);
}

function renderSubscribers(subData) {
  if (!subData) return;
  window.currentSubCount = subData.count || 1245890;

  const counterValEl = document.getElementById('subscriber-counter-val');
  if (counterValEl && subData.counter_font) {
    counterValEl.style.fontFamily = subData.counter_font;
  }

  const infoBadge = document.getElementById('sub-status-info');
  if (infoBadge) {
    if (subData.is_api_enabled) {
      infoBadge.innerHTML = `<i class="fa-brands fa-youtube" style="color: #ef4444;"></i> Live YouTube API Sync`;
    } else {
      infoBadge.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Official YouTube Count`;
    }
  }
}

function renderVideos(videos) {
  const container = document.getElementById('videos-container');
  if (!container || !videos || videos.length === 0) return;

  // Sort trending videos to top
  const sortedVideos = [...videos].sort((a, b) => (b.is_trending ? 1 : 0) - (a.is_trending ? 1 : 0));

  container.innerHTML = sortedVideos.map(vid => `
    <div class="video-card ${vid.is_trending ? 'trending-card' : ''}">
      <div class="video-thumb-box">
        <img src="${vid.thumbnail_url || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80'}" alt="${vid.title}">
        ${vid.is_trending ? '<div class="trending-badge-chip"><i class="fa-solid fa-fire"></i> TRENDING NOW</div>' : ''}
        <a href="${vid.youtube_url}" target="_blank" class="video-play-overlay">
          <div class="video-play-btn"><i class="fa-solid fa-play"></i></div>
        </a>
      </div>
      <div class="video-body">
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;">
          <span class="video-category-tag">${vid.category || 'General'}</span>
          ${vid.is_trending ? '<span class="trending-mini-tag"><i class="fa-solid fa-fire"></i> TRENDING</span>' : ''}
        </div>
        <h4>${vid.title}</h4>
        <p>${vid.description || ''}</p>
        <a href="${vid.youtube_url}" target="_blank" class="btn-primary" style="padding: 10px 22px; font-size: 0.9rem;">
          <i class="fa-brands fa-youtube"></i> Watch Video
        </a>
      </div>
    </div>
  `).join('');

  // Animate video cards entrance smoothly with GSAP
  if (document.querySelectorAll(".video-card").length > 0) {
    gsap.from(".video-card", {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#videos-container",
        start: "top 80%",
        once: true
      }
    });
  }
}

function renderSupport(support) {
  if (!support) return;
  if (support.creator_name) {
    const cEl = document.getElementById('support-creator-name-val');
    if (cEl) cEl.innerText = support.creator_name.toUpperCase();
  }
  if (support.upi_id) {
    const upiEl = document.getElementById('support-upi-id-val');
    if (upiEl) upiEl.innerText = support.upi_id;
  }
  if (support.support_message) {
    const msgEl = document.getElementById('support-message-val');
    if (msgEl) msgEl.innerText = support.support_message;
  }
  if (support.qr_code_url) {
    const qrImg = document.getElementById('support-qr-img');
    if (qrImg) qrImg.src = support.qr_code_url;
  }
  if (support.default_amount && window.setPresetAmount) {
    window.setPresetAmount(support.default_amount);
  }
}

function renderSocials(socials) {
  const container = document.getElementById('socials-container');
  if (!container || !socials || socials.length === 0) return;

  container.innerHTML = socials.map(s => `
    <a href="${s.url}" target="_blank" class="social-glass-card">
      <i class="${s.icon_class || 'fa-solid fa-link'}"></i> ${s.platform}
    </a>
  `).join('');

  if (document.querySelectorAll(".social-glass-card").length > 0) {
    gsap.from(".social-glass-card", {
      scale: 0.9,
      opacity: 0,
      duration: 0.7,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#socials-container",
        start: "top 85%",
        once: true
      }
    });
  }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  typing();
  initSmoothGsapAnimations();
  loadPublicContent();
});
