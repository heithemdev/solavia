"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
type Option = { value: string; label: string };
export default function AdminSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId(),
    trigger = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [position, setPosition] = useState({
      top: 0,
      left: 0,
      width: 0,
      fontFamily: "inherit",
    }),
    [closing, setClosing] = useState(false);
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const rect = trigger.current.getBoundingClientRect(),
      height = Math.min(options.length * 43 + 12, 300);
    setPosition({
      left: Math.max(
        12,
        Math.min(rect.left, innerWidth - Math.max(rect.width, 190) - 12),
      ),
      top:
        rect.bottom + height + 12 < innerHeight
          ? rect.bottom + 6
          : Math.max(12, rect.top - height - 6),
      width: Math.max(rect.width, 190),
      fontFamily: getComputedStyle(trigger.current).fontFamily,
    });
    dialog.current?.showModal();
    dialog.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.focus();
  }, [open, options.length]);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      dialog.current?.close();
      setOpen(false);
      setClosing(false);
      trigger.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [closing]);
  const title =
    options.find((o) => o.value === value)?.label || options[0]?.label || "";
  return (
    <div className={`admin-select ${className}`}>
      <button
        ref={trigger}
        type="button"
        className="admin-select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        title={title}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{title}</span>
        <ChevronDown size={15} />
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            dir="ltr"
            lang="fr"
            className={`admin-select-popup${closing ? " is-closing" : ""}`}
            style={position}
            aria-label={label}
            onCancel={(e) => {
              e.preventDefault();
              setClosing(true);
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setClosing(true);
            }}
          >
            <div
              id={id}
              role="listbox"
              aria-label={label}
              onKeyDown={(e) => {
                const buttons = Array.from(
                  dialog.current?.querySelectorAll<HTMLButtonElement>(
                    '[role="option"]',
                  ) || [],
                );
                let index = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  index =
                    (index +
                      (e.key === "ArrowDown" ? 1 : -1) +
                      buttons.length) %
                    buttons.length;
                  buttons[index]?.focus();
                }
                if (e.key === "Home") {
                  e.preventDefault();
                  buttons[0]?.focus();
                }
                if (e.key === "End") {
                  e.preventDefault();
                  buttons.at(-1)?.focus();
                }
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    setClosing(true);
                  }}
                >
                  {option.label}
                  {option.value === value && <Check size={16} />}
                </button>
              ))}
            </div>
          </dialog>,
          document.body,
        )}
    </div>
  );
}
