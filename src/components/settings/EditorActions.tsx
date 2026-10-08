import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
export function EditorActions({ name, index, count, move, remove }: { name: string; index: number; count: number; move: (direction: -1 | 1) => void; remove: () => void }) {
  return <div className="editor-actions"><button className="icon-button" disabled={index === 0} onClick={() => move(-1)} aria-label={`העלאת ${name}`}><ArrowUp size={17} /></button><button className="icon-button" disabled={index === count - 1} onClick={() => move(1)} aria-label={`הורדת ${name}`}><ArrowDown size={17} /></button><button className="icon-button text-danger" onClick={() => { if (window.confirm(`למחוק את ${name || 'הפריט'}? רשומות העבר יישמרו.`)) remove(); }} aria-label={`מחיקת ${name}`}><Trash2 size={17} /></button></div>;
}
