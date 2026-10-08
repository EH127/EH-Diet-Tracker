import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Minus, Plus, X } from 'lucide-react';

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>;
}
export function TextField({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Field label={label}><input value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></Field>;
}
export function NumberField({ label, value, onChange, min = 0, step = 1, optional = false }: { label: string; value?: number; onChange: (n: number | undefined) => void; min?: number; step?: number; optional?: boolean }) {
  return <Field label={label}><input type="number" inputMode={step < 1 ? 'decimal' : 'numeric'} min={min} step={step} value={value ?? ''} onChange={e => {
    if (e.target.value === '') { if (optional) onChange(undefined); return; }
    if (e.target.validity.valid) onChange(Number(e.target.value));
  }} /></Field>;
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span>{label}</span></label>;
}
export function Stepper({ value, onChange, label, min = 0, max = 100 }: { value: number; onChange: (n: number) => void; label: string; min?: number; max?: number }) {
  return <div className="stepper"><button type="button" className="icon-button" aria-label={`הפחתת ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={18} /></button><output aria-label={label}>{value}</output><button type="button" className="icon-button" aria-label={`הוספת ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={18} /></button></div>;
}
export function Progress({ value, max, label, danger = false }: { value: number; max: number; label: string; danger?: boolean }) {
  return <div className={`progress ${danger ? 'danger' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.max(1, max)} aria-valuenow={Math.max(0, Math.min(value, Math.max(1, max)))}><span style={{ width: `${Math.min(100, Math.max(0, max ? value / max * 100 : 100))}%` }} /></div>;
}
export function ScoreRing({ score, small = false }: { score: number; small?: boolean }) {
  return <div className={`score-ring ${small ? 'small' : ''}`} role="img" aria-label={`עמידה בתפריט: ${score}%`} style={{ background: `conic-gradient(var(--primary) ${score * 3.6}deg, var(--track) 0deg)` }}><span>{score}<small>%</small></span></div>;
}
export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; };
  }, []);
  return <dialog ref={ref} className="sheet" aria-labelledby={id} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="sheet-handle" /><div className="row between"><h2 id={id}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="סגירה"><X size={20} /></button></div>{children}
  </dialog>;
}
export function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="card settings-section" open={open || undefined}><summary>{title}</summary><div className="section-content stack">{children}</div></details>;
}
export function Empty({ children }: { children: ReactNode }) { return <p className="empty">{children}</p>; }
