"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const APP_URL = "https://varfoot.vercel.app";
const GITHUB_URL = "https://github.com/jccollinsdev/varfoot";

const SCREENS = [
  { src: "/screenshots/01-today.png",    label: "Today",  caption: "Daily dashboard" },
  { src: "/screenshots/02-roadmap.png",  label: "Plan",   caption: "Training roadmap" },
  { src: "/screenshots/03-progress.png", label: "Train",  caption: "Skills & progress" },
  { src: "/screenshots/04-nutrition.png",label: "Fuel",   caption: "Nutrition tracking" },
  { src: "/screenshots/05-coach.png",    label: "Coach",  caption: "AI coach" },
];

function ScreenshotCarousel() {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => { setPrev(i); return (i + 1) % SCREENS.length; });
    }, 3600);
    return () => clearInterval(t);
  }, []);

  const go = (n: number) => { setPrev(idx); setIdx(n); };
  const s = SCREENS[idx];

  return (
    <div className="vf-car">
      <div className="vf-car-phone">
        <div className="vf-car-inner">
          {SCREENS.map((scr, i) => (
            <Image
              key={scr.src}
              src={scr.src}
              alt={`${scr.label} — ${scr.caption}`}
              fill
              sizes="(max-width: 900px) 52vw, 360px"
              priority={i === 0}
              className={`vf-car-slide${i === idx ? " active" : i === prev ? " out" : ""}`}
            />
          ))}
        </div>
        <div className="vf-car-notch" />
        <div className="vf-car-bar" />
      </div>
      <div className="vf-car-meta">
        <span className="vf-car-label">{s.label}</span>
        <span className="vf-car-caption">{s.caption}</span>
      </div>
      <div className="vf-car-dots">
        {SCREENS.map((sc, i) => (
          <button key={i} type="button" aria-label={sc.label}
            className={`vf-car-dot${i === idx ? " on" : ""}`}
            onClick={() => go(i)} />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="vf-landing-panel">

      {/* ── Full-height hero ─────────────────────────────────────────────── */}
      <section className="vf-hero">

        {/* LEFT: text */}
        <div className="vf-hero-left">
          <header className="vf-header">
            <div className="vf-header-brand">
              <Image src="/varfoot-mark.svg" alt="" width={26} height={26}
                style={{ borderRadius: 7 }} />
              <span className="vf-header-name">VarFooty</span>
            </div>
            <nav className="vf-header-nav">
              <a href={GITHUB_URL} className="vf-nav-link"
                target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href={APP_URL} className="vf-nav-cta"
                target="_blank" rel="noopener noreferrer">Open app ↗</a>
            </nav>
          </header>

          <div className="vf-hero-copy">
            <p className="vf-eyebrow">For JV &amp; club players</p>
            <h1 className="vf-headline">
              Train with<br />purpose.<br />
              <span className="vf-headline-green">Make varsity.</span>
            </h1>
            <p className="vf-desc">
              VarFooty scores your Varsity Readiness across 5 pillars,
              ranks your biggest gaps, and builds a roadmap that updates
              after every session.
            </p>
            <div className="vf-ctas">
              <a href={APP_URL} className="vf-btn-primary"
                target="_blank" rel="noopener noreferrer">
                Try it out <span aria-hidden>→</span>
              </a>
              <a href="#how-it-works" className="vf-btn-ghost">How it works</a>
            </div>
            <div className="vf-inline-stats">
              <span className="vf-istat"><b>19</b> drills</span>
              <span className="vf-istat-sep">·</span>
              <span className="vf-istat"><b>5</b> pillars</span>
              <span className="vf-istat-sep">·</span>
              <span className="vf-istat"><b>AI</b> coach</span>
            </div>
          </div>
        </div>

        {/* RIGHT: screenshot carousel */}
        <div className="vf-hero-right">
          <div className="vf-hero-right-glow" />
          <ScreenshotCarousel />
        </div>

      </section>

      {/* ── Below fold ───────────────────────────────────────────────────── */}
      <div className="vf-below">

        {/* How it works */}
        <section id="how-it-works" className="vf-steps-section">
          <p className="vf-section-label">How it works</p>
          <div className="vf-steps">
            <div className="vf-step">
              <span className="vf-step-n">01</span>
              <span className="vf-step-t">
                Complete the 19-drill baseline — mostly solo, under 30 min
              </span>
            </div>
            <div className="vf-step-arrow">→</div>
            <div className="vf-step">
              <span className="vf-step-n">02</span>
              <span className="vf-step-t">
                Get your Varsity Readiness score with weakest gaps ranked
              </span>
            </div>
            <div className="vf-step-arrow">→</div>
            <div className="vf-step">
              <span className="vf-step-n">03</span>
              <span className="vf-step-t">
                Follow the gap-first roadmap — re-prioritized every session
              </span>
            </div>
          </div>
        </section>

        {/* Add to home screen */}
        <section className="vf-pwa-section">
          <p className="vf-section-label">Add to home screen</p>
          <div className="vf-pwa-cards">
            <div className="vf-pwa-card">
              <span className="vf-pwa-icon">🍎</span>
              <div>
                <span className="vf-pwa-os">iOS · Safari</span>
                <div className="vf-pwa-row">
                  Tap <kbd className="vf-kbd">Share</kbd>
                  <span className="vf-pwa-arr">›</span>
                  <kbd className="vf-kbd">Add to Home Screen</kbd>
                </div>
              </div>
            </div>
            <div className="vf-pwa-card">
              <span className="vf-pwa-icon">🤖</span>
              <div>
                <span className="vf-pwa-os">Android · Chrome</span>
                <div className="vf-pwa-row">
                  Tap <kbd className="vf-kbd">⋮</kbd>
                  <span className="vf-pwa-arr">›</span>
                  <kbd className="vf-kbd">Add to Home Screen</kbd>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="vf-footer">
          <span>LexHack &rsquo;26 · Build for Someone Real</span>
          <span>Sansar Karki &amp; Saaransh ·{" "}
            <a href={APP_URL} target="_blank" rel="noopener noreferrer">
              varfoot.vercel.app
            </a>
          </span>
        </footer>

      </div>
    </main>
  );
}
