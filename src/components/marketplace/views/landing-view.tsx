"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { navigate, api, type AppItem } from "@/lib/store";
import { SequenceHero } from "./SequenceHero";
import "./landing.css";

export function LandingView() {
  const [apps, setApps] = useState<AppItem[] | null>(null);
  const seqReadyRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ apps: AppItem[] }>("/api/apps");
        setApps(res.apps);
      } catch {
        setApps([]);
      }
    })();
  }, []);

  const topApps = (apps || []).sort((a, b) => b.deploymentCount - a.deploymentCount).slice(0, 4);
  const totalDeploys = (apps || []).reduce((sum, a) => sum + a.deploymentCount, 0) || 12000;
  const numApps = apps?.length || 6;
  const fallbackImages = [
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80",
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
    "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&q=80"
  ];
  const fallbackApps = [
    { name: "Grafana Observability", category: "Monitoring", slug: "grafana", url: "grafana.depnoyed.com" },
    { name: "InfluxDB Time Series", category: "Database", slug: "influxdb", url: "influx.depnoyed.com" },
    { name: "Supabase Platform", category: "Backend", slug: "supabase", url: "supabase.depnoyed.com" },
    { name: "MinIO Object Store", category: "Storage", slug: "minio", url: "minio.depnoyed.com" }
  ];
  const displayApps = topApps.length > 0 ? topApps : fallbackApps;

  useEffect(() => {
    // Check if reduced motion is enabled
    const R = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ===== GSAP + LENIS =====
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      duration: R ? 0 : 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    lenis.on("scroll", ScrollTrigger.update);
    (window as any).lenis = lenis;
    gsap.ticker.add((t) => {
      lenis.raf(t * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // ===== NOISE (static tile) =====
    const c = document.getElementById("noise") as HTMLCanvasElement;
    if (c) {
      const x = c.getContext("2d");
      if (x) {
        const s = 128;
        c.width = s;
        c.height = s;
        const img = x.createImageData(s, s);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        x.putImageData(img, 0, 0);
        c.style.width = "100%";
        c.style.height = "100%";
      }
    }

    // ===== CURSOR =====
    const cd = document.getElementById("cd");
    const cr = document.getElementById("cr");
    let cmx = -100,
      cmy = -100,
      crx = -100,
      cry = -100,
      cok = false;

    const onMouseMove = (e: MouseEvent) => {
      cmx = e.clientX;
      cmy = e.clientY;
      if (!cok && cd && cr) {
        cok = true;
        cd.classList.add("on");
        cr.classList.add("on");
        gsap.set(cd, { x: cmx, y: cmy, xPercent: -50, yPercent: -50 });
        gsap.set(cr, { x: cmx, y: cmy, xPercent: -50, yPercent: -50 });
      }
      if (cd) gsap.to(cd, { x: cmx, y: cmy, duration: 0.1, ease: "power2.out" });
    };
    document.addEventListener("mousemove", onMouseMove);

    const tickerFn = () => {
      if (!cok || !cr) return;
      crx += (cmx - crx) * 0.1;
      cry += (cmy - cry) * 0.1;
      gsap.set(cr, { x: crx, y: cry });
    };
    gsap.ticker.add(tickerFn);

    const hoverEls = document.querySelectorAll(
      "a, button, [data-m], .exp-item, .flow-step, .engine-feat, .problem-diagram .node"
    );
    const hoverMap = new Map<Element, { onEnter: EventListener; onLeave: EventListener }>();
    hoverEls.forEach((el) => {
      const onEnter = () => {
        if (cd) gsap.to(cd, { scale: 9.333, background: "#fff", duration: 0.35, ease: "power2.out" });
        if (cr) gsap.to(cr, { scale: 2, opacity: 0, duration: 0.4, ease: "power2.out" });
      };
      const onLeave = () => {
        if (cd) gsap.to(cd, { scale: 1, background: "#f97316", duration: 0.35, ease: "power2.out" });
        if (cr) gsap.to(cr, { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" });
      };
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      hoverMap.set(el, { onEnter, onLeave });
    });

    // ===== MAGNETIC =====
    const magEls = document.querySelectorAll("[data-m]");
    const magMap = new Map<Element, { onMove: EventListener; onLeave: EventListener }>();
    magEls.forEach((el) => {
      const onMove = (e: Event) => {
        const mouseEvent = e as MouseEvent;
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (mouseEvent.clientX - r.left - r.width / 2) * 0.2,
          y: (mouseEvent.clientY - r.top - r.height / 2) * 0.2,
          duration: 0.35,
          ease: "power2.out",
        });
      };
      const onLeave = () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
      };
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      magMap.set(el, { onMove, onLeave });
    });

    // ===== PARTICLE NETWORK (HERO) =====
    let drawRaf: number;
    const hCanvas = document.getElementById("heroCanvas") as HTMLCanvasElement;
    const heroMouse = { x: -1000, y: -1000 };

    const onHeroMouseMove = (e: MouseEvent) => {
      const r = hCanvas.getBoundingClientRect();
      heroMouse.x = e.clientX - r.left;
      heroMouse.y = e.clientY - r.top;
    };
    const onHeroMouseLeave = () => {
      heroMouse.x = -1000;
      heroMouse.y = -1000;
    };

    if (hCanvas) {
      const x = hCanvas.getContext("2d");
      if (x) {
        let w = 0,
          h = 0;
        const nodes: any[] = [];
        const resize = () => {
          w = hCanvas.width = hCanvas.offsetWidth;
          h = hCanvas.height = hCanvas.offsetHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const count = R ? 30 : 60;
        for (let i = 0; i < count; i++) {
          nodes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
          });
        }

        if (hCanvas.parentElement) {
          hCanvas.parentElement.addEventListener("mousemove", onHeroMouseMove);
          hCanvas.parentElement.addEventListener("mouseleave", onHeroMouseLeave);
        }

        const draw = () => {
          x.clearRect(0, 0, w, h);
          nodes.forEach((n) => {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > w) n.vx *= -1;
            if (n.y < 0 || n.y > h) n.vy *= -1;
            const dx = n.x - heroMouse.x,
              dy = n.y - heroMouse.y,
              dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              const f = ((150 - dist) / 150) * 0.8;
              n.x += (dx / dist) * f;
              n.y += (dy / dist) * f;
            }
            x.beginPath();
            x.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            x.fillStyle = "rgba(249,115,22,.15)";
            x.fill();
          });
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const dx = nodes[i].x - nodes[j].x,
                dy = nodes[i].y - nodes[j].y,
                dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 120) {
                x.beginPath();
                x.moveTo(nodes[i].x, nodes[i].y);
                x.lineTo(nodes[j].x, nodes[j].y);
                x.strokeStyle = `rgba(249,115,22,${0.06 * (1 - dist / 120)})`;
                x.lineWidth = 0.5;
                x.stroke();
              }
            }
          }
          if (!R) drawRaf = requestAnimationFrame(draw);
        };
        draw();
      }
    }

    // ===== INIT SECTIONS =====
    const initHero = () => {
      const chars = document.querySelectorAll(".hero-title .ch");
      const bar = document.querySelector(".accent-bar");
      if (R) {
        gsap.set(".hero-label", { opacity: 1 });
        gsap.set(chars, { opacity: 1 });
        gsap.set(".hero-desc", { opacity: 1 });
        gsap.set(".hero-acts", { opacity: 1 });
        if (bar) bar.classList.add("on");
        gsap.set("#scrollLine", { opacity: 1 });
        return;
      }
      gsap.set(chars, { y: 120, opacity: 0, rotateX: -45 });
      const tl = gsap.timeline({ delay: 0.1 });
      tl.to(".hero-label", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" })
        .to(chars, { y: 0, opacity: 1, rotateX: 0, duration: 1, ease: "power4.out", stagger: 0.02 }, "-=.4")
        .to(".hero-desc", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=.5")
        .to(".hero-acts", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=.5")
        .to("#scrollLine", { opacity: 1, duration: 0.8 }, "-=.3")
        .call(() => {
          if (bar) bar.classList.add("on");
        }, undefined, "-=0.4");
    };

    const initProblem = () => {
      gsap.from(".problem-head", { opacity: 0, y: 50, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".problem-head", start: "top 75%" } });
      gsap.from(".problem-text p", { opacity: 0, y: 30, duration: 0.8, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: ".problem-text", start: "top 75%" } });
      gsap.from(".problem-diagram .node", { opacity: 0, x: -20, duration: 0.6, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".problem-diagram", start: "top 75%" } });
    };

    const initShift = () => {
      const words = document.querySelectorAll(".shift-word");
      const texts = document.querySelectorAll(".shift-right-text p");
      const totalSteps = 4;
      ScrollTrigger.create({
        trigger: "#shiftSticky",
        start: "top top",
        end: "+=2500", // Hijacks scroll for 2500 pixels
        pin: true,
        pinType: "transform",
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          const step = Math.min(totalSteps - 1, Math.floor(p * totalSteps));
          words.forEach((w, i) => {
            w.classList.toggle("active", i === step);
          });
          texts.forEach((t, i) => {
            t.classList.toggle("on", i === step);
          });
        },
      });
    };

    const initSystem = () => {
      gsap.from(".system-title", { opacity: 0, y: 60, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".system-title", start: "top 75%" } });
      document.querySelectorAll(".flow-step").forEach((s, i) => {
        gsap.from(s, { opacity: 0, y: 60, duration: 0.8, delay: i * 0.15, ease: "power3.out", scrollTrigger: { trigger: s, start: "top 82%" } });
      });
    };

    const initEngine = () => {
      const lines = document.querySelectorAll("#engineCode .ln");
      const codeObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              lines.forEach((l, i) => {
                setTimeout(() => l.classList.add("vis"), i * 60);
              });
              codeObs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      const elCode = document.getElementById("engineCode");
      if (elCode) codeObs.observe(elCode);

      gsap.from(".engine-feat", { opacity: 0, x: 30, duration: 0.7, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".engine-feats", start: "top 75%" } });
    };

    const initExp = () => {
      gsap.from(".exp-head", { opacity: 0, y: 60, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".exp-head", start: "top 75%" } });
      document.querySelectorAll(".exp-item").forEach((item, i) => {
        gsap.from(item, { opacity: 0, y: 80, scale: 0.97, duration: 1, delay: i * 0.1, ease: "power3.out", scrollTrigger: { trigger: item, start: "top 85%" } });
        const img = item.querySelector("img");
        if(img) {
          gsap.to(img, { y: -40, scrollTrigger: { trigger: item, start: "top bottom", end: "bottom top", scrub: 1 } });
        }
      });
    };

    const initScale = () => {
      gsap.from(".scale-title", { opacity: 0, y: 40, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".scale-title", start: "top 75%" } });
      document.querySelectorAll(".counter").forEach((c) => {
        const el = c as HTMLElement;
        const t = parseFloat(el.dataset.target || "0");
        const dec = parseInt(el.dataset.dec || "0");
        ScrollTrigger.create({
          trigger: c,
          start: "top 85%",
          once: true,
          onEnter: () => {
            const o = { v: 0 };
            gsap.to(o, {
              v: t,
              duration: 2.2,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = dec ? o.v.toFixed(dec) : String(Math.floor(o.v));
              },
            });
          },
        });
      });
    };

    const initFuture = () => {
      gsap.fromTo("#futureBg", { x: "-10%" }, { x: "10%", scrollTrigger: { trigger: ".s-future", start: "top bottom", end: "bottom top", scrub: 1 } });
      gsap.from(".future-title", { opacity: 0, y: 60, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: ".future-title", start: "top 75%" } });
      gsap.from(".future-desc", { opacity: 0, y: 30, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".future-desc", start: "top 80%" } });
      gsap.from(".s-future .btn-p", { opacity: 0, y: 30, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".s-future .btn-p", start: "top 85%" } });
    };

    const initNav = () => {
      ScrollTrigger.create({
        start: "top -80",
        end: 99999,
        onUpdate: (self) => {
          if (self.direction === 1 && self.scroll() > 200) {
            gsap.to("#nav", { y: -100, duration: 0.4, ease: "power3.in" });
          } else {
            gsap.to("#nav", { y: 0, duration: 0.4, ease: "power3.out" });
          }
        },
      });
    };

    // Smooth Scroll Links
    const onLinkClick = (e: Event) => {
      e.preventDefault();
      const targetId = (e.currentTarget as HTMLAnchorElement).getAttribute("href");
      if (targetId && targetId.startsWith("#")) {
        const t = document.querySelector(targetId);
        if (t) lenis.scrollTo(t as HTMLElement, { offset: -80 });
      }
    };
    const scrollLinks = document.querySelectorAll('a[href^="#"]');
    scrollLinks.forEach((l) => l.addEventListener("click", onLinkClick));

    // ===== PRELOADER ANIMATION =====
    const n = document.getElementById("preN");
    const bar = document.getElementById("preBar");
    const pre = document.getElementById("pre");
    const obj = { val: 0 };
    const dur = R ? 0.1 : 2.8;

    if (n && bar && pre) {
      gsap.to(n, { opacity: 1, duration: 0.5 });
      gsap.to(obj, {
        val: 100,
        duration: dur,
        ease: "power2.inOut",
        onUpdate: () => {
          n.textContent = String(Math.floor(obj.val)).padStart(2, "0");
        },
      });
      gsap.to(bar, { width: "100%", duration: dur, ease: "power2.inOut" });

      const checkReadyAndHide = () => {
        if (!seqReadyRef.current) {
          setTimeout(checkReadyAndHide, 100);
          return;
        }
        gsap.to(pre, {
          yPercent: -100,
          duration: R ? 0.01 : 1,
          ease: "power4.inOut",
          onComplete: () => {
            pre.style.display = "none";
            initHero();
            initProblem();
            initShift();
            initSystem();
            initEngine();
            initExp();
            initScale();
            initFuture();
            initNav();
            ScrollTrigger.refresh();
          },
        });
      };
      
      setTimeout(checkReadyAndHide, (dur + 0.3) * 1000);
    } else {
      // If no preloader, just init
      const checkReadyAndHide = () => {
        if (!seqReadyRef.current) {
          setTimeout(checkReadyAndHide, 100);
          return;
        }
        initHero();
        initProblem();
        initShift();
        initSystem();
        initEngine();
        initExp();
        initScale();
        initFuture();
        initNav();
        ScrollTrigger.refresh();
      };
      checkReadyAndHide();
    }

    // Cleanup
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      gsap.ticker.remove(tickerFn);

      hoverEls.forEach((el) => {
        const h = hoverMap.get(el);
        if (h) {
          el.removeEventListener("mouseenter", h.onEnter);
          el.removeEventListener("mouseleave", h.onLeave);
        }
      });

      magEls.forEach((el) => {
        const m = magMap.get(el);
        if (m) {
          el.removeEventListener("mousemove", m.onMove);
          el.removeEventListener("mouseleave", m.onLeave);
        }
      });

      if (hCanvas?.parentElement) {
        hCanvas.parentElement.removeEventListener("mousemove", onHeroMouseMove);
        hCanvas.parentElement.removeEventListener("mouseleave", onHeroMouseLeave);
      }
      if (drawRaf) cancelAnimationFrame(drawRaf);

      scrollLinks.forEach((l) => l.removeEventListener("click", onLinkClick));
      
      // Destroy scrolltriggers to avoid stale listeners on re-mount
      ScrollTrigger.getAll().forEach(t => t.kill());
      lenis.destroy();
    };
  }, []);

  return (
    <div className="landing-page-wrapper">
      <canvas id="noise"></canvas>
      <div className="c-d" id="cd"></div>
      <div className="c-r" id="cr"></div>

      {/* Sequence Hero */ }
      <SequenceHero onReady={() => { seqReadyRef.current = true; }} />

      {/* Preloader */}
      <div className="pre" id="pre">
        <div className="pre-n" id="preN">0</div>
        <div className="pre-bar">
          <div className="pre-bar-i" id="preBar"></div>
        </div>
        <div className="pre-l">initializing</div>
      </div>

      {/* Nav */}
      <nav className="nav" id="nav">
        <a href="#" className="nav-logo" data-m>
          <i></i>depnoyed
        </a>
        <div className="nav-r">
          <a href="#system" className="nav-link" data-m>
            System
          </a>
          <a href="#engine" className="nav-link" data-m>
            Engine
          </a>
          <a href="#work" className="nav-link" data-m>
            Work
          </a>
          <button className="nav-link" style={{ marginLeft: "1rem" }} data-m onClick={() => navigate({ name: "login" })}>
            Log In
          </button>
          <button className="nav-cta" data-m onClick={() => navigate({ name: "login" })}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" id="hero">
        <canvas className="hero-canvas" id="heroCanvas"></canvas>
        <div className="hero-meta">
          <span>40.7128° N, 74.0060° W</span>
          <span>sys.status: operational</span>
          <span>v2.4.1 — build 847</span>
        </div>
        <div className="hero-content">
          <div className="hero-label" style={{ opacity: 0 }}>
            <span className="ln"></span>Infrastructure as experience — 2025
          </div>
          <h1 className="hero-title" id="heroTitle">
            <span className="ln">
              <span className="w">
                <span className="ch">D</span>
                <span className="ch">e</span>
                <span className="ch">p</span>
                <span className="ch">l</span>
                <span className="ch">o</span>
                <span className="ch">y</span>
              </span>
            </span>
            <span className="ln">
              <span className="w">
                <span className="ch">w</span>
                <span className="ch">i</span>
                <span className="ch">t</span>
                <span className="ch">h</span>
                <span className="ch">o</span>
                <span className="ch">u</span>
                <span className="ch">t</span>
              </span>
              <span className="w accent">
                <span className="ch">f</span>
                <span className="ch">r</span>
                <span className="ch">i</span>
                <span className="ch">c</span>
                <span className="ch">t</span>
                <span className="ch">i</span>
                <span className="ch">o</span>
                <span className="ch">n</span>
                <span className="accent-bar"></span>
              </span>
            </span>
            <span className="ln">
              <span className="w">
                <span className="ch">s</span>
                <span className="ch">c</span>
                <span className="ch">a</span>
                <span className="ch">l</span>
                <span className="ch">e</span>
              </span>
              <span className="w">
                <span className="ch">w</span>
                <span className="ch">i</span>
                <span className="ch">t</span>
                <span className="ch">h</span>
                <span className="ch">o</span>
                <span className="ch">u</span>
                <span className="ch">t</span>
              </span>
              <span className="w">
                <span className="ch">l</span>
                <span className="ch">i</span>
                <span className="ch">m</span>
                <span className="ch">i</span>
                <span className="ch">t</span>
                <span className="ch">.</span>
              </span>
            </span>
          </h1>
          <div className="hero-bot">
            <p className="hero-desc" style={{ opacity: 0 }}>
              Open-source applications deployed in seconds. Persistent storage, automated networking, one-click infrastructure.
            </p>
            <div className="hero-acts" style={{ opacity: 0 }}>
              <button className="btn-p" data-m onClick={() => navigate({ name: "marketplace" })}>
                <span>Explore Platform</span>
              </button>
              <button className="btn-g" data-m onClick={() => navigate({ name: "login" })}>
                Sign In
              </button>
            </div>
          </div>
        </div>
        <div className="scroll-line" id="scrollLine">
          <span className="dot"></span>
        </div>
      </section>

      {/* Problem */}
      <section className="s-problem" id="problem">
        <div className="problem-grid">
          <div>
            <div className="s-label">
              <span className="dash"></span>01 — The Problem
            </div>
            <h2 className="problem-head">Infrastructure should be invisible. Instead, it's the bottleneck.</h2>
            <div className="problem-text">
              <p>
                Teams spend weeks configuring Kubernetes clusters, managing reverse proxies, debugging Docker networking, and
                maintaining deployment pipelines.
              </p>
              <p>The tooling meant to accelerate development has become the thing that slows it down.</p>
            </div>
          </div>
          <div className="problem-visual">
            <div className="problem-diagram">
              <div className="node">
                <span className="icon"></span>Docker configuration
              </div>
              <div className="conn"></div>
              <div className="node">
                <span className="icon"></span>Kubernetes manifests
              </div>
              <div className="conn"></div>
              <div className="node">
                <span className="icon"></span>Ingress / reverse proxy
              </div>
              <div className="conn"></div>
              <div className="node">
                <span className="icon"></span>SSL certificates
              </div>
              <div className="conn"></div>
              <div className="node">
                <span className="icon"></span>Persistent volumes
              </div>
              <div className="conn"></div>
              <div className="node">
                <span className="icon"></span>Monitoring stack
              </div>
              <span className="problem-diagram-label">current workflow — 6 manual steps</span>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* Shift (Sticky) */}
      <section className="s-shift" id="shift">
        <div className="shift-sticky" id="shiftSticky">
          <div className="shift-pin">
            <div className="shift-big">ONE CLICK</div>
            <div className="shift-inner">
              <div className="shift-left">
                <div className="shift-line"></div>
                <div className="shift-words">
                  <div className="shift-word" data-step="0">
                    <span className="num">step 01</span>Choose your application
                  </div>
                  <div className="shift-word" data-step="1">
                    <span className="num">step 02</span>Configure resources
                  </div>
                  <div className="shift-word" data-step="2">
                    <span className="num">step 03</span>Deploy instantly
                  </div>
                  <div className="shift-word" data-step="3">
                    <span className="num">step 04</span>It just works
                  </div>
                </div>
              </div>
              <div className="shift-right">
                <div className="shift-right-text">
                  <p data-step="0">
                    Browse our verified marketplace of 200+ open-source applications. Each one tested, optimized, and ready for
                    production.
                  </p>
                  <p data-step="1">
                    Set CPU, memory, and storage with intuitive controls. No YAML. No Helm charts. No infrastructure-as-code
                    files.
                  </p>
                  <p data-step="2">
                    One click. That's it. Depnoyed handles provisioning, networking, SSL, and persistent storage automatically.
                  </p>
                  <p data-step="3">
                    A running application with a public URL, monitoring dashboard, and automatic backups. Zero configuration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System */}
      <section className="s-system" id="system">
        <div className="system-head">
          <div className="s-label">
            <span className="dash"></span>03 — The System
          </div>
          <h2 className="system-title">
            Three steps from <span className="hl">zero to production.</span>
          </h2>
        </div>
        <div className="system-flow">
          <div className="flow-step">
            <div className="flow-step-num">01</div>
            <div className="flow-step-icon">◎</div>
            <h3 className="flow-step-title">Choose</h3>
            <p className="flow-step-desc">
              Find the open-source application you need from our verified marketplace catalog of 200+ production-ready tools.
            </p>
          </div>
          <div className="flow-step">
            <div className="flow-step-num">02</div>
            <div className="flow-step-icon">⚡</div>
            <h3 className="flow-step-title">Deploy</h3>
            <p className="flow-step-desc">
              Configure your instance resources and environment. Then deploy with a single click. No infrastructure knowledge
              required.
            </p>
          </div>
          <div className="flow-step">
            <div className="flow-step-num">03</div>
            <div className="flow-step-icon">→</div>
            <h3 className="flow-step-title">Use</h3>
            <p className="flow-step-desc">
              Get a ready-to-use application with persistent storage, a secure public URL, and real-time monitoring.
            </p>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* Engine */}
      <section className="s-engine" id="engine">
        <div className="engine-grid">
          <div className="engine-code" id="engineCode">
            <div className="ln">
              <span className="k">apiVersion:</span> <span className="v">apps/v1</span>
            </div>
            <div className="ln">
              <span className="k">kind:</span> <span className="v">Deployment</span>
            </div>
            <div className="ln">
              <span className="k">metadata:</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;<span className="k">name:</span> <span className="v">grafana-production</span>
            </div>
            <div className="ln">
              <span className="k">spec:</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;<span className="k">replicas:</span> <span className="v">1</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;<span className="k">template:</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="k">spec:</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">containers:</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span className="k">name:</span> <span className="v">grafana</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">image:</span>{" "}
              <span className="v">grafana/grafana:latest</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">resources:</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">limits:</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">memory:</span>{" "}
              <span className="v">"1Gi"</span>
            </div>
            <div className="ln">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">cpu:</span>{" "}
              <span className="v">"500m"</span>
            </div>
            <div className="ln" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(216,212,204,.06)" }}>
              <span className="c">// Depnoyed handles all of this automatically.</span>
            </div>
          </div>
          <div>
            <div className="s-label">
              <span className="dash"></span>04 — The Engine
            </div>
            <h2 className="problem-head">
              Enterprise infrastructure,<br />
              abstracted.
            </h2>
            <div className="engine-feats">
              <div className="engine-feat">
                <div className="engine-feat-icon">⊞</div>
                <div>
                  <div className="engine-feat-title">Isolated Tenants</div>
                  <div className="engine-feat-desc">
                    Every deployment runs in its own isolated environment with strict resource boundaries.
                  </div>
                </div>
              </div>
              <div className="engine-feat">
                <div className="engine-feat-icon">◉</div>
                <div>
                  <div className="engine-feat-title">Persistent Storage</div>
                  <div className="engine-feat-desc">
                    Automatic persistent volume claims. Your data survives restarts, updates, and migrations.
                  </div>
                </div>
              </div>
              <div className="engine-feat">
                <div className="engine-feat-icon">◎</div>
                <div>
                  <div className="engine-feat-title">Automated Routing</div>
                  <div className="engine-feat-desc">
                    Instant secure subdomains with automatic SSL. No ingress configuration required.
                  </div>
                </div>
              </div>
              <div className="engine-feat">
                <div className="engine-feat-icon">▤</div>
                <div>
                  <div className="engine-feat-title">Resource Limits</div>
                  <div className="engine-feat-desc">
                    Strict CPU and memory limits prevent noisy-neighbor issues across the platform.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* Experience */}
      <section className="s-exp" id="work">
        <div className="exp-head">
          <div>
            <div className="s-label">
              <span className="dash"></span>05 — The Experience
            </div>
            <h2 className="exp-title">
              Production-ready<br />
              catalog.
            </h2>
          </div>
          <span className="exp-count">{numApps < 10 ? `0${numApps}` : numApps} applications featured</span>
        </div>
        <div className="exp-grid">
          {displayApps.map((app, i) => (
            <div className="exp-item" data-m key={app.slug} onClick={() => navigate({ name: "app", slug: app.slug })}>
              <div className="exp-item-inner">
                <img src={fallbackImages[i % 4]} alt={app.name} loading="lazy" />
                <div className="exp-item-over">
                  <span className="exp-item-tag">{app.category}</span>
                  <span className="exp-item-name">{app.name}</span>
                  <span className="exp-item-meta">{('url' in app ? app.url : `${app.slug}.depnoyed.com`)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider"></div>

      {/* Scale */}
      <section className="s-scale" id="scale">
        <div className="scale-head">
          <div className="s-label" style={{ justifyContent: "center" }}>
            <span className="dash"></span>06 — The Scale<span className="dash"></span>
          </div>
          <h2 className="scale-title">Numbers that speak.</h2>
        </div>
        <div className="scale-grid">
          <div className="scale-cell">
            <div className="scale-num">
              <span className="counter" data-target={totalDeploys > 1000 ? (totalDeploys / 1000).toFixed(1) : totalDeploys} data-dec={totalDeploys > 1000 ? "1" : "0"}>
                0
              </span>
              <span className="unit">{totalDeploys > 1000 ? "K+" : ""}</span>
            </div>
            <div className="scale-label">Deployments</div>
          </div>
          <div className="scale-cell">
            <div className="scale-num">
              <span className="counter" data-target="99.9" data-dec="1">
                0
              </span>
              <span className="unit">%</span>
            </div>
            <div className="scale-label">Uptime SLA</div>
          </div>
          <div className="scale-cell">
            <div className="scale-num">
              <span className="counter" data-target="200">
                0
              </span>
              <span className="unit">+</span>
            </div>
            <div className="scale-label">Applications</div>
          </div>
          <div className="scale-cell">
            <div className="scale-num">
              <span className="counter" data-target="45">
                0
              </span>
              <span className="unit">s</span>
            </div>
            <div className="scale-label">Avg Deploy</div>
          </div>
        </div>
      </section>

      {/* Future */}
      <section className="s-future">
        <div className="future-bg" id="futureBg">
          FRICTIONLESS
        </div>
        <div className="future-content">
          <div className="s-label" style={{ justifyContent: "center" }}>
            <span className="dash"></span>07 — The Future<span className="dash"></span>
          </div>
          <h2 className="future-title">
            Stop configuring.<br />
            <span className="accent">Start building.</span>
          </h2>
          <p className="future-desc">
            Join thousands of developers who've replaced weeks of infrastructure work with a single click.
          </p>
          <button className="btn-p" data-m onClick={() => navigate({ name: "login" })}>
            <span>Create Free Account</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="foot">
        <div className="foot-inner">
          <span className="foot-logo">
            <i></i>depnoyed
          </span>
          <span className="foot-copy">© 2025 depnoyed. all rights reserved.</span>
          <ul className="foot-links">
            <li>
              <a href="#" className="foot-link" data-m>
                twitter
              </a>
            </li>
            <li>
              <a href="#" className="foot-link" data-m>
                github
              </a>
            </li>
            <li>
              <a href="#" className="foot-link" data-m>
                discord
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
