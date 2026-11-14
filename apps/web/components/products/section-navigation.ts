export function watchSectionNavigation(header: HTMLElement, hero: HTMLElement) {
  const document = header.ownerDocument;
  const links = Array.from(header.querySelectorAll<HTMLAnchorElement>(".section-nav a[href^='#']"));
  const sections = new Map<Element, string>([[hero, ""]]);
  for (const [id, link] of [["about-shaya", "about-shaya"], ["purchase", "purchase"], ["botanicals", "promises"], ["promises", "promises"], ["daily-routine", "promises"], ["faq", "faq"]] as const) {
    const section = document.getElementById(id);
    if (section) sections.set(section, link);
  }
  const footer = document.getElementById("social");
  let visibleSection = "";
  let activeSection: string | null = null;
  let footerVisible = false;
  let band: IntersectionObserver | undefined;
  let geometry = "";

  function update() {
    const next = footerVisible ? "social" : visibleSection;
    if (next === activeSection) return;
    activeSection = next;
    links.forEach((link) => {
      if (link.hash === `#${next}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function observeBand() {
    const height = window.innerHeight;
    const top = Math.min(height - 2, Math.round(header.offsetHeight + (height - header.offsetHeight) * .22));
    const nextGeometry = `${height}:${top}`;
    if (nextGeometry === geometry) return;
    geometry = nextGeometry;
    band?.disconnect();
    band = new IntersectionObserver((entries) => {
      const intersecting = entries.filter((entry) => entry.isIntersecting && entry.intersectionRect.height > 0);
      if (!intersecting.length) return;
      const current = intersecting.reduce((latest, entry) => entry.boundingClientRect.top > latest.boundingClientRect.top ? entry : latest);
      visibleSection = sections.get(current.target) ?? "";
      update();
    }, { rootMargin: `-${top}px 0px -${height - top - 1}px 0px` });
    sections.forEach((_, section) => band!.observe(section));
  }

  const footerObserver = new IntersectionObserver(([entry]) => {
    footerVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= .4);
    update();
  }, { threshold: [0, .4] });
  if (footer) footerObserver.observe(footer);
  const resize = new ResizeObserver(observeBand);
  resize.observe(header);
  window.addEventListener("resize", observeBand);
  observeBand();
  return () => { band?.disconnect(); footerObserver.disconnect(); resize.disconnect(); window.removeEventListener("resize", observeBand); };
}
