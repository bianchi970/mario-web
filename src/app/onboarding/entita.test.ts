import fs from 'fs';
import path from 'path';

// 13/11/2026: «Aggiungi dispositivo» mostrava «&#8635; Aggiorna» e
// «Registra dispositivo &#8250;» — un'entità HTML in una stringa JSX si scrive
// com'è. Le altre passavano da dangerouslySetInnerHTML: i caratteri veri bastano.
const sorgente = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

test('EN-01 nessuna entità HTML scritta come testo', () => {
  expect(sorgente).not.toMatch(/&#\d+;/);
});
test('EN-02 nessun dangerouslySetInnerHTML', () => {
  expect(sorgente).not.toMatch(/dangerouslySetInnerHTML/);
});
