"use client";

import { useEffect, useRef, useState } from "react";

const slides = [
  { image:"study", alt:"عبوة SHAYA BIO بجوار دفتر وكتاب على مكتب" },
  { image:"bedside", alt:"عبوة SHAYA BIO على طاولة بجانب السرير تحت ضوء دافئ" },
  { image:"bag", alt:"عبوة SHAYA BIO داخل جيب حقيبة قماشية مع دفتر" },
  { image:"bathroom", alt:"عبوة SHAYA BIO على رف بجوار مرآة ومنشفة" },
];

export default function SolaviaLifestyle() {
  const track = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  const currentIndex = useRef(0);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const reduced = useRef(false);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion:reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?:boolean; effectiveType?:string } }).connection;
    const updateMotion = () => {
      reduced.current = motion.matches;
      if (motion.matches) setPlaying(false);
    };
    updateMotion();
    setPlaying(!motion.matches && !connection?.saveData && !["slow-2g","2g"].includes(connection?.effectiveType ?? ""));
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= .35)), { threshold:.35 });
    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      width.current = entry.contentRect.width;
      element.scrollTo({ left:currentIndex.current * width.current, behavior:"instant" });
    });
    const visibility = () => setPageVisible(!document.hidden);
    visibility();
    observer.observe(element);
    resize.observe(element);
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); resize.disconnect(); motion.removeEventListener("change", updateMotion); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    if (!visible || !pageVisible || !playing || hovered) return;
    const timer = setTimeout(() => {
      track.current?.scrollTo({ left:((index + 1) % slides.length) * width.current, behavior:reduced.current ? "instant" : "smooth" });
    }, 2500);
    return () => clearTimeout(timer);
  }, [index, visible, pageVisible, playing, hovered]);

  function move(next: number) {
    setPlaying(false);
    track.current?.scrollTo({ left:((next + slides.length) % slides.length) * width.current, behavior:reduced.current ? "instant" : "smooth" });
  }

  return <div className="lifestyle-gallery" role="region" aria-roledescription="عرض صور" aria-label="SHAYA BIO في روتينك" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPlaying(false); }}>
    <button className="gallery-pause" type="button" aria-pressed={!playing} onClick={() => setPlaying((value) => !value)}>{playing ? "إيقاف العرض التلقائي" : "تشغيل العرض التلقائي"}</button>
    <div className="lifestyle-track" ref={track} dir="ltr" onPointerDown={() => setPlaying(false)} onScroll={(event) => {
      if (!width.current) return;
      const next = Math.max(0, Math.min(slides.length - 1, Math.round(event.currentTarget.scrollLeft / width.current)));
      currentIndex.current = next;
      setIndex((previous) => previous === next ? previous : next);
    }}>
      {slides.map((slide, slideIndex) => <figure className="lifestyle-slide" key={slide.image} role="group" aria-roledescription="صورة" aria-label={`${slideIndex + 1} من ${slides.length}`}>
        <img src={`/images/solavia/lifestyle/${slide.image}-480.webp`} srcSet={`/images/solavia/lifestyle/${slide.image}-480.webp 480w, /images/solavia/lifestyle/${slide.image}-800.webp 800w`} sizes="(max-width:800px) 100vw, 50vw" width={800} height={800} loading="lazy" decoding="async" alt={slide.alt} />
      </figure>)}
    </div>
    <div className="gallery-dots" aria-label="اختيار الصورة">{slides.map((slide, slideIndex) => <button key={slide.image} type="button" className={index === slideIndex ? "is-active" : ""} aria-label={`عرض الصورة ${slideIndex + 1}`} aria-current={index === slideIndex ? "true" : undefined} onClick={() => move(slideIndex)} />)}</div>
  </div>;
}
