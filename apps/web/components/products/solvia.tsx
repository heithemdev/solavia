"use client";

import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import SolaviaPurchase from "./solavia-purchase";
import SolaviaDetails from "./solavia-details";
import { useStorefront } from "./storefront-provider";
import WhatsAppIcon from "./whatsapp-icon";
import { watchSectionNavigation } from "./section-navigation";

const assets = "/images/solavia/";
const heroAssets = `${assets}hero/`;

function getBottleFit(heroHeight: number, headerBottom: number, stageTop: number, stageWidth: number, stageHeight: number) {
  const imageSize = Math.min(stageWidth, stageHeight);
  // Visible alpha bounds of hero-product.webp exclude its transparent square padding.
  const imageTop = (stageHeight - imageSize) / 2 + imageSize * 0.051;
  const imageHeight = imageSize * 0.906;
  const top = headerBottom + 16;
  const available = Math.max(1, heroHeight - top - 16);
  const scale = Math.min(1, available / imageHeight);
  const targetTop = top + (available - imageHeight * scale) / 2;
  return { shift: targetTop - stageTop - imageTop * scale, scale, top: targetTop };
}

export default function Solvia() {
  const {product}=useStorefront();
  const heroRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const headerShellRef = useRef<HTMLDivElement>(null);
  const headerMarkerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const atmosphereRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const header = headerRef.current;
    const headerShell = headerShellRef.current;
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!hero || !header || !headerShell || !stage || !section) return;
    const stopNavigation = watchSectionNavigation(header, hero);

    const desktop = window.matchMedia("(min-width:801px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion:reduce)");
    const atmosphere = atmosphereRef.current;
    let disposed = false;
    let sectionVisible = false;
    const shadowImage = new window.Image();
    shadowImage.src = `${assets}forest-shadows.webp`;
    const shadowReady = shadowImage.decode().catch(() => {});
    const entranceObserver = new IntersectionObserver(([entry]) => {
      if (!entry || reducedMotion.matches) return;
      if (entry.isIntersecting && entry.intersectionRatio >= .12) {
        sectionVisible = true;
        const roots = section.querySelector<HTMLImageElement>(".ingredients-decor img");
        Promise.all([shadowReady, roots?.decode().catch(() => {})]).then(() => {
          if (disposed || !sectionVisible) return;
          atmosphere?.classList.add("has-entered", "is-animated");
          section.classList.add("is-entered");
        });
      } else if (!entry.isIntersecting) {
        sectionVisible = false;
        atmosphere?.classList.remove("is-animated");
        section.classList.remove("is-entered");
      }
    }, { threshold: [0, .12], rootMargin: "0px 0px -6% 0px" });
    entranceObserver.observe(section);
    let frame = 0;
    let start = 0;
    let distance = 1;
    let fit = { shift: 0, scale: 1, top: 0 };
    let previous = -1;

    const headerObserver = new IntersectionObserver(([entry]) => {
      if (entry) headerShell.dataset.solid = String(entry.boundingClientRect.top < 0);
    });
    if (headerMarkerRef.current) headerObserver.observe(headerMarkerRef.current);

    function render() {
      frame = 0;
      if (!desktop.matches) return;
      const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (window.scrollY - start) / distance));
      if (progress === previous) return;
      previous = progress;
      const eased = progress * progress * (3 - 2 * progress);
      stage!.style.setProperty("--bottle-shift", `${fit.shift * eased}px`);
      stage!.style.setProperty("--bottle-scale", String(1 + (fit.scale - 1) * eased));
    }

    function measure() {
      cancelAnimationFrame(frame);
      frame = 0;
      start = hero!.getBoundingClientRect().top + window.scrollY;
      if (!desktop.matches) {
        stage!.style.removeProperty("--bottle-shift");
        stage!.style.removeProperty("--bottle-scale");
        render();
        return;
      }
      fit = getBottleFit(hero!.clientHeight, header!.offsetTop + header!.offsetHeight, stage!.offsetTop, stage!.clientWidth, stage!.clientHeight);
      // Spread the retreat over more scrolling, still finishing before section two is half revealed.
      const halfway = section!.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 - start;
      distance = Math.max(1, Math.min(fit.top * 2.2, halfway));
      previous = -1;
      render();
    }

    function onScroll() {
      if (!desktop.matches || (previous === 1 && window.scrollY >= start + distance) || (previous === 0 && window.scrollY <= start)) return;
      if (!frame) frame = requestAnimationFrame(render);
    }

    const observer = new ResizeObserver(measure);
    [hero, header, stage, section].forEach((element) => observer.observe(element));
    desktop.addEventListener("change", measure);
    reducedMotion.addEventListener("change", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      disposed = true;
      stopNavigation();
      entranceObserver.disconnect();
      observer.disconnect();
      headerObserver.disconnect();
      cancelAnimationFrame(frame);
      desktop.removeEventListener("change", measure);
      reducedMotion.removeEventListener("change", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <main className="solavia" dir="rtl">
      <style>{`
        html { scroll-behavior:smooth; }
        @media (prefers-reduced-motion:reduce) { html { scroll-behavior:auto; } }
        .solavia { --cream:#fff4d9; --body-size:18px; --lead-size:28px; --price-size:56px; position:relative; isolation:isolate; color:var(--cream); background:#173b2b; font-family:var(--font-body),sans-serif; }
        .page-atmosphere { position:absolute; z-index:1; inset:0; pointer-events:none; }
        .atmosphere-texture { position:sticky; top:0; height:100svh; contain:paint; background:radial-gradient(ellipse at 25% 48%,#fff9df10,transparent 65%); }
        .ingredients-atmosphere { position:absolute; inset:-120px 0 0; z-index:1; pointer-events:none; overflow:clip; }
        .atmosphere-shadow { position:sticky; top:96px; height:calc(100svh - 96px); max-height:100%; opacity:0; transform-origin:50% 50%; background:url('/images/solavia/forest-shadows.webp') right top/100% 100% no-repeat; mask-image:radial-gradient(ellipse at 100% 0,#000 20%,#000b 54%,transparent 86%); transform:scaleX(-1); pointer-events:none; }
        .atmosphere-shadow.has-entered { opacity:.3; }
        .atmosphere-shadow.is-animated { animation:ingredients-forest-enter 1.95s cubic-bezier(.22,.61,.36,1) both; }
        @keyframes ingredients-forest-enter { from { opacity:0; translate:-85px -90px; rotate:12deg; } to { opacity:.3; translate:0 0; rotate:0deg; } }
        .hero-wrap { position:relative; }
        .hero { position:relative; height:100svh; overflow:clip; background:#173b2b url('/images/solavia/hero/hero-forest-texture.webp') center/cover; }
        .hero::before { content:''; position:absolute; inset:0; pointer-events:none; background:linear-gradient(90deg,#0c261a50,transparent 40%,#0c261a50); }
        .site-header { position:fixed; z-index:20; inset:0 0 auto; background:transparent; border-bottom:1px solid transparent; transition:background-color .25s,border-color .25s; }
        .site-header[data-solid=true] { background:#173b2be8; border-bottom-color:#f0e9d126; backdrop-filter:blur(10px) saturate(115%); -webkit-backdrop-filter:blur(10px) saturate(115%); }
        .ingredients,#ingredients { scroll-margin-top:96px; }
        .header { position:relative; z-index:6; width:calc(100% - 96px); max-width:1500px; height:96px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:24px; }
        .wordmark { display:block; flex-shrink:0; width:174px; }
        .brand-image { display:block; width:100%; height:auto; }
        .section-nav { position:absolute; left:-28px; right:0; width:max-content; margin-inline:auto; display:flex; align-items:center; gap:24px; white-space:nowrap; }
        .section-nav a,.header-contact { font-size:var(--body-size); font-weight:500; color:var(--cream); text-decoration:none; }
        .section-nav a { position:relative; padding:10px 0; font-family:var(--font-heading),sans-serif; font-weight:500; }
        .section-nav a::after { content:''; position:absolute; left:0; right:0; bottom:4px; height:1.5px; background:currentColor; transform:scaleX(0); transform-origin:right; transition:transform .26s cubic-bezier(.22,.61,.36,1); }
        .section-nav a:hover::after,.section-nav a[aria-current=location]::after { transform:scaleX(1); }
        @media (prefers-reduced-motion:reduce) { .section-nav a::after { transition:none; } }
        .nav-short { display:none; }
        .header-contact { display:flex; align-items:center; justify-content:center; gap:10px; padding:11px 22px; border:1px solid #f0e9d180; border-radius:20px; background:transparent; transition:background-color .15s,color .15s; }
        .header-contact:hover { background:#f0e9d1; color:#173b2b; }
        .hero-content { position:absolute; inset:0; z-index:3; }
        .heading { position:absolute; z-index:1; top:15%; left:3%; right:3%; text-align:center; }
        .product-name { font-family:Georgia,'Times New Roman',serif; font-size:clamp(110px,14vw,230px); font-weight:400; line-height:1; letter-spacing:-.055em; margin:0; white-space:nowrap; color:#fff4d9; text-shadow:0 12px 24px #061b1470; }
        .product-name span { font-size:1em; }
        .product-stage { position:absolute; z-index:2; top:16%; left:50%; width:min(90vw,1120px); height:115svh; transform:translate3d(-50%,var(--bottle-shift,0px),0) scale(var(--bottle-scale,1)); transform-origin:50% 0; pointer-events:none; }
        .bottle { position:absolute; inset:0; }
        .bottle img { object-fit:contain; }
        .product-shadow { display:none; }
        .hero-description { position:absolute; z-index:4; top:53%; right:12%; width:min(22vw,270px); }
        .hero-description p { font-size:var(--body-size); font-weight:400; line-height:1.7; margin:0; }
        .hero-description .slogan { font-family:var(--font-heading),sans-serif; font-size:var(--lead-size); font-weight:500; line-height:1.5; margin-bottom:10px; }
        .hero-description strong { font-weight:500; }
        .offer { position:absolute; z-index:4; top:55%; left:10.5%; width:min(24vw,310px); text-align:center; }
        .price { display:flex; justify-content:center; align-items:baseline; gap:10px; margin:0; line-height:1.15; }
        .price bdi { font-family:var(--font-heading),sans-serif; font-size:var(--price-size); font-weight:500; letter-spacing:-2px; font-variant-numeric:lining-nums tabular-nums; }
        .price span,.pack-size,.order-button { font-size:var(--body-size); }
        .pack-size { margin:10px 0 22px; }
        .order-button { display:flex; align-items:center; justify-content:center; gap:10px; min-height:58px; padding:14px 22px; color:#fff8ed; background:#c14e34; border:1px solid transparent; border-radius:22px; corner-shape:squircle; text-decoration:none; font-weight:500; transition:background-color .15s; }
        .order-button:hover { background:#ac432d; }
        .stock-note { margin:12px 0 0; font-size:var(--body-size); color:var(--cream); }
        .filter-definitions { position:absolute; pointer-events:none; }
        .botanical { position:absolute; z-index:2; pointer-events:none; }
        .botanical img { object-fit:contain; filter:url(#hero-foliage-alpha) brightness(.8) saturate(.85); }
        .botanical-left { --turn:15deg; --entry-x:-70vw; width:46vw; height:86%; left:-27vw; bottom:-20%; transform:rotate(var(--turn)); }
        .botanical-right { --turn:-17deg; --entry-x:70vw; width:44vw; height:84%; right:-27vw; bottom:-24%; transform:rotate(var(--turn)); }
        .solavia a:focus-visible { outline:2px solid #e2be72; outline-offset:5px; }
        .header,.bottle,.botanical,.reveal { opacity:0; }
        .header { animation:header-enter .38s .14s ease-out both; }
        @keyframes header-enter { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .bottle { animation:bottle-enter 1s .04s cubic-bezier(.16,1,.3,1) both; }
        .botanical { animation:foliage-enter 1.04s .04s cubic-bezier(.16,1,.3,1) both; }
        .heading { animation:text-enter .46s .28s ease-out both; }
        .hero-description { animation:text-enter .4s .6s ease-out both; }
        .offer { animation:text-enter .4s .68s ease-out both; }
        @keyframes bottle-enter { from { opacity:0; transform:translate3d(0,100svh,0) scale(.94); } to { opacity:1; transform:translate3d(0,0,0) scale(1); } }
        @keyframes foliage-enter { from { opacity:0; transform:translate3d(var(--entry-x),24vh,0) rotate(calc(var(--turn) - 12deg)); } to { opacity:1; transform:translate3d(0,0,0) rotate(var(--turn)); } }
        @keyframes text-enter { from { opacity:0; transform:translate3d(0,12px,0); } to { opacity:1; transform:translate3d(0,0,0); } }
        @media (min-width:801px) and (max-width:1100px) { .header { width:calc(100% - 48px); } .wordmark { width:124px; } .section-nav { gap:16px; } .section-nav a { font-size:15px; } .header-contact { padding:10px 15px; font-size:16px; } .hero-description { right:6%; width:23vw; } .offer { left:6%; width:24vw; } .solavia { --lead-size:24px; --price-size:48px; } }
        @media (max-width:800px) {
          .solavia { --body-size:16px; --lead-size:22px; --price-size:34px; }
          .hero { height:auto; min-height:100svh; overflow:clip; padding-top:112px; }
          .ingredients,#ingredients { scroll-margin-top:112px; }
          .header { width:calc(100% - 36px); height:112px; padding:15px 0 0; gap:8px; align-content:start; flex-wrap:wrap; }
          .site-header[data-solid=true] { background:linear-gradient(115deg,#173b2bfa,#173b2bf2); backdrop-filter:none; -webkit-backdrop-filter:none; }
          .wordmark { width:124px; }
          .header-contact { gap:8px; padding:9px 14px; border-radius:18px; }
          .section-nav { position:relative; left:-5px; right:auto; order:3; flex:0 0 auto; width:max-content; max-width:100%; margin:0 auto; min-width:0; overflow-x:auto; overscroll-behavior-x:contain; scrollbar-width:none; justify-content:flex-start; gap:12px; }
          .section-nav::-webkit-scrollbar { display:none; }
          .section-nav a { padding:9px 0; font-size:16px; }
          .section-nav .nav-full { display:none; }
          .section-nav .nav-short { display:inline; }
          .hero-content { position:relative; inset:auto; display:flex; flex-direction:column; padding:0 24px 36px; }
          .heading { position:relative; order:1; top:auto; left:auto; right:auto; margin:8px 0 16px; }
          .product-name { font-size:clamp(60px,16.8vw,132px); letter-spacing:-.06em; }
          .product-stage { position:relative; order:0; top:auto; left:auto; width:100%; height:clamp(380px,50svh,460px); transform:none; margin-top:12px; }
          .bottle { inset:-6% -25%; }
          .hero-description { position:relative; order:2; top:auto; bottom:auto; right:auto; left:auto; width:100%; max-width:340px; margin:0 auto; text-align:center; }
          .hero-description .slogan { margin-bottom:6px; }
          .offer { position:relative; order:3; top:auto; bottom:auto; left:auto; right:auto; width:100%; max-width:390px; margin:22px auto 0; display:grid; grid-template-columns:1fr 1fr; align-items:center; column-gap:18px; text-align:right; }
          .price { grid-column:2; grid-row:1; justify-content:center; gap:7px; }
          .price bdi { letter-spacing:-1px; }
          .pack-size { grid-column:2; grid-row:2; }
          .order-button { grid-column:1; grid-row:1; padding:13px; min-height:58px; gap:8px; }
          .stock-note { grid-column:1; grid-row:2; }
          .pack-size,.stock-note { margin:10px 0 0; font-size:14px; line-height:1.5; text-align:center; }
          .botanical-left { width:110vw; height:450px; left:-68vw; bottom:auto; top:155px; }
          .botanical-right { width:108vw; height:440px; right:-66vw; bottom:auto; top:205px; }
        }
        @media (max-width:360px) { .section-nav { gap:10px; } .section-nav a { font-size:15px; } .header { width:calc(100% - 28px); } }
        @media (min-width:801px) and (max-height:500px) { .header { height:74px; } .heading { top:22%; } .hero-description,.offer { top:51%; } .solavia { --lead-size:22px; --price-size:38px; --body-size:16px; } }
        .hero-botanicals { position:absolute; inset:0; overflow:clip; z-index:2; pointer-events:none; }
        .cream-flow { position:relative; background:#f0e9d1; color:#173b2b; }
        .ingredients { --section-title-size:32px; --section-body-size:19px; position:relative; z-index:2; isolation:isolate; overflow:clip; min-height:100svh; }
        .ingredients-inner { z-index:1; width:min(1240px,calc(100% - 112px)); min-height:100svh; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; padding:70px 0; }
        .ingredients-copy { position:relative; z-index:3; grid-column:1; display:flex; flex-direction:column; align-items:stretch; gap:12px; max-width:470px; margin-inline-start:120px; text-align:right; letter-spacing:normal; }
        .ingredients-copy h2 { font-family:var(--font-heading),sans-serif; font-size:var(--section-title-size); font-weight:500; line-height:1.45; margin:0; }
        .ingredients-copy p { font-family:var(--font-body),sans-serif; font-size:var(--section-body-size); font-weight:500; line-height:1.75; margin:0; }
        .ingredients-art { position:absolute; inset:0; pointer-events:none; direction:ltr; }
        .ingredients-art figure { position:absolute; margin:0; }
        .botanical-photo { top:0; bottom:0; left:0; width:26%; }
        .capsules-photo { top:14%; left:13%; width:33%; height:78%; pointer-events:auto; }
        .ingredients-art img { object-fit:cover; }
        .capsules-photo img { object-position:35% center; }
        .ingredients-label-view { position:absolute; inset:0; overflow:hidden; background:#e9e0cb; opacity:0; transition:opacity .22s ease; }
        .capsules-photo .ingredients-label-photo { position:absolute; width:200%; height:170%; max-width:none; left:50%; top:50%; transform:translate(-50%,-60%); object-fit:contain; object-position:center; }
        @media (min-width:801px) {
          .capsules-photo:focus-visible { outline:2px solid #173b2b; outline-offset:5px; }
          .capsules-photo:focus-visible .ingredients-label-view { opacity:1; }
        }
        @media (min-width:801px) and (hover:hover) and (pointer:fine) {
          .capsules-photo:hover .ingredients-label-view { opacity:1; }
        }
        .ingredients-decor { position:absolute; z-index:3; width:170px; height:255px; top:30px; right:0; opacity:0; pointer-events:none; }
        .ingredients-decor img { object-fit:contain; opacity:.8; }
        .ingredients.is-entered .ingredients-decor { animation:ingredients-root-enter 1.95s cubic-bezier(.22,.61,.36,1) both; }
        @keyframes ingredients-root-enter { from { opacity:0; translate:22px -28px; rotate:-6deg; } to { opacity:1; translate:0 0; rotate:0deg; } }
        @media (min-width:801px) and (max-width:1100px) { .ingredients { --section-title-size:32px; } .ingredients-inner { width:calc(100% - 64px); gap:46px; padding-top:70px; } .ingredients-copy { margin-inline-start:140px; } }
        @media (max-width:800px) {
          .ingredients { --section-title-size:25px; --section-body-size:18px; min-height:0; }
          .atmosphere-shadow { top:112px; height:calc(100svh - 112px); }
          .ingredients-inner { width:100%; min-height:0; padding:28px 28px 48px; display:block; }
          .ingredients-art { display:none; }
          .ingredients-copy { padding:0; margin:0 auto; max-width:380px; gap:12px; align-items:center; text-align:center; }
          .ingredients-decor { display:block; z-index:1; width:160px; height:240px; top:4px; right:0; }
          .ingredients-decor img { opacity:.8; }
        }
        @media (max-width:360px) {
          .ingredients-inner { padding:24px 26px 36px; }
        }
        @media (prefers-reduced-motion:reduce) { .header,.bottle,.botanical,.reveal { animation:none; opacity:1; } .atmosphere-shadow { animation:none; opacity:.3; } .ingredients-decor { opacity:1; } .ingredients.is-entered .ingredients-decor { animation:none; } .order-button,.ingredients-label-view { transition:none; } }
      `}</style>
      <div className="page-atmosphere" aria-hidden="true"><div className="atmosphere-texture" /></div>
      <div className="site-header" ref={headerShellRef} data-solid="true">
        <header className="header" ref={headerRef}>
          <a className="wordmark" href="/" aria-label="سولافيا، الصفحة الرئيسية">
            <svg viewBox="230 220 620 220" role="img" aria-label="Solavia" className="brand-image">
              <defs>
                <filter id="solavia-blue-removal" colorInterpolationFilters="sRGB">
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1.2 0 0 0 -0.2" />
                </filter>
              </defs>
              <image href={`${assets}logo-source.webp`} width="1067" height="683" filter="url(#solavia-blue-removal)" />
            </svg>
          </a>
          <nav className="section-nav" aria-label="أقسام الصفحة">
            <a href="#about-shaya"><span className="nav-full">ما هو </span><span className="nav-short">عن </span><bdi lang="en">SHAYA BIO</bdi><span className="nav-full">؟</span></a>
            <a href="#purchase">اطلب</a>
            <a href="#promises"><span className="nav-full">ما ستحصل عليه</span><span className="nav-short">وعدنا لك</span></a>
            <a href="#faq"><span className="nav-full">الأسئلة الشائعة</span><span className="nav-short">الأسئلة</span></a>
            <a href="#social">حساباتنا</a>
          </nav>
          <a className="header-contact" href="https://wa.me/213792729391" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} />
            <span>تواصل معنا</span>
          </a>
        </header>
      </div>
      <div className="hero-wrap">
      <section className="hero" ref={heroRef} aria-labelledby="hero-title">
        <div ref={headerMarkerRef} aria-hidden="true" style={{ position: "absolute", top: "25%", width: 1, height: 1, pointerEvents: "none" }} />

        <div className="hero-botanicals" aria-hidden="true">
        <svg className="filter-definitions" width="0" height="0" aria-hidden="true">
          <defs>
            <filter id="hero-foliage-alpha" colorInterpolationFilters="sRGB">
              <feComponentTransfer><feFuncA type="linear" slope="1.2" intercept="-0.2" /></feComponentTransfer>
            </filter>
          </defs>
        </svg>
        <div className="botanical botanical-left" aria-hidden="true">
          <Image src={`${heroAssets}hero-ashwagandha-full.webp`} alt="" fill unoptimized loading="eager" sizes="(max-width: 800px) 110vw, 46vw" />
        </div>
        <div className="botanical botanical-right" aria-hidden="true">
          <Image src={`${heroAssets}hero-melissa-full.webp`} alt="" fill unoptimized loading="eager" sizes="(max-width: 800px) 108vw, 44vw" />
        </div>

        </div>

        <div className="hero-content">
          <div className="heading reveal">
            <h1 id="hero-title" className="product-name" lang="en" dir="ltr">SHAYA <span>BIO</span></h1>
          </div>

          <div className="product-stage" ref={stageRef}>
            <div className="product-shadow" aria-hidden="true" />
            <div className="bottle">
              <Image
                src={`${heroAssets}hero-product.webp`}
                alt="SHAYA BIO من سولافيا، مكمل غذائي بمستخلصات نباتية، عبوة 60 كبسولة"
                fill priority unoptimized sizes="(max-width: 800px) 700px, 900px"
              />
            </div>
          </div>

          <div className="hero-description reveal" id="hero-ingredients">
            <p className="slogan">هدوء أكثر وسط ضغط اليوم</p>
            <p><strong>كبسولات مضادّة للتوتر</strong></p>
          </div>

          <div className="offer reveal" id="hero-order">
            <p className="price" style={{minHeight:"1.2em"}}>{product&&<><bdi>{(product.priceCentimes/100).toLocaleString("en-DZ")}</bdi><span>دج</span></>}</p>
            <p className="pack-size">عبوة من 60 كبسولة</p>
            <a className="order-button" href="#purchase">
              <ShoppingBag size={19} strokeWidth={1.5} /><span>اطلب عبوتك</span>
            </a>
            <p className="stock-note" style={{minHeight:"1.7em"}}>{product&&<>باقي <bdi>{product.stock}</bdi> عبوات</>}</p>
          </div>
        </div>
      </section>
      </div>
      <div className="cream-flow">
      <div className="ingredients-atmosphere" aria-hidden="true"><div className="atmosphere-shadow" ref={atmosphereRef} /></div>
      <section className="ingredients" ref={sectionRef} id="about-shaya" aria-labelledby="ingredients-title">
        <div className="ingredients-decor" aria-hidden="true"><Image src={`${assets}ingredients/root-pieces.webp`} alt="" fill unoptimized sizes="(max-width: 800px) 160px, 170px" /></div>
        <div className="ingredients-inner">
        <div className="ingredients-art">
          <figure className="botanical-photo"><Image src={`${assets}ingredients/fresh-melissa-scene.webp`} alt="أوراق مليسة خضراء طازجة بجانب قماش كتاني" fill unoptimized sizes="26vw" /></figure>
          <figure className="capsules-photo" tabIndex={0} aria-label="صورة العبوة، مرّر المؤشر أو ركّز لعرض ملصق المكوّنات">
            <Image className="capsules-front-photo" src={`${assets}ingredients/open-capsules.webp`} alt="عبوة SHAYA BIO مفتوحة مع كبسولات بجانبها" fill unoptimized sizes="33vw" />
            <div className="ingredients-label-view"><Image className="ingredients-label-photo" src={`${assets}ingredients/ingredients-label.webp`} alt="مكوّنات كل كبسولة: Ashwagandha 200 mg، Millepertuis 150 mg، Mélisse 120 mg، Pyllium 100 mg، Beurre de Karité 30 mg" width={1254} height={1254} unoptimized sizes="66vw" /></div>
          </figure>
        </div>
          <div className="ingredients-copy" id="ingredients">
            <h2 id="ingredients-title">للاسترخاء وهدوء البال</h2>
            <p className="ingredients-intro"><bdi lang="en">SHAYA BIO</bdi> مكمّل غذائي يُحضّر في مختبر، بمستخلصات الأشواغاندا والمليسة ونبتة سانت جون لدعم الاسترخاء والتوازن النفسي</p>
            <p className="ingredients-body">قد تساعد الأشواغاندا على تخفيف الشعور بالتوتر وتحسين جودة النوم، وتُستخدم المليسة تقليديًا للتهدئة والمساعدة على النوم</p>
            <p className="ingredients-body">حين تهدأ، تمنح نفسك وقتًا للتفكير قبل القرار، حتى في المواقف الصعبة، وتترك لراحتك مساحة بعد العمل أو الدراسة</p>
          </div>
        </div>
      </section>
      </div>
      <SolaviaPurchase />
      <SolaviaDetails />
    </main>
  );
}
