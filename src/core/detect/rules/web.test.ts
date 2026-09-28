import { describe, expect, it } from 'vitest';
import type { Rule } from '../types';
import { runRules } from '../detect';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';

const values = (text: string, rule: Rule) => runRules(text, [rule]).map((d) => d.value);

describe('emailRule', () => {
  it('finds email addresses without trailing punctuation', () => {
    expect(values('Écrivez à jean.dupont@exemple.fr.', emailRule)).toEqual(['jean.dupont@exemple.fr']);
  });

  it('finds several addresses', () => {
    expect(values('a@b.io et marie+test@sous.domaine.org', emailRule)).toEqual([
      'a@b.io',
      'marie+test@sous.domaine.org',
    ]);
  });

  it('ignores a lone at sign', () => {
    expect(values('rendez-vous @ midi', emailRule)).toEqual([]);
  });

  it('stays fast on a long token without an at sign', () => {
    const started = performance.now();
    values('a'.repeat(200_000), emailRule);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('urlRule', () => {
  it('finds http(s) links without trailing punctuation', () => {
    expect(values('Voir https://exemple.fr/page?id=3. Merci', urlRule)).toEqual(['https://exemple.fr/page?id=3']);
  });

  it('finds www links', () => {
    expect(values('Site : www.site.com, bientôt', urlRule)).toEqual(['www.site.com']);
  });

  it('finds capitalised links', () => {
    expect(values('Https://exemple.fr et WWW.site.com', urlRule)).toEqual(['Https://exemple.fr', 'WWW.site.com']);
  });
});

describe('ipRule', () => {
  it('finds IPv4 addresses', () => {
    expect(values('Serveur 192.168.1.42 ok', ipRule)).toEqual(['192.168.1.42']);
  });

  it('ignores impossible addresses', () => {
    expect(values('999.1.1.1 et 192.168.1.420', ipRule)).toEqual([]);
  });
});
