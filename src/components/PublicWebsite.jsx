import React, { useEffect, useState, useRef } from 'react';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function PublicWebsite() {
  const [data, setData] = useState(null);
  const [typingText, setTypingText] = useState('');
  const [navScrolled, setNavScrolled] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('home');
  const [payAmount, setPayAmount] = useState(100);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const compRef = useRef(null);

  // 0. Top Animated Scroll Progress Tracker
  useEffect(() => {
    const handleScrollProgress = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = (window.scrollY / totalScroll) * 100;
        setScrollProgress(currentProgress);
      }
      setNavScrolled(window.scrollY > 50);

      // Section active detection
      const sections = ['home', 'streams', 'videos', 'about', 'support'];
      const scrollPos = window.scrollY + 200;
      for (let sec of sections) {
        const el = document.getElementById(sec);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sec);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScrollProgress);
    return () => window.removeEventListener('scroll', handleScrollProgress);
  }, []);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // 1. Lenis Smooth Scroll Setup (Bulletproof GSAP Integration)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });

    lenis.on('scroll', ScrollTrigger.update);

    const updateLenis = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
    };
  }, []);

  // 2. Fetch Public Data & Sync Local Storage Updates
  useEffect(() => {
    const API_BASE_URL = typeof window !== 'undefined' && (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? 'https://youtuberweb.onrender.com' : '';

    const loadLocalCache = () => {
      const cached = localStorage.getItem('youtuber_site_data');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed) {
            setData(parsed);
            if (parsed.subscribers && parsed.subscribers.count !== undefined) {
              setDisplayCount(Number(parsed.subscribers.count));
            }
            return true;
          }
        } catch (e) {}
      }
      return false;
    };

    const hasLocalEdits = loadLocalCache();

    fetch(`${API_BASE_URL}/api/public/data`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const cached = localStorage.getItem('youtuber_site_data');
          if (hasLocalEdits && cached) {
            try {
              const localData = JSON.parse(cached);
              const mergedData = {
                settings: localData.settings || json.data.settings,
                streams: (localData.streams && localData.streams.length > 0) ? localData.streams : json.data.streams,
                videos: (localData.videos && localData.videos.length > 0) ? localData.videos : json.data.videos,
                subscribers: localData.subscribers || json.data.subscribers,
                support: localData.support || json.data.support,
                socials: (localData.socials && localData.socials.length > 0) ? localData.socials : json.data.socials
              };
              setData(mergedData);
              localStorage.setItem('youtuber_site_data', JSON.stringify(mergedData));
              if (mergedData.subscribers && mergedData.subscribers.count !== undefined) {
                setDisplayCount(Number(mergedData.subscribers.count));
              }
              return;
            } catch (e) {}
          }

          setData(json.data);
          localStorage.setItem('youtuber_site_data', JSON.stringify(json.data));
          if (json.data.subscribers && json.data.subscribers.count !== undefined) {
            setDisplayCount(Number(json.data.subscribers.count));
          }
        }
      })
      .catch(err => console.warn('Public API offline, using cached local data:', err));

    const handleStorage = (e) => {
      if (!e.key || e.key === 'youtuber_site_data') {
        loadLocalCache();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 3. Dynamic Typing Subtitle Loop Effect & Title Sync
  useEffect(() => {
    if (data?.settings?.website_title) {
      document.title = data.settings.website_title;
    }
  }, [data]);

  useEffect(() => {
    const rawPhrases = data?.settings?.hero_typing_texts;
    let textList = ["GAMING MARATHONS", "TECH REVIEWS", "LIVE STREAMS", "DAILY VLOGS"];
    if (Array.isArray(rawPhrases) && rawPhrases.length > 0) {
      textList = rawPhrases;
    } else if (typeof rawPhrases === 'string' && rawPhrases.trim().length > 0) {
      textList = rawPhrases.split(',').map(s => s.trim()).filter(Boolean);
    }

    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timer;

    function typeLoop() {
      if (!textList || textList.length === 0) return;
      const currentWord = textList[wordIdx % textList.length] || "GAMING MARATHONS";
      if (!isDeleting) {
        setTypingText(currentWord.substring(0, charIdx + 1));
        charIdx++;
        if (charIdx >= currentWord.length) {
          isDeleting = true;
          timer = setTimeout(typeLoop, 1200);
          return;
        }
      } else {
        setTypingText(currentWord.substring(0, charIdx - 1));
        charIdx--;
        if (charIdx <= 0) {
          isDeleting = false;
          wordIdx = (wordIdx + 1) % textList.length;
        }
      }
      timer = setTimeout(typeLoop, isDeleting ? 50 : 90);
    }

    timer = setTimeout(typeLoop, 400);
    return () => clearTimeout(timer);
  }, [data]);

  // 4. GSAP Animations & ScrollTrigger Setup (Clean, subtle & ultra-smooth)
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Gentle Parallax Background Orbs
      gsap.to(".ambient-1", {
        y: 150,
        scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 }
      });
      gsap.to(".ambient-2", {
        y: -120,
        scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 }
      });

      // Hero Entrance Timeline
      const heroTl = gsap.timeline({ defaults: { ease: "power2.out" } });
      heroTl.fromTo(".nav-capsule-wrapper", { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 })
            .fromTo(".hero-badge-pill", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.4")
            .fromTo(".hero-title-main", { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.3")
            .fromTo(".hero-subtitle", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.4")
            .fromTo(".hero-btn-group > *", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, "-=0.3")
            .fromTo(".hero-spotlight-card", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.5");

      // Section Headers Reveal
      gsap.utils.toArray(".section-header").forEach(header => {
        gsap.fromTo(header,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: header,
              start: "top 88%",
              toggleActions: "play none none none"
            }
          }
        );
      });

      // Stream Card Entrance
      gsap.fromTo(".stream-card-box",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".stream-section",
            start: "top 82%",
            toggleActions: "play none none none"
          }
        }
      );

      // Subscriber Card Entrance
      gsap.fromTo(".sub-card-container",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".subscriber-section",
            start: "top 82%",
            toggleActions: "play none none none"
          }
        }
      );

      // Subscriber Number Count-Up Trigger
      ScrollTrigger.create({
        trigger: ".subscriber-section",
        start: "top 80%",
        once: true,
        onEnter: () => {
          const target = dataRef.current?.subscribers?.count !== undefined ? dataRef.current.subscribers.count : 1245890;
          let current = 0;
          const duration = 1800;
          const startTime = performance.now();
          function animateCount(time) {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            current = Math.floor(easeOut * target);
            setDisplayCount(current);
            if (progress < 1) requestAnimationFrame(animateCount);
            else setDisplayCount(target);
          }
          requestAnimationFrame(animateCount);
        }
      });

      // Video Cards Entrance
      gsap.fromTo(".video-card",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".videos-section",
            start: "top 82%",
            toggleActions: "play none none none"
          }
        }
      );

      // About Section Entrance
      gsap.fromTo(".about-image-card",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-section",
            start: "top 82%",
            toggleActions: "play none none none"
          }
        }
      );
      gsap.fromTo(".about-text-content",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-section",
            start: "top 82%",
            toggleActions: "play none none none"
          }
        }
      );

      // Support Section Entrance
      gsap.fromTo(".support-wrapper",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".support-section",
            start: "top 82%",
            toggleActions: "play none none none"
          }
        }
      );

      // Social Cards Stagger Entrance
      gsap.fromTo(".social-glass-card",
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".socials-section",
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );

      setTimeout(() => ScrollTrigger.refresh(), 200);
    }, compRef);

    return () => ctx.revert();
  }, []);

  const settings = data?.settings || {};
  const streams = data?.streams || [];
  const videos = data?.videos || [];
  const subscribers = data?.subscribers || {};
  const support = data?.support || {};
  const socials = data?.socials || [];

  const mainStream = streams.length > 0 ? streams[0] : null;
  const sortedVideos = [...videos].sort((a, b) => (b.is_trending ? 1 : 0) - (a.is_trending ? 1 : 0));

  const getValidImgSrc = (url, fallback) => {
    if (!url) return fallback;
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/uploads/')) {
      return `https://youtuberweb.onrender.com${url}`;
    }
    return url || fallback;
  };

  return (
    <div className="public-app-root" ref={compRef}>
      {/* GLOWING TOP SCROLL PROGRESS BAR */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }}></div>

      {/* AMBIENT CANVAS BACKGROUND ORBS */}
      <div className="ambient-glow ambient-1"></div>
      <div className="ambient-glow ambient-2"></div>
      <div className="ambient-glow ambient-3"></div>

      {/* FLOATING SPOTLIGHT BEAM NAVBAR (MATCHING REFERENCE IMAGE) */}
      <div className={`nav-capsule-wrapper ${navScrolled ? 'scrolled' : ''}`}>
        <nav className="nav-spotlight-bar">
          {/* BRAND PILL LEFT */}
          <a href="#home" className="nav-brand-pill">
            <img 
              src={getValidImgSrc(settings.profile_image, "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80")} 
              onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80"; }} 
              alt="Profile" 
            />
            <span className="brand-name-text">{settings.creator_name || "ALEX VANCE"}</span>
          </a>

          {/* SPOTLIGHT MENU LINKS */}
          <div className="nav-spotlight-links">
            <a href="#home" className={`nav-spotlight-item ${activeSection === 'home' ? 'active' : ''}`}>
              {activeSection === 'home' && (
                <>
                  <div className="spotlight-top-line"></div>
                  <div className="spotlight-beam-cone"></div>
                </>
              )}
              <i className="fa-solid fa-house"></i>
              <span>Home</span>
            </a>

            <a href="#streams" className={`nav-spotlight-item ${activeSection === 'streams' ? 'active' : ''}`}>
              {activeSection === 'streams' && (
                <>
                  <div className="spotlight-top-line"></div>
                  <div className="spotlight-beam-cone"></div>
                </>
              )}
              <i className="fa-solid fa-tower-broadcast"></i>
              <span>Live Streams</span>
            </a>

            <a href="#videos" className={`nav-spotlight-item ${activeSection === 'videos' ? 'active' : ''}`}>
              {activeSection === 'videos' && (
                <>
                  <div className="spotlight-top-line"></div>
                  <div className="spotlight-beam-cone"></div>
                </>
              )}
              <i className="fa-solid fa-play"></i>
              <span>Videos</span>
            </a>

            <a href="#about" className={`nav-spotlight-item ${activeSection === 'about' ? 'active' : ''}`}>
              {activeSection === 'about' && (
                <>
                  <div className="spotlight-top-line"></div>
                  <div className="spotlight-beam-cone"></div>
                </>
              )}
              <i className="fa-solid fa-user"></i>
              <span>About</span>
            </a>

            <a href="#support" className={`nav-spotlight-item ${activeSection === 'support' ? 'active' : ''}`}>
              {activeSection === 'support' && (
                <>
                  <div className="spotlight-top-line"></div>
                  <div className="spotlight-beam-cone"></div>
                </>
              )}
              <i className="fa-solid fa-heart"></i>
              <span>Support Us</span>
            </a>

            {/* COMPACT ADMIN LOCK BUTTON */}
            <a href="/admin" className="admin-lock-btn" title="Admin Portal">
              <i className="fa-solid fa-lock"></i>
            </a>
          </div>
        </nav>
      </div>

      {/* HERO SECTION */}
      <section className="hero-section" id="home">
        <div className="hero-text-container">
          <div className="hero-badge-pill">
            <i className="fa-solid fa-bolt" style={{ color: '#0284c7' }}></i> OFFICIAL CREATOR PORTAL
          </div>
          <h1 className="hero-title-main">
            {settings.hero_welcome_text || "CREATING CONTENT THAT INSPIRES MILLIONS"} <br />
            <span className="sky-text">{typingText}<span style={{ opacity: 0.7 }}>|</span></span>
          </h1>
          <p className="hero-subtitle">
            {settings.about_text || "Welcome to my official creator portal. Catch daily live streams, custom gaming builds, tech reviews, and behind-the-scenes vlogs!"}
          </p>

          <div className="hero-btn-group">
            <a href="#streams" className="btn-primary">
              <i className="fa-brands fa-youtube"></i> Watch Stream
            </a>
            <a href={settings.youtube_channel_url || "https://youtube.com"} target="_blank" rel="noreferrer" className="btn-secondary">
              <i className="fa-solid fa-heart"></i> Subscribe
            </a>
          </div>
        </div>

        <div className="hero-card-wrap">
          <div className="hero-spotlight-card">
            <div className="hero-avatar-frame">
              <img 
                src={getValidImgSrc(settings.profile_image, "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=80")} 
                onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=80"; }} 
                alt="Creator Avatar" 
              />
              <div className="hero-live-tag">{mainStream?.status || "ONLINE"}</div>
            </div>
            <div className="hero-card-info">
              <h3>{settings.creator_name || "ALEX VANCE"}</h3>
              <p>Gaming & Tech Content Creator</p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE STREAM SHOWCASE SECTION */}
      <section className="stream-section" id="streams">
        <div className="section-header">
          <span className="section-tag">LIVE BROADCAST</span>
          <h2 className="section-title-text">FEATURED <span>STREAM HUB</span></h2>
        </div>

        <div className="stream-card-box">
          <div className="stream-media-wrap">
            <img 
              src={getValidImgSrc(mainStream?.thumbnail_url, "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80")} 
              onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"; }} 
              alt="Stream Preview" 
            />
            <div className="stream-status-chip live">{mainStream?.status || "LIVE NOW"}</div>
          </div>

          <div className="stream-info-wrap">
            <h3>{mainStream?.title || "🔥 UNSTOPPABLE 24-HOUR CYBER GAMING MARATHON & GIVEAWAY!"}</h3>
            <p>{mainStream?.description || "Join us live as we conquer the latest AAA game on ultra settings with viewer matches and chat giveaways!"}</p>

            <div className="countdown-grid">
              <div className="countdown-card"><span>02</span><label>Hours</label></div>
              <div className="countdown-card"><span>45</span><label>Mins</label></div>
              <div className="countdown-card"><span>12</span><label>Secs</label></div>
            </div>

            <div>
              <a href={mainStream?.youtube_url || "https://youtube.com"} target="_blank" rel="noreferrer" className="btn-primary">
                <i className="fa-brands fa-youtube"></i> Watch Stream on YouTube
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SUBSCRIBER COUNTER SECTION */}
      <section className="subscriber-section">
        <div className="sub-card-container">
          <div className="sub-title">Current YouTube Subscribers</div>
          <div 
            className="sub-number-display" 
            style={{ fontFamily: (subscribers && subscribers.counter_font) ? subscribers.counter_font : "'Bebas Neue', sans-serif" }}
          >
            {displayCount.toLocaleString()}
          </div>
          <div className="sub-badge-pill">
            <i className={subscribers.is_api_enabled ? "fa-brands fa-youtube" : "fa-solid fa-circle-check"} style={{ color: subscribers.is_api_enabled ? '#ef4444' : '#0284c7' }}></i>
            {subscribers.is_api_enabled ? "Live YouTube API Sync" : "Official YouTube Count"}
          </div>
        </div>
      </section>

      {/* VIDEOS SECTION */}
      <section className="videos-section" id="videos">
        <div className="section-header">
          <span className="section-tag">LATEST CONTENT</span>
          <h2 className="section-title-text">TRENDING <span>VIDEOS</span></h2>
        </div>

        <div className="videos-grid">
          {sortedVideos.map((vid) => (
            <div key={vid.id} className={`video-card ${vid.is_trending ? 'trending-card' : ''}`}>
              <div className="video-thumb-box">
                <img 
                  src={getValidImgSrc(vid.thumbnail_url, "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80")} 
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80"; }} 
                  alt={vid.title} 
                />
                {vid.is_trending && (
                  <div className="trending-badge-chip">
                    <i className="fa-solid fa-fire"></i> TRENDING NOW
                  </div>
                )}
                <a href={vid.youtube_url} target="_blank" rel="noreferrer" className="video-play-overlay">
                  <div className="video-play-btn"><i className="fa-solid fa-play"></i></div>
                </a>
              </div>

              <div className="video-body">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span className="video-category-tag">{vid.category || 'General'}</span>
                  {vid.is_trending && <span className="trending-mini-tag"><i className="fa-solid fa-fire"></i> 🔥 HOT</span>}
                </div>
                <h4>{vid.title}</h4>
                <p>{vid.description || ''}</p>
                <a href={vid.youtube_url} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: '10px 22px', fontSize: '0.9rem' }}>
                  <i className="fa-brands fa-youtube"></i> Watch Video
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="about-section" id="about">
        <div className="about-layout">
          <div className="about-image-card">
            <img 
              src={getValidImgSrc(settings.profile_image, "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=80")} 
              onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=80"; }} 
              alt="About Creator" 
            />
          </div>

          <div className="about-text-content">
            <h2>ABOUT {settings.creator_name || "ALEX VANCE"}</h2>
            <p>{settings.about_text || "Welcome to my official creator portal. I produce high-energy gaming streams, tech reviews, and daily behind-the-scenes content."}</p>

            <div className="stats-counter-grid">
              <div className="stat-box">
                <h4>1.2M+</h4>
                <p>Subscribers</p>
              </div>
              <div className="stat-box">
                <h4>500+</h4>
                <p>Videos</p>
              </div>
              <div className="stat-box">
                <h4>150M+</h4>
                <p>Views</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORT / UPI / FAMPAY SECTION */}
      {(() => {
        const currentUpiId = support.upi_id || "fam_2f43d815507f5ee1714a857d7454c93c7e6e661e@fam";
        const currentCreatorName = support.creator_name || settings.creator_name || "ALEX VANCE";
        const currentAmt = payAmount || 100;
        const dynamicUpiScheme = `upi://pay?pa=${encodeURIComponent(currentUpiId)}&pn=${encodeURIComponent(currentCreatorName)}&am=${encodeURIComponent(currentAmt)}&cu=INR`;
        const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=${encodeURIComponent(dynamicUpiScheme)}`;

        const copyToClipboard = () => {
          navigator.clipboard.writeText(currentUpiId);
          setCopiedUpi(true);
          setTimeout(() => setCopiedUpi(false), 2000);
        };

        return (
          <section className="support-section" id="support">
            <div className="section-header">
              <span className="section-tag">SUPPORT US</span>
              <h2 className="section-title-text">DYNAMIC <span>UPI / FAMPAY DONATIONS</span></h2>
            </div>

            <div className="support-wrapper">
              <div className="qr-display-box">
                <div className="qr-img-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={dynamicQrUrl} alt={`UPI QR Code for ₹${currentAmt}`} style={{ transition: 'all 0.3s ease', borderRadius: '16px', border: '2px solid #38bdf8' }} />
                  <div className="qr-badge-amount">₹{currentAmt}</div>
                </div>
                <p style={{ marginTop: '14px', fontWeight: 700, color: '#0284c7', fontSize: '0.92rem' }}>
                  <i className="fa-solid fa-qrcode"></i> Scan with FamPay, GPay, PhonePe or Paytm to pay ₹{currentAmt}
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>⚡ Dynamic Auto-Fill</span>
                  <span style={{ fontSize: '0.78rem', background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>🔒 Secure FamPay Gateway</span>
                </div>
              </div>

              <div className="support-form-content">
                <div className="upi-id-box" style={{ marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', fontWeight: 700 }}>CREATOR UPI / FAMPAY ID</span>
                    <code style={{ fontSize: '0.95rem' }}>{currentUpiId}</code>
                  </div>
                  <button type="button" className="btn-copy-upi" onClick={copyToClipboard}>
                    {copiedUpi ? <><i className="fa-solid fa-check"></i> Copied!</> : <><i className="fa-solid fa-copy"></i> Copy ID</>}
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href = dynamicUpiScheme;
                }}>
                  <label style={{ color: '#334155', fontWeight: 700, display: 'block', marginBottom: 12 }}>Select or Enter Amount (₹ INR) — QR Code Updates Instantly!</label>
                  <div className="preset-buttons-row" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {[50, 100, 200, 500, 1000].map(val => (
                      <button
                        key={val}
                        type="button"
                        className={`btn-preset-chip ${Number(payAmount) === val ? 'active-preset' : ''}`}
                        onClick={() => setPayAmount(val)}
                      >
                        ₹{val}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    name="amount"
                    className="amount-input-field"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    min="1"
                    required
                    placeholder="Enter Amount in ₹ (e.g. 50, 100, 500...)"
                  />

                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '1.15rem', padding: '18px' }}>
                    <i className="fa-solid fa-bolt"></i> PROCEED TO PAY ₹{currentAmt} VIA FAMPAY / UPI
                  </button>
                </form>

                <p className="upi-security-notice" style={{ marginTop: '16px' }}>
                  🔒 <strong>Instant FamPay & UPI Intent:</strong> Scanning or clicking launches FamPay, GPay, PhonePe, Paytm, or BHIM directly with ₹{currentAmt} pre-filled.
                </p>
              </div>
            </div>
          </section>
        );
      })()}

      {/* SOCIALS SECTION */}
      <section className="socials-section">
        <div className="section-header">
          <span className="section-tag">COMMUNITY</span>
          <h2 className="section-title-text">JOIN THE <span>CREATOR TRIBE</span></h2>
        </div>

        <div className="socials-cards-grid">
          {socials.map((s, idx) => (
            <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="social-glass-card">
              <i className={s.icon_class || "fa-solid fa-share-nodes"}></i> {s.platform}
            </a>
          ))}
        </div>
      </section>

      {/* SITE FOOTER */}
      <footer className="site-footer">
        <div className="footer-logo">{settings.creator_name || "ALEX VANCE"}</div>
        <p className="footer-copy">© {new Date().getFullYear()} Official YouTuber Hub. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
