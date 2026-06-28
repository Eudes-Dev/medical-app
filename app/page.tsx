/**
 * Page d'accueil (landing) publique de l'application médicale.
 *
 * Vitrine marketing présentant la plateforme et orientant vers les deux
 * espaces de l'application :
 * - Espace Public (/book) : prise de rendez-vous pour les patients
 * - Espace Privé (/dashboard) : tableau de bord pour le praticien
 *
 * Refonte fidèle au design « Landing Medical App » (Claude Design).
 * Polices : Hanken Grotesk (corps) + Schibsted Grotesk (titres), chargées
 * via next/font dans app/layout.tsx.
 *
 * Toutes les animations (apparition au scroll, compteurs, ombre du header,
 * parallax souris) sont pilotées en DOM direct dans un effet client pour
 * rester performantes et respecter `prefers-reduced-motion`.
 *
 * Route: /
 *
 * @module app/page
 */

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/** Police d'affichage (titres). */
const DISPLAY = "var(--font-schibsted-grotesk), 'Schibsted Grotesk', sans-serif";
/** Police de corps. */
const BODY = "var(--font-hanken-grotesk), 'Hanken Grotesk', system-ui, sans-serif";

/** Easing partagé pour les apparitions au scroll. */
const EASE = "cubic-bezier(.22,1,.36,1)";

/**
 * CSS scopé à la landing (`.lp`) : keyframes, états :hover/:active, et règles
 * responsive. Le reste de la mise en forme est en styles inline pour coller
 * au plus près du design source.
 */
const LANDING_CSS = `
.lp{font-family:${BODY};color:#475569;background:#fff;overflow-x:hidden;position:relative;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
.lp a{text-decoration:none;color:inherit;}
.lp ::selection{background:rgba(37,99,235,0.16);}

@keyframes lp-floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes lp-spinSlow{to{transform:rotate(360deg)}}
@keyframes lp-dashmove{to{stroke-dashoffset:0}}
@keyframes lp-pulseDot{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.8);opacity:0}100%{opacity:0}}
@keyframes lp-gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes lp-blobDrift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-20px) scale(1.07)}}

/* Liens de navigation */
.lp-navlink{transition:color .2s;}
.lp-navlink:hover{color:#0f172a;}
.lp-footlink{transition:color .2s;}
.lp-footlink:hover{color:#fff;}

/* Boutons */
.lp-btn-outline{transition:transform .2s,border-color .2s,box-shadow .2s;}
.lp-btn-outline:hover{transform:translateY(-2px);border-color:#cbd5e1;box-shadow:0 8px 18px rgba(2,32,71,0.06);}
.lp-btn-grad{transition:transform .2s,box-shadow .2s;}
.lp-btn-grad:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(37,99,235,0.34);}
.lp-btn-grad:active{transform:translateY(0) scale(.98);}

.lp-cta-grad{transition:transform .2s,box-shadow .2s;}
.lp-cta-grad:hover{transform:translateY(-3px);box-shadow:0 18px 38px rgba(37,99,235,0.36);}
.lp-cta-grad:active{transform:translateY(0) scale(.98);}
.lp-cta-outline{transition:transform .2s,border-color .2s,box-shadow .2s;}
.lp-cta-outline:hover{transform:translateY(-3px);border-color:#cbd5e1;box-shadow:0 12px 26px rgba(2,32,71,0.07);}

.lp-cta-white{transition:transform .2s,box-shadow .2s;}
.lp-cta-white:hover{transform:translateY(-3px);box-shadow:0 18px 38px rgba(2,32,71,0.28);}
.lp-cta-white:active{transform:translateY(0) scale(.98);}
.lp-cta-glass{transition:transform .2s,background .2s;}
.lp-cta-glass:hover{transform:translateY(-3px);background:rgba(255,255,255,0.22);}

/* Cartes fonctionnalités */
.lp-feature{transition:opacity .7s ${EASE},transform .7s ${EASE},box-shadow .35s ease,border-color .35s ease;}
.lp-feature:hover{transform:translateY(-8px);}
.lp-feature.lp-feature-blue:hover{box-shadow:0 26px 54px rgba(37,99,235,0.14);border-color:rgba(37,99,235,0.18);}
.lp-feature.lp-feature-teal:hover{box-shadow:0 26px 54px rgba(20,184,166,0.14);border-color:rgba(20,184,166,0.2);}
.lp-feature.lp-feature-indigo:hover{box-shadow:0 26px 54px rgba(79,70,229,0.14);border-color:rgba(79,70,229,0.18);}

@media (max-width:880px){
 .lp [data-hero]{grid-template-columns:1fr !important;text-align:center;}
 .lp [data-hero-cta]{justify-content:center !important;}
 .lp [data-hero-trust]{justify-content:center !important;}
 .lp [data-hero-visual]{display:none !important;}
 .lp [data-features]{grid-template-columns:1fr !important;}
 .lp [data-steps]{grid-template-columns:1fr !important;}
 .lp [data-nav-links]{display:none !important;}
 .lp [data-footer-grid]{grid-template-columns:1fr 1fr !important;}
}
@media (max-width:560px){
 .lp [data-stats]{grid-template-columns:1fr 1fr !important;}
 .lp [data-cta-buttons]{flex-direction:column;align-items:stretch;}
 .lp [data-desktop-only]{display:none !important;}
}
@media (prefers-reduced-motion:reduce){
 .lp *{animation:none !important;transition-duration:.001ms !important;}
}
`;

/** Style d'apparition au scroll (réécrit en `none` par l'effet client). */
const reveal = (delay = 0): React.CSSProperties => ({
  opacity: 0,
  transform: "translateY(26px)",
  transition: `opacity .7s ${EASE}, transform .7s ${EASE}`,
  transitionDelay: `${delay}s`,
});

/** Style commun aux couches du visuel hero (parallax). */
const depthLayer: React.CSSProperties = {
  position: "absolute",
  transform: "translate(var(--px,0px),var(--py,0px))",
  transition: "transform .25s ease-out",
};

/** Style du dégradé de marque appliqué au texte. */
const gradientText: React.CSSProperties = {
  background: "linear-gradient(120deg,#2563eb,#14b8a6)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "#2563eb",
};

/** Icône logo (éclair / battement cardiaque). */
function LogoMark({ size = 21, stroke = "#fff", width = 2.4 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

/** Flèche « → » des boutons d'action. */
function Arrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Icône « tableau de bord » (espace praticien). */
function DashboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

/**
 * Composant de page d'accueil publique.
 *
 * @returns La landing page complète.
 */
export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Animations pilotées en DOM direct (apparitions, compteurs, ombre du
  // header, parallax souris). Cf. design source « Landing Medical App ».
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const shown = new Set<number>();
    const countDone: Record<string, boolean> = {};
    const ckey = (el: Element) =>
      `${el.getAttribute("data-count")}|${el.getAttribute("data-suffix") || ""}|${
        el.getAttribute("data-prefix") || ""
      }`;

    const runCount = (el: HTMLElement) => {
      const k = ckey(el);
      const target = parseFloat(el.getAttribute("data-count") || "0");
      const suffix = el.getAttribute("data-suffix") || "";
      const prefix = el.getAttribute("data-prefix") || "";
      const fin = prefix + target + suffix;
      if (countDone[k]) {
        el.textContent = fin;
        return;
      }
      countDone[k] = true;
      if (reduce) {
        el.textContent = fin;
        return;
      }
      const dur = 1500;
      const start = performance.now();
      const stepFn = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(stepFn);
      };
      requestAnimationFrame(stepFn);
    };

    const check = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el, i) => {
        if (!shown.has(i)) {
          const rc = el.getBoundingClientRect();
          if (reduce || (rc.top < vh * 0.92 && rc.bottom > 0)) shown.add(i);
        }
        if (shown.has(i)) {
          el.style.setProperty("opacity", "1");
          el.style.setProperty("transform", "none");
        }
      });
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const rc = el.getBoundingClientRect();
        if (reduce || (rc.top < vh * 0.85 && rc.bottom > 0) || countDone[ckey(el)])
          runCount(el);
      });
    };

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    requestAnimationFrame(check);
    const t1 = setTimeout(check, 120);
    const t2 = setTimeout(check, 400);
    const t3 = setTimeout(check, 1200);

    // Ombre du header sticky au scroll
    const header = root.querySelector<HTMLElement>("[data-header]");
    const onScroll = () => {
      const s = window.scrollY > 8;
      if (header) {
        header.style.boxShadow = s ? "0 10px 34px rgba(2,32,71,0.08)" : "none";
        header.style.background = s
          ? "rgba(255,255,255,0.86)"
          : "rgba(255,255,255,0.6)";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Parallax souris léger sur le visuel du hero
    let onMove: ((ev: MouseEvent) => void) | null = null;
    if (!reduce) {
      const visual = root.querySelector<HTMLElement>("[data-hero-visual]");
      if (visual) {
        const layers = visual.querySelectorAll<HTMLElement>("[data-depth]");
        onMove = (ev: MouseEvent) => {
          const r = visual.getBoundingClientRect();
          if (!r.width) return;
          const dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
          const dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
          layers.forEach((el) => {
            const d = parseFloat(el.getAttribute("data-depth") || "0");
            el.style.setProperty("--px", `${(dx * d * 18).toFixed(1)}px`);
            el.style.setProperty("--py", `${(dy * d * 18).toFixed(1)}px`);
          });
        };
        window.addEventListener("mousemove", onMove, { passive: true });
      }
    }

    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      window.removeEventListener("scroll", onScroll);
      if (onMove) window.removeEventListener("mousemove", onMove);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="lp" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      {/* ============ HEADER ============ */}
      <header
        data-header
        data-reveal
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          background: "rgba(255,255,255,0.6)",
          borderBottom: "1px solid rgba(226,232,240,0.55)",
          transition:
            "box-shadow .35s ease,background .35s ease,opacity .6s ease,transform .6s ease",
          opacity: 0,
          transform: "translateY(-12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg,#2563eb,#14b8a6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px rgba(37,99,235,0.28)",
              }}
            >
              <LogoMark />
            </span>
            <span
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 18,
                color: "#0f172a",
                letterSpacing: "-.01em",
              }}
            >
              Medical App
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              data-nav-links
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                marginRight: 14,
              }}
            >
              <a
                href="#features"
                className="lp-navlink"
                style={{ fontWeight: 500, fontSize: 15, color: "#475569" }}
              >
                Fonctionnalités
              </a>
              <a
                href="#how"
                className="lp-navlink"
                style={{ fontWeight: 500, fontSize: 15, color: "#475569" }}
              >
                Comment ça marche
              </a>
            </div>
            <Link
              href="/dashboard"
              data-desktop-only
              className="lp-btn-outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 16px",
                borderRadius: 12,
                background: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: 14,
                border: "1px solid #e2e8f0",
              }}
            >
              Espace praticien
            </Link>
            <Link
              href="/book"
              className="lp-btn-grad"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 17px",
                borderRadius: 12,
                background: "linear-gradient(135deg,#2563eb,#14b8a6)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                boxShadow: "0 8px 18px rgba(37,99,235,0.26)",
              }}
            >
              Prendre rendez-vous
            </Link>
          </nav>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(1100px 520px at 78% -8%,#e0f2fe 0%,rgba(224,242,254,0) 60%),radial-gradient(900px 480px at 10% 10%,#f0fdfa 0%,rgba(240,253,250,0) 55%)",
            pointerEvents: "none",
          }}
        />
        <div
          data-hero
          style={{
            position: "relative",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "clamp(56px,7vw,108px) 24px clamp(64px,8vw,110px)",
            display: "grid",
            gridTemplateColumns: "1.05fr .95fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div>
            <div
              data-reveal
              style={{
                ...reveal(0),
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: 999,
                background: "#eff6ff",
                color: "#2563eb",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: ".01em",
                border: "1px solid #dbeafe",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#2563eb,#14b8a6)",
                  boxShadow: "0 0 0 4px rgba(37,99,235,0.12)",
                  flexShrink: 0,
                }}
              />
              Plateforme santé tout-en-un
            </div>
            <h1
              data-reveal
              style={{
                ...reveal(0.08),
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(36px,5.4vw,62px)",
                lineHeight: 1.04,
                letterSpacing: "-.025em",
                color: "#0f172a",
                margin: "22px 0 0",
              }}
            >
              Gérez votre cabinet médical en toute{" "}
              <span style={gradientText}>sérénité</span>
            </h1>
            <p
              data-reveal
              style={{
                ...reveal(0.16),
                fontSize: "clamp(17px,1.5vw,20px)",
                lineHeight: 1.6,
                color: "#475569",
                margin: "22px 0 0",
                maxWidth: 540,
              }}
            >
              La plateforme qui simplifie vos rendez-vous, vos patients et votre
              activité — en ligne, sécurisée et pensée pour les professionnels de
              santé.
            </p>
            <div
              data-reveal
              data-hero-cta
              style={{
                ...reveal(0.24),
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                marginTop: 32,
              }}
            >
              <Link
                href="/book"
                className="lp-cta-grad"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "15px 26px",
                  borderRadius: 15,
                  background: "linear-gradient(135deg,#2563eb,#14b8a6)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 16,
                  boxShadow: "0 12px 26px rgba(37,99,235,0.28)",
                }}
              >
                Prendre rendez-vous
                <Arrow />
              </Link>
              <Link
                href="/dashboard"
                className="lp-cta-outline"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "15px 26px",
                  borderRadius: 15,
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 16,
                  border: "1px solid #e2e8f0",
                }}
              >
                <DashboardIcon />
                Espace praticien
              </Link>
            </div>
            <div
              data-reveal
              data-hero-trust
              style={{
                ...reveal(0.32),
                display: "flex",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
                marginTop: 30,
                color: "#64748b",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Conforme RGPD &amp; HDS
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Disponible 24h/24
              </span>
            </div>
          </div>

          {/* Visuel hero animé (parallax) */}
          <div
            data-hero-visual
            data-reveal
            style={{
              opacity: 0,
              transform: "translateY(26px) scale(.98)",
              transition: `opacity .8s ${EASE}, transform .8s ${EASE}`,
              transitionDelay: ".2s",
              position: "relative",
              height: "clamp(440px,42vw,540px)",
            }}
          >
            <div
              data-depth=".6"
              style={{
                ...depthLayer,
                left: "-4%",
                top: "4%",
                width: 240,
                height: 240,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 30% 30%,#bfdbfe,#3b82f6)",
                filter: "blur(8px)",
                opacity: 0.45,
                transition: "transform .3s ease-out",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  animation: "lp-blobDrift 11s ease-in-out infinite",
                }}
              />
            </div>
            <div
              data-depth=".5"
              style={{
                ...depthLayer,
                right: "-6%",
                bottom: "0%",
                width: 280,
                height: 280,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 70% 70%,#99f6e4,#14b8a6)",
                filter: "blur(10px)",
                opacity: 0.4,
                transition: "transform .3s ease-out",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  animation: "lp-blobDrift 13s ease-in-out infinite 1.5s",
                }}
              />
            </div>

            {/* Cercle central « En temps réel » */}
            <div
              data-depth=".8"
              style={{
                ...depthLayer,
                left: "50%",
                top: "50%",
                width: "clamp(260px,26vw,330px)",
                height: "clamp(260px,26vw,330px)",
                marginLeft: "calc(clamp(260px,26vw,330px)/-2)",
                marginTop: "calc(clamp(260px,26vw,330px)/-2)",
                transition: "transform .3s ease-out",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "1.5px dashed rgba(37,99,235,0.22)",
                  animation: "lp-spinSlow 38s linear infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 34,
                  borderRadius: "50%",
                  border: "1.5px dashed rgba(20,184,166,0.22)",
                  animation: "lp-spinSlow 26s linear infinite reverse",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "50%",
                  width: 128,
                  height: 128,
                  margin: "-64px 0 0 -64px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 24px 60px rgba(2,32,71,0.14)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <svg
                  width="46"
                  height="46"
                  viewBox="0 0 120 40"
                  fill="none"
                  stroke="url(#lp-hg)"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <defs>
                    <linearGradient id="lp-hg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#2563eb" />
                      <stop offset="1" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M2 20h26l8-15 12 30 9-22 7 14 6-7h31"
                    pathLength={100}
                    strokeDasharray={100}
                    strokeDashoffset={100}
                    style={{ animation: "lp-dashmove 2.4s ease-out forwards .5s" }}
                  />
                </svg>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#0f172a",
                  }}
                >
                  En temps réel
                </span>
              </div>
            </div>

            {/* Carte flottante « Prochain RDV » */}
            <div data-depth="2.4" style={{ ...depthLayer, top: "6%", right: "0%" }}>
              <div
                style={{
                  animation: "lp-floaty 6s ease-in-out infinite",
                  background: "rgba(255,255,255,0.88)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 18px 44px rgba(2,32,71,0.12)",
                  borderRadius: 18,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 208,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="3" />
                    <path d="M3 10h18M8 2v4M16 2v4" />
                  </svg>
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: 600,
                      letterSpacing: ".02em",
                    }}
                  >
                    PROCHAIN RDV
                  </div>
                  <div
                    style={{
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#0f172a",
                    }}
                  >
                    Mar. 14 · 09:30
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#10b981",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                      Confirmé
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte flottante « Agenda du jour » */}
            <div data-depth="3" style={{ ...depthLayer, top: "34%", left: "-6%" }}>
              <div
                style={{
                  animation: "lp-floaty 7s ease-in-out infinite .8s",
                  background: "rgba(255,255,255,0.88)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 18px 44px rgba(2,32,71,0.12)",
                  borderRadius: 18,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#f0fdfa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#14b8a6",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#14b8a6",
                      top: 8,
                      right: 8,
                      animation: "lp-pulseDot 2.2s ease-out infinite",
                    }}
                  />
                  <LogoMark size={20} stroke="currentColor" width={2} />
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: 600,
                      letterSpacing: ".02em",
                    }}
                  >
                    AGENDA DU JOUR
                  </div>
                  <div
                    style={{
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#0f172a",
                    }}
                  >
                    12 consultations
                  </div>
                </div>
              </div>
            </div>

            {/* Pilule « Données chiffrées » */}
            <div data-depth="1.8" style={{ ...depthLayer, bottom: "8%", left: "8%" }}>
              <div
                style={{
                  animation: "lp-floaty 6.5s ease-in-out infinite 1.4s",
                  background: "rgba(255,255,255,0.88)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 18px 44px rgba(2,32,71,0.12)",
                  borderRadius: 16,
                  padding: "11px 15px",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#0f172a",
                  }}
                >
                  Données chiffrées
                </span>
              </div>
            </div>

            {/* Pilule « Patients suivis » */}
            <div data-depth="2.2" style={{ ...depthLayer, bottom: "2%", right: "8%" }}>
              <div
                style={{
                  animation: "lp-floaty 7.5s ease-in-out infinite .4s",
                  background: "rgba(255,255,255,0.88)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 18px 44px rgba(2,32,71,0.12)",
                  borderRadius: 16,
                  padding: "11px 15px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex" }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#60a5fa,#2563eb)",
                      border: "2px solid #fff",
                    }}
                  />
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#5eead4,#14b8a6)",
                      border: "2px solid #fff",
                      marginLeft: -9,
                    }}
                  />
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#a5b4fc,#6366f1)",
                      border: "2px solid #fff",
                      marginLeft: -9,
                    }}
                  />
                </div>
                <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>
                  Patients suivis
                </span>
              </div>
            </div>

            {/* Petits « + » décoratifs */}
            <div
              data-depth="4"
              style={{
                ...depthLayer,
                top: "24%",
                right: "30%",
                color: "#2563eb",
                opacity: 0.5,
              }}
            >
              <div style={{ animation: "lp-floaty 5s ease-in-out infinite" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </div>
            <div
              data-depth="3.4"
              style={{
                ...depthLayer,
                bottom: "30%",
                left: "34%",
                color: "#14b8a6",
                opacity: 0.5,
              }}
            >
              <div style={{ animation: "lp-floaty 6s ease-in-out infinite 1s" }}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section
        style={{
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
          background: "#fbfdff",
        }}
      >
        <div
          data-stats
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "clamp(40px,5vw,60px) 24px",
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 24,
          }}
        >
          {[
            {
              count: "100",
              suffix: "%",
              prefix: undefined as string | undefined,
              initial: "0%",
              label: "Prise de RDV en ligne",
              delay: 0,
            },
            {
              count: "24",
              suffix: "h/24",
              prefix: undefined,
              initial: "0h/24",
              label: "Réservation disponible",
              delay: 0.08,
            },
            {
              count: "2",
              suffix: " min",
              prefix: "< ",
              initial: "0 min",
              label: "Pour réserver un créneau",
              delay: 0.16,
            },
          ].map((s) => (
            <div
              key={s.label}
              data-reveal
              style={{
                ...reveal(s.delay),
                transition: `opacity .6s ${EASE}, transform .6s ${EASE}`,
                transitionDelay: `${s.delay}s`,
                transform: "translateY(22px)",
                textAlign: "center",
              }}
            >
              <div
                data-count={s.count}
                data-suffix={s.suffix}
                {...(s.prefix ? { "data-prefix": s.prefix } : {})}
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 800,
                  fontSize: "clamp(32px,3.6vw,46px)",
                  lineHeight: 1,
                  ...gradientText,
                }}
              >
                {s.initial}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
          <div
            data-reveal
            style={{
              ...reveal(0.24),
              transition: `opacity .6s ${EASE}, transform .6s ${EASE}`,
              transitionDelay: ".24s",
              transform: "translateY(22px)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: "clamp(32px,3.6vw,46px)",
                lineHeight: 1,
                ...gradientText,
              }}
            >
              RGPD
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              Conforme &amp; hébergement HDS
            </div>
          </div>
        </div>
      </section>

      {/* ============ FONCTIONNALITÉS ============ */}
      <section
        id="features"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "clamp(72px,9vw,120px) 24px",
        }}
      >
        <div
          data-reveal
          style={{
            ...reveal(0),
            transform: "translateY(24px)",
            textAlign: "center",
            maxWidth: 680,
            margin: "0 auto 56px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 999,
              background: "#f0fdfa",
              color: "#0d9488",
              fontWeight: 600,
              fontSize: 13,
              border: "1px solid #ccfbf1",
            }}
          >
            Fonctionnalités
          </div>
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(28px,3.6vw,44px)",
              lineHeight: 1.1,
              letterSpacing: "-.02em",
              color: "#0f172a",
              margin: "18px 0 0",
            }}
          >
            Tout votre cabinet, au même endroit
          </h2>
          <p
            style={{
              fontSize: "clamp(16px,1.4vw,19px)",
              lineHeight: 1.6,
              color: "#475569",
              margin: "16px 0 0",
            }}
          >
            Des outils pensés pour les professionnels de santé, simples à prendre
            en main et sécurisés.
          </p>
        </div>
        <div
          data-features
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 24,
          }}
        >
          {/* Carte 1 — Réservation en ligne */}
          <div
            data-reveal
            className="lp-feature lp-feature-blue"
            style={{
              ...reveal(0),
              transform: "translateY(28px)",
              background: "#fff",
              border: "1px solid #eef2f6",
              borderRadius: 24,
              padding: 32,
              boxShadow: "0 1px 2px rgba(2,32,71,0.04)",
            }}
          >
            <span
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
                boxShadow: "inset 0 0 0 1px rgba(37,99,235,0.08)",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path d="M3 10h18M8 2v4M16 2v4" />
                <path d="m9 16 2 2 4-4" />
              </svg>
            </span>
            <h3
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 21,
                color: "#0f172a",
                margin: "22px 0 0",
              }}
            >
              Réservation en ligne
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.62,
                color: "#475569",
                margin: "12px 0 0",
              }}
            >
              Vos patients réservent en quelques clics, 24h/24, avec
              confirmations et rappels automatiques pour réduire les oublis.
            </p>
          </div>

          {/* Carte 2 — Gestion des patients */}
          <div
            data-reveal
            className="lp-feature lp-feature-teal"
            style={{
              ...reveal(0.12),
              transform: "translateY(28px)",
              background: "#fff",
              border: "1px solid #eef2f6",
              borderRadius: 24,
              padding: 32,
              boxShadow: "0 1px 2px rgba(2,32,71,0.04)",
            }}
          >
            <span
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "linear-gradient(135deg,#f0fdfa,#ccfbf1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0d9488",
                boxShadow: "inset 0 0 0 1px rgba(20,184,166,0.08)",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <h3
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 21,
                color: "#0f172a",
                margin: "22px 0 0",
              }}
            >
              Gestion des patients
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.62,
                color: "#475569",
                margin: "12px 0 0",
              }}
            >
              Dossiers centralisés, historique des consultations et coordonnées
              au même endroit, dans un environnement sécurisé.
            </p>
          </div>

          {/* Carte 3 — Tableau de bord */}
          <div
            data-reveal
            className="lp-feature lp-feature-indigo"
            style={{
              ...reveal(0.24),
              transform: "translateY(28px)",
              background: "#fff",
              border: "1px solid #eef2f6",
              borderRadius: 24,
              padding: 32,
              boxShadow: "0 1px 2px rgba(2,32,71,0.04)",
            }}
          >
            <span
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "linear-gradient(135deg,#eef2ff,#e0e7ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4f46e5",
                boxShadow: "inset 0 0 0 1px rgba(79,70,229,0.08)",
              }}
            >
              <DashboardIcon />
            </span>
            <h3
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 21,
                color: "#0f172a",
                margin: "22px 0 0",
              }}
            >
              Tableau de bord
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.62,
                color: "#475569",
                margin: "12px 0 0",
              }}
            >
              Vue d&apos;ensemble de votre activité : agenda du jour,
              statistiques et suivi en temps réel, accessibles d&apos;un coup
              d&apos;œil.
            </p>
          </div>
        </div>
      </section>

      {/* ============ COMMENT ÇA MARCHE ============ */}
      <section
        id="how"
        style={{
          background: "linear-gradient(180deg,#fbfdff,#f1f7fd)",
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "clamp(72px,9vw,120px) 24px",
          }}
        >
          <div
            data-reveal
            style={{
              ...reveal(0),
              transform: "translateY(24px)",
              textAlign: "center",
              maxWidth: 640,
              margin: "0 auto 60px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: 999,
                background: "#eff6ff",
                color: "#2563eb",
                fontWeight: 600,
                fontSize: 13,
                border: "1px solid #dbeafe",
              }}
            >
              Comment ça marche
            </div>
            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(28px,3.6vw,44px)",
                lineHeight: 1.1,
                letterSpacing: "-.02em",
                color: "#0f172a",
                margin: "18px 0 0",
              }}
            >
              Opérationnel en 3 étapes
            </h2>
          </div>
          <div
            data-steps
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 24,
            }}
          >
            {[
              {
                n: "01",
                title: "Créez votre espace",
                text: "Configurez votre cabinet, vos motifs de consultation et vos disponibilités en quelques minutes.",
                delay: 0,
              },
              {
                n: "02",
                title: "Partagez votre lien",
                text: "Vos patients accèdent à votre page de réservation en ligne et choisissent leur créneau en autonomie.",
                delay: 0.12,
              },
              {
                n: "03",
                title: "Gérez tout au même endroit",
                text: "Rendez-vous, patients et statistiques pilotés depuis un tableau de bord unique et clair.",
                delay: 0.24,
              },
            ].map((step) => (
              <div
                key={step.n}
                data-reveal
                style={{
                  ...reveal(step.delay),
                  transform: "translateY(28px)",
                  background: "#fff",
                  border: "1px solid #eef2f6",
                  borderRadius: 22,
                  padding: 30,
                  boxShadow: "0 2px 6px rgba(2,32,71,0.04)",
                }}
              >
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#fff",
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    background: "linear-gradient(135deg,#2563eb,#14b8a6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 18px rgba(37,99,235,0.25)",
                  }}
                >
                  {step.n}
                </div>
                <h3
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 19,
                    color: "#0f172a",
                    margin: "20px 0 0",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "#475569",
                    margin: "10px 0 0",
                  }}
                >
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "clamp(64px,8vw,110px) 24px",
        }}
      >
        <div
          data-reveal
          style={{
            opacity: 0,
            transform: "translateY(28px)",
            transition: `opacity .8s ${EASE}, transform .8s ${EASE}`,
            position: "relative",
            overflow: "hidden",
            borderRadius: 32,
            padding: "clamp(48px,6vw,84px) clamp(28px,5vw,72px)",
            background:
              "linear-gradient(120deg,#1d4ed8,#2563eb,#0d9488,#14b8a6)",
            backgroundSize: "200% 200%",
            animation: "lp-gradientShift 14s ease infinite",
            textAlign: "center",
            boxShadow: "0 30px 70px rgba(37,99,235,0.28)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -30,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: -20,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <h2
            style={{
              position: "relative",
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(28px,3.8vw,48px)",
              lineHeight: 1.1,
              letterSpacing: "-.02em",
              color: "#fff",
              margin: "0 auto",
              maxWidth: 760,
            }}
          >
            Prêt à simplifier la gestion de votre cabinet ?
          </h2>
          <p
            style={{
              position: "relative",
              fontSize: "clamp(16px,1.5vw,19px)",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.9)",
              margin: "18px auto 0",
              maxWidth: 560,
            }}
          >
            Lancez votre espace dès aujourd&apos;hui ou prenez votre premier
            rendez-vous en ligne.
          </p>
          <div
            data-cta-buttons
            style={{
              position: "relative",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 14,
              marginTop: 34,
            }}
          >
            <Link
              href="/book"
              className="lp-cta-white"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "15px 28px",
                borderRadius: 15,
                background: "#fff",
                color: "#1d4ed8",
                fontWeight: 700,
                fontSize: 16,
                boxShadow: "0 12px 28px rgba(2,32,71,0.2)",
              }}
            >
              Prendre rendez-vous
              <Arrow />
            </Link>
            <Link
              href="/dashboard"
              className="lp-cta-glass"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "15px 28px",
                borderRadius: 15,
                background: "rgba(255,255,255,0.14)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 16,
                border: "1px solid rgba(255,255,255,0.4)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            >
              Espace praticien
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: "#0f172a", color: "#cbd5e1" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "clamp(48px,6vw,72px) 24px 0",
          }}
        >
          <div
            data-footer-grid
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
              gap: 40,
            }}
          >
            <div>
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: "linear-gradient(135deg,#2563eb,#14b8a6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LogoMark size={20} />
                </span>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 18,
                    color: "#fff",
                  }}
                >
                  Medical App
                </span>
              </Link>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "#94a3b8",
                  margin: "18px 0 0",
                  maxWidth: 320,
                }}
              >
                Application single-tenant — une instance dédiée par cabinet, sur
                un hébergement de données de santé (HDS) certifié.
              </p>
            </div>
            <div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#fff",
                  marginBottom: 16,
                }}
              >
                Produit
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                  fontSize: 14,
                }}
              >
                <a href="#features" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Fonctionnalités
                </a>
                <a href="#how" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Comment ça marche
                </a>
                <Link href="/book" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Prendre rendez-vous
                </Link>
                <Link
                  href="/dashboard"
                  className="lp-footlink"
                  style={{ color: "#94a3b8" }}
                >
                  Espace praticien
                </Link>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#fff",
                  marginBottom: 16,
                }}
              >
                Ressources
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                  fontSize: 14,
                }}
              >
                <a href="#" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Centre d&apos;aide
                </a>
                <a href="#" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Guide de démarrage
                </a>
                <a href="#" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Contact
                </a>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#fff",
                  marginBottom: 16,
                }}
              >
                Légal
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                  fontSize: 14,
                }}
              >
                <a href="#" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Confidentialité (RGPD)
                </a>
                <a href="#" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Conditions d&apos;utilisation
                </a>
                <a href="#" className="lp-footlink" style={{ color: "#94a3b8" }}>
                  Mentions légales
                </a>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              marginTop: 48,
              padding: "24px 0",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            <span>© 2026 Medical App. Tous droits réservés.</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#14b8a6"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Données chiffrées &amp; hébergement HDS
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
