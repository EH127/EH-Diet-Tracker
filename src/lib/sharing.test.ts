import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyText, shareReport } from './sharing';

class Element {
  value = ''; readOnly = false; dir = ''; style = { position: '', opacity: '' };
  focus = vi.fn(); select = vi.fn(); setSelectionRange = vi.fn(); remove = vi.fn();
}
let input: Element;
let active: Element;
let execCommand: ReturnType<typeof vi.fn>;
let open: ReturnType<typeof vi.fn>;
beforeEach(() => {
  input = new Element(); active = new Element(); execCommand = vi.fn(() => true); open = vi.fn();
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('document', { activeElement: active, body: { append: vi.fn() }, createElement: () => input, execCommand });
  vi.stubGlobal('navigator', {}); vi.stubGlobal('window', { open });
});
afterEach(() => vi.unstubAllGlobals());
describe('report copying and sharing', () => {
  it('copies the message exactly through the clipboard API', async () => {
    const writeText = vi.fn(async () => {}); vi.stubGlobal('navigator', { clipboard: { writeText } });
    await copyText('מים ✅\nכל האימונים'); expect(writeText).toHaveBeenCalledWith('מים ✅\nכל האימונים'); expect(execCommand).not.toHaveBeenCalled();
  });
  it('falls back when clipboard is missing or denied, cleaning up and restoring focus', async () => {
    for (const navigator of [{}, { clipboard: { writeText: async () => { throw new Error('denied'); } } }]) {
      vi.stubGlobal('navigator', navigator); await copyText('הודעה\nבעברית');
      expect(input.value).toBe('הודעה\nבעברית'); expect(execCommand).toHaveBeenCalledWith('copy'); expect(input.remove).toHaveBeenCalled(); expect(active.focus).toHaveBeenCalled();
    }
  });
  it('reports a failed fallback without leaving the temporary textarea behind', async () => {
    execCommand.mockReturnValue(false); await expect(copyText('טקסט')).rejects.toThrow('copy'); expect(input.remove).toHaveBeenCalled();
  });
  it('uses native sharing with only the message text', async () => {
    const share = vi.fn(async () => {}); vi.stubGlobal('navigator', { share });
    await shareReport('הודעה'); expect(share).toHaveBeenCalledWith({ text: 'הודעה' }); expect(open).not.toHaveBeenCalled();
  });
  it('opens the encoded WhatsApp link when sharing is unavailable or fails', async () => {
    for (const navigator of [{}, { share: async () => { throw new Error('unavailable'); } }]) {
      vi.stubGlobal('navigator', navigator); await shareReport('מים ✅\nכל האימונים');
      expect(open).toHaveBeenCalledWith(`https://wa.me/?text=${encodeURIComponent('מים ✅\nכל האימונים')}`, '_blank', 'noopener,noreferrer');
    }
  });
  it('treats cancellation as a user choice without opening WhatsApp', async () => {
    vi.stubGlobal('navigator', { share: async () => { throw new DOMException('cancelled', 'AbortError'); } });
    await shareReport('טקסט'); expect(open).not.toHaveBeenCalled();
  });
});
