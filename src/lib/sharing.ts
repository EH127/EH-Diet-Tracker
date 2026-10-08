export async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  } catch { /* Try the offline-compatible fallback if clipboard access is denied. */ }
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const input = document.createElement('textarea');
  input.value = text; input.readOnly = true; input.dir = 'rtl';
  input.style.position = 'fixed'; input.style.opacity = '0';
  document.body.append(input); input.focus(); input.select(); input.setSelectionRange(0, text.length);
  try { if (!document.execCommand('copy')) throw new Error('copy'); }
  finally { input.remove(); active?.focus(); }
}
export async function shareReport(text: string): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ text }); return; }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') return; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}
