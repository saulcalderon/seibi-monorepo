import { describe, expect, it } from 'vitest';

import { plainText } from './text';

describe('plainText', () => {
  it('is empty for no text', () => {
    expect(plainText(null)).toBe('');
    expect(plainText(undefined)).toBe('');
  });

  it('keeps a Markdown link’s words and drops its address', () => {
    expect(plainText('Ver el [manual de Toyota](https://toyota.com/manual).')).toBe('Ver el manual de Toyota.');
  });

  it('drops a parenthesised Markdown citation whole', () => {
    expect(plainText('Cada 10,000 km ([fuente](https://example.com/a)).')).toBe('Cada 10,000 km.');
  });

  it('drops bare URLs and the space they leave before punctuation', () => {
    expect(plainText('Según https://example.com/plan , cada año.')).toBe('Según, cada año.');
    expect(plainText('Fuente (https://example.com/x).')).toBe('Fuente.');
  });

  it('leaves plain text alone', () => {
    expect(plainText('  Revisa el manual del propietario.  ')).toBe('Revisa el manual del propietario.');
  });
});
