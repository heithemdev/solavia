"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Plus, Phone } from "lucide-react";
import WhatsAppIcon from "./whatsapp-icon";
import SolaviaLifestyle from "./solavia-lifestyle";
import "./solavia-details.css";

const faq = [
  { question:"كم سعر التوصيل؟ وهل يمكن الاستلام من المكتب؟", answer:<p>يختلف سعر التوصيل حسب الولاية وطريقة الاستلام، ويظهر في النموذج عند اختيار الولاية، يمكنك المقارنة بين المنزل والمكتب، ويظهر سعر العبوات وسعر التوصيل والإجمالي كلٌّ على حدة، بعض الولايات لا يتوفر فيها الاستلام من المكتب أو لم تُحدّد تعرِفتها بعد</p> },
  { question:"ما هي مكوّنات SHAYA BIO؟", answer:<><p>بحسب ملصق العبوة، تحتوي كل كبسولة على خمسة مستخلصات بإجمالي 600 ملغ</p><dl className="formula-list"><div><dt>الأشواغاندا</dt><dd><bdi>200</bdi> ملغ</dd></div><div><dt>نبتة سانت جون</dt><dd><bdi>150</bdi> ملغ</dd></div><div><dt>المليسة</dt><dd><bdi>120</bdi> ملغ</dd></div><div><dt><bdi lang="en">Pyllium</bdi>، كما ورد على الملصق</dt><dd><bdi>100</bdi> ملغ</dd></div><div><dt>مستخلص زبدة الشيا</dt><dd><bdi>30</bdi> ملغ</dd></div></dl></> },
  { question:"هل تساعد على النوم؟ وهل لها فوائد للتركيز؟", answer:<p>تشير دراسات على بعض مستخلصات الأشواغاندا إلى إمكانية دعم الاسترخاء وتحسين جودة النوم، وتُستخدم المليسة تقليديًا للتهدئة والمساعدة على النوم، هذه النتائج تخص مستخلصات دُرست، ولا تثبت النتيجة نفسها لهذه التركيبة، ولا نَعِد بتحسين التركيز أو الأداء الدراسي</p> },
  { question:"متى يمكن أن أشعر بالفرق؟", answer:<p>الاستجابة تختلف من شخص لآخر، والدراسات على الأشواغاندا قيّمت التغيّر خلال عدة أسابيع، لذلك لا يمكن تحديد موعد مضمون لنتيجة SHAYA BIO، إذا استمر التوتر أو اضطراب النوم أو أثّر في حياتك، راجع مختصًا بدل الاكتفاء بالمكمّل</p> },
  { question:"هل يناسب الجميع؟", answer:<p>يُنظر في استخدامه للبالغين بعد التأكد من ملاءمته، ويُتجنّب أثناء الحمل والرضاعة ولدى الأطفال، استشر الطبيب قبل استعماله إذا كانت لديك مشكلة في الغدة الدرقية أو الكبد أو مرض مناعي، أو كنت مقبلًا على عملية جراحية</p> },
  { question:"هل يمكن تناوله مع الأدوية؟", answer:<p>يجب مراجعة الصيدلي أولًا، لأن نبتة سانت جون قد تتداخل مع أدوية عديدة، منها مضادات الاكتئاب وموانع الحمل الهرمونية ومميّعات الدم، وقد تتداخل الأشواغاندا مع المهدّئات وأدوية أخرى، أخبر الصيدلي بكل الأدوية والمكمّلات التي تستخدمها ولا توقف دواءً موصوفًا من نفسك</p> },
  { question:"هل توجد آثار جانبية؟", answer:<p>قد يحدث نعاس أو اضطراب في المعدة أو حساسية للشمس، وسُجلت نادرًا مشكلات بالكبد مرتبطة بالأشواغاندا، توقف عن الاستخدام واطلب المشورة الطبية إذا ظهرت أعراض غير معتادة، خصوصًا اصفرار الجلد أو العينين</p> },
  { question:"كيف أستخدمه وأحفظ العبوة؟", answer:<p>الجرعة المدونة على ملصق العبوة كبسولتان يوميًا، راجع الصيدلي للتأكد من ملاءمة الاستخدام لك واتبع إرشادات العبوة، احفظها مغلقة في مكان جاف بعيدًا عن الحرارة والرطوبة ومتناول الأطفال، وتجنب القيادة إذا شعرت بالنعاس</p> },
];

export default function SolaviaDetails() {
  const content = useRef<HTMLDivElement>(null);
  const answerAnimations = useRef(new WeakMap<HTMLDetailsElement, Animation>());
  function toggleAnswer(event: React.MouseEvent<HTMLElement>) {
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    event.preventDefault();
    const summary = event.currentTarget;
    const details = summary.parentElement as HTMLDetailsElement;
    const closing = details.dataset.expanded === "true" || (details.open && !details.dataset.expanded);
    const height = details.getBoundingClientRect().height;
    answerAnimations.current.get(details)?.cancel();
    details.dataset.expanded = String(!closing);
    details.open = true;
    const target = closing ? summary.getBoundingClientRect().height + 1 : details.scrollHeight + 1;
    const animation = details.animate([{height:`${height}px`},{height:`${target}px`}], {duration:240,easing:"cubic-bezier(.22,.61,.36,1)"});
    answerAnimations.current.set(details, animation);
    animation.onfinish = () => { details.open = !closing; answerAnimations.current.delete(details); };
  }
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const root = content.current;
    let disposed = false;
    const shadow = new window.Image();
    shadow.src = "/images/solavia/forest-shadows.webp";
    root?.classList.add("motion-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-entered");
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    // Observe the decorations themselves so their entrance cannot finish off screen.
    const decorations = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < (entry.target instanceof HTMLImageElement ? .15 : .5)) return;
        const reveal = () => { if (!disposed) entry.target.classList.add("is-animated"); };
        if (entry.target instanceof HTMLImageElement) entry.target.decode().then(reveal, reveal);
        else shadow.decode().then(reveal, reveal);
        decorations.unobserve(entry.target);
      });
    }, { threshold: [.15, .5], rootMargin: "0px 0px -8% 0px" });
    root?.querySelectorAll("section").forEach((section) => observer.observe(section));
    root?.querySelectorAll(".falling-leaf,.faq-leaf-shadow").forEach((decoration) => decorations.observe(decoration));
    return () => { disposed = true; observer.disconnect(); decorations.disconnect(); root?.classList.remove("motion-ready"); };
  }, []);

  return <div className="solavia-details" ref={content}>
    <section className="botanical-strip" id="botanicals" aria-label="الأشواغاندا والمليسة">
      <div className="field-herbs falling-leaves" aria-hidden="true"><Image className="falling-leaf leaf-soft" src="/images/solavia/botanical/leaf.webp" alt="" width={260} height={260} unoptimized /><Image className="falling-leaf leaf-sharp" src="/images/solavia/botanical/leaf.webp" alt="" width={260} height={260} unoptimized /></div>
      <picture className="field-photo"><source media="(max-width:800px)" srcSet="/images/solavia/botanical/field-640.webp" /><img src="/images/solavia/botanical/field-1280.webp" srcSet="/images/solavia/botanical/field-1280.webp 1280w, /images/solavia/botanical/field-1600.webp 1600w" sizes="(max-width:800px) 84vw, 80vw" alt="مشهد تصويري لحقل أشواغاندا، أحد نباتات التركيبة" width={1600} height={900} loading="lazy" decoding="async" /></picture>
    </section>

    <section className="solavia-promises" id="promises" aria-labelledby="promises-title">
      <div className="promise-leaves falling-leaves" aria-hidden="true"><Image className="falling-leaf leaf-soft" src="/images/solavia/botanical/leaf.webp" alt="" width={260} height={260} unoptimized /><Image className="falling-leaf leaf-sharp" src="/images/solavia/botanical/leaf.webp" alt="" width={260} height={260} unoptimized /></div>
      <div className="promises-inner">
        <div className="promise-intro"><h2 id="promises-title">وعدنا لك</h2><p>أن نمنح راحتك الاهتمام الذي تستحقّه، بمستخلصات نباتية تجمع الأشواغاندا والمليسة في تركيبة تُحضّر في مختبر</p><p>دعم للاسترخاء، ووقت أهدأ تستعيد فيه مساحتك بعد انشغال اليوم، مع استجابة تختلف من شخص لآخر</p></div>
        <div className="promise-grid">
          <article><h3>ضغط أقلّ على يومك</h3><p>الأشواغاندا من المستخلصات المدروسة للمساعدة على تخفيف الشعور بالتوتر، وهو ما نبحث عنه لدعم راحتك اليومية</p></article>
          <article><h3>استراحة تشعر بها</h3><p>وقت العمل ينتهي، ويستحقّ وقتك الخاص أن يبدأ بهدوء، مع المليسة المستخدمة تقليديًا لدعم الاسترخاء</p></article>
          <article><h3>مكان للراحة قبل النوم</h3><p>قد تدعم بعض مستخلصات الأشواغاندا جودة النوم، مع روتين منتظم ومساء أقلّ انشغالًا</p></article>
          <article><h3>عناية تجد مكانها في يومك</h3><p>60 كبسولة تُضاف إلى روتين يضمّ الاستراحة والنوم المنتظم، لتمنح نفسك اهتمامًا يتجاوز لحظات الضغط</p></article>
        </div>
      </div>
    </section>

    <div className="closing-sections">
    <section className="lifestyle-section" id="daily-routine" aria-labelledby="lifestyle-title">
      <div className="lifestyle-copy" dir="rtl"><div className="lifestyle-copy-inner"><h2 id="lifestyle-title">لراحتك مكانة خاصة</h2><p>تختار بعناية ما تمنحه وقتك، فامنح نفسك العناية نفسها، مع <bdi lang="en">SHAYA BIO</bdi>، خمسة مستخلصات نباتية وتحضير مخبري في عبوة ترافق لحظاتك الخاصة</p></div></div>
      <SolaviaLifestyle />
    </section>

    <section className="solavia-faq" id="faq" aria-labelledby="faq-title">
      <div className="faq-atmosphere" aria-hidden="true"><div className="faq-leaf-shadow" /></div>
      <div className="faq-inner details-container"><h2 id="faq-title">الأسئلة الشائعة</h2><div className="faq-list">{faq.map((item) => <details key={item.question}><summary onClick={toggleAnswer}><span>{item.question}</span><Plus size={20} strokeWidth={1.5} aria-hidden="true" /></summary><div className="faq-answer">{item.answer}</div></details>)}</div>
        <p className="faq-sources">مراجع المعلومات الصحية <a href="https://ods.od.nih.gov/factsheets/Ashwagandha-HealthProfessional/" target="_blank" rel="noopener noreferrer">NIH</a><a href="https://www.ema.europa.eu/en/medicines/herbal/melissae-folium" target="_blank" rel="noopener noreferrer">EMA</a><a href="https://www.nccih.nih.gov/health/st-johns-wort-and-depression-in-depth" target="_blank" rel="noopener noreferrer">NCCIH</a></p>
      </div>
    </section>
    </div>

    <footer className="solavia-footer" id="social"><div className="details-container footer-inner">
      <a href="#hero-title" className="footer-brand" aria-label="سولافيا، العودة إلى الأعلى"><svg viewBox="230 220 620 220" role="img" aria-label="Solavia"><defs><filter id="footer-logo-removal" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1.2 0 0 0 -0.2" /></filter></defs><image href="/images/solavia/logo-source.webp" width="1067" height="683" filter="url(#footer-logo-removal)" /></svg></a>
      <nav className="footer-contact" aria-label="تواصل مع سولافيا"><a href="tel:+213792729391"><Phone size={17} aria-hidden="true" /><bdi>+213 792 72 93 91</bdi></a><a href="https://www.instagram.com/sol_avia/" target="_blank" rel="noopener noreferrer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>إنستغرام</a><a className="footer-whatsapp" href="https://wa.me/213792729391" target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} />تواصل عبر واتساب</a></nav>
      <p className="footer-copyright">© {new Date().getFullYear()} سولافيا</p>
    </div></footer>
  </div>;
}
