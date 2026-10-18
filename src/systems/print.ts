// A one-page chapter summary for printing or saving as a PDF.
import { getChapter, loadTranslation, locations, scriptureText, translations, ui, type TranslationId } from './content';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function printChapter(chapterId: string, tid: TranslationId): Promise<void> {
  const win = window.open('', '_blank'); // opened right away so phones don't block it
  await loadTranslation(tid);
  const ch = getChapter(chapterId);
  const t = translations.find((x) => x.id === tid)!;
  const mv = ch.memoryVerse;
  const places = [...new Set(ch.scenes.map((s) => locations[s.location]?.name).filter(Boolean))];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Follow Me, Chapter ${ch.number}: ${esc(ch.title)}</title>
<style>
  body { font: 15px/1.5 Georgia, serif; color: #2b1d12; max-width: 700px; margin: 24px auto; padding: 0 20px; }
  h1 { font-size: 26px; margin: 0; } .sub { color: #7a4f17; margin: 0 0 16px; }
  .verse { border: 3px solid #9c6b1f; border-radius: 12px; padding: 14px 18px; margin: 16px 0; background: #fbf5e6; }
  .verse p { font-size: 20px; font-style: italic; margin: 0 0 6px; } .ref { font-weight: bold; color: #7a4f17; }
  h2 { font-size: 17px; margin: 18px 0 6px; border-bottom: 1px solid #d8c8a0; }
  .lines li { margin-bottom: 10px; } .write { border-bottom: 1px dashed #b8ab94; height: 26px; }
  footer { margin-top: 24px; font-size: 11px; color: #6b5a45; }
  @media print { button { display: none; } body { margin: 0 auto; } }
</style></head><body>
<button onclick="print()" style="font-size:18px;padding:10px 20px;margin-bottom:16px">🖨 Print / Save as PDF</button>
<h1>Chapter ${ch.number}: ${esc(ch.title)}</h1>
<p class="sub">${esc(ch.passage)} · ${esc(ui.whereItHappened)}: ${esc(places.join(', '))}</p>
<div class="verse"><div class="ref">${esc(ui.memoryVerse)}</div>
<p>“${esc(scriptureText(mv.ref, mv.quote, tid))}”</p><div class="ref">${esc(mv.ref)} (${esc(t.short)})</div></div>
<h2>${esc(ui.scenes)}</h2><ol>${ch.scenes.map((s) => `<li>${esc(s.title)} <i>(${esc(s.passage)})</i></li>`).join('')}</ol>
<h2>${esc(ui.reflect)}</h2><p>${esc(ch.reflect)}</p>
<h2>${esc(ui.talkAbout)}</h2><ol class="lines">${(ch.discuss ?? []).map((q) => `<li>${esc(q)}<div class="write"></div></li>`).join('')}</ol>
<h2>🙏 ${esc(ui.prayer)}</h2><p>${esc(ch.prayer ?? '')}</p>
<footer>Follow Me: Walk with Jesus · Third Heaven Studios · ${esc(t.notice)}</footer>
</body></html>`;
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
