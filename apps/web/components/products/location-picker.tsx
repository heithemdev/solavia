"use client";

import { ChevronDown, Search, X, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { normalizeLocationSearch } from "@/lib/location-search";

type Option = { value: string; label: string; searchText?: string };

export default function LocationPicker({ id, label, placeholder, value, options, onChange, disabled = false, invalid = false }: {
  id: string; label: string; placeholder: string; value: string; options: Option[];
  onChange: (value: string) => void; disabled?: boolean; invalid?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtered = options.filter((option) => normalizeLocationSearch(`${option.label} ${option.searchText ?? ""}`).includes(normalizeLocationSearch(query)));
  const selected = options.find((option) => option.value === value);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    body.style.overflow = "hidden";
    const viewportWidth = window.innerWidth;
    const closeOnResize = () => {
      if (window.innerWidth !== viewportWidth || window.innerWidth > 800) dialog.current?.close();
    };
    window.addEventListener("resize", closeOnResize);
    return () => { body.style.overflow = previousOverflow; body.style.paddingRight = previousPadding; window.removeEventListener("resize", closeOnResize); };
  }, [open]);

  function show() {
    if (!dialog.current || !trigger.current) return;
    const bounds = trigger.current.getBoundingClientRect();
    const availableBelow = window.innerHeight - bounds.bottom - 16;
    const height = Math.min(380, Math.max(220, window.innerHeight - 32));
    const below = availableBelow >= Math.min(height, 280);
    const top = below ? bounds.bottom + 8 : Math.max(16, bounds.top - height - 8);
    dialog.current.style.setProperty("--picker-top", `${top}px`);
    dialog.current.style.setProperty("--picker-height", `${below ? Math.min(height, availableBelow) : Math.min(height, bounds.top - 24)}px`);
    dialog.current.style.setProperty("--picker-left", `${Math.max(16, Math.min(bounds.left, window.innerWidth - Math.max(320, bounds.width) - 16))}px`);
    dialog.current.style.setProperty("--picker-width", `${Math.min(window.innerWidth - 32, Math.max(320, bounds.width))}px`);
    setQuery("");
    setChoosing(false);
    setActive(0);
    dialog.current.showModal();
    setOpen(true);
  }

  function choose(option: Option) {
    if (choosing) return;
    onChange(option.value);
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) { dialog.current?.close(); return; }
    setChoosing(true);
    closeTimer.current = setTimeout(() => { dialog.current?.close(); closeTimer.current = null; }, 180);
  }

  return <div className="location-field">
    <span id={`${id}-label`} className="field-label">{label}</span>
    <button ref={trigger} id={id} type="button" className="location-trigger" onClick={show} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`} aria-labelledby={`${id}-label ${id}-value`} aria-invalid={invalid || undefined}>
      <span id={`${id}-value`} className={selected ? "" : "field-placeholder"}>{selected?.label ?? placeholder}</span><ChevronDown size={18} aria-hidden="true" />
    </button>
    <dialog ref={dialog} id={`${id}-dialog`} className={`location-dialog${choosing ? " is-selecting" : ""}`} dir="rtl" aria-labelledby={`${id}-dialog-title`} onClose={() => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = null; setOpen(false); setChoosing(false); trigger.current?.focus(); }} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
    }}>
      <div className="picker-heading"><h3 id={`${id}-dialog-title`}>{placeholder}</h3><button type="button" className="picker-close" onClick={() => dialog.current?.close()} aria-label="إغلاق"><X size={20} /></button></div>
      <div className="picker-search"><Search size={19} aria-hidden="true" /><input autoFocus type="search" role="combobox" aria-label={`ابحث عن ${label}`} aria-controls={`${id}-list`} aria-expanded={open} aria-autocomplete="list" aria-activedescendant={filtered.length ? `${id}-option-${active}` : undefined} placeholder={`ابحث عن ${label}`} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); list.current?.scrollTo(0, 0); }} onKeyDown={(event) => {
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && filtered.length) {
          event.preventDefault();
          const next = (active + (event.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length;
          setActive(next);
          document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: "nearest" });
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (filtered[active]) choose(filtered[active]);
        }
      }} /></div>
      <div ref={list} className="picker-list" id={`${id}-list`} role="listbox" aria-labelledby={`${id}-dialog-title`}>
        {filtered.map((option, index) => <button type="button" role="option" tabIndex={-1} id={`${id}-option-${index}`} key={option.value} aria-selected={value === option.value} data-active={index === active} onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>
          <span className="picker-option-name">{option.label}{value === option.value && <Check size={17} aria-hidden="true" />}</span>
        </button>)}
        {!filtered.length && <p className="picker-empty" role="status">لا توجد نتائج</p>}
      </div>
    </dialog>
  </div>;
}
