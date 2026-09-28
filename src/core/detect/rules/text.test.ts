import { describe, expect, it } from 'vitest';
import { runRules } from '../detect';
import { dateRules } from './date';
import { addressRules } from './address';

describe('dateRules', () => {
  const values = (text: string) => runRules(text, dateRules).map((d) => d.value);

  it.each([
    ['né le 12/03/1985 à Lyon', '12/03/1985'],
    ['le 12.03.1985', '12.03.1985'],
    ['date ISO 1985-03-12', '1985-03-12'],
    ['le 12 mars 1985', '12 mars 1985'],
    ['depuis le 1er janvier 2000', '1er janvier 2000'],
    ['born March 12, 1985', 'March 12, 1985'],
  ])('finds the date in %j', (text, expected) => {
    expect(values(text)).toEqual([expected]);
  });

  it('ignores impossible months', () => {
    expect(values('12/13/1985')).toEqual([]);
  });
});

describe('addressRules', () => {
  const values = (text: string) => runRules(text, addressRules).map((d) => d.value);

  it('finds a full address with postcode and city', () => {
    expect(values("J'habite au 12 rue de la Paix, 75002 Paris depuis 2010")).toEqual([
      '12 rue de la Paix, 75002 Paris',
    ]);
  });

  it('handles bis/ter and compound city names', () => {
    expect(values('Siège : 12 bis boulevard Saint-Michel 75005 Paris.')).toEqual([
      '12 bis boulevard Saint-Michel 75005 Paris',
    ]);
  });

  it('finds a street without postcode', () => {
    expect(values('au 3 avenue Victor Hugo.')).toEqual(['3 avenue Victor Hugo']);
  });

  it('finds an address written in capitals', () => {
    expect(values('Destinataire : 12 RUE DE LA PAIX, 75002 PARIS')).toEqual(['12 RUE DE LA PAIX, 75002 PARIS']);
  });

  it('finds a street in capitals without postcode', () => {
    expect(values('au 3 AVENUE VICTOR HUGO.')).toEqual(['3 AVENUE VICTOR HUGO']);
  });

  it('ignores numbers that are not addresses', () => {
    expect(values("J'ai 3 chats et 2 chiens")).toEqual([]);
  });

  it('keeps typographic apostrophes inside the street name', () => {
    expect(values('au 3 rue de l’Église.')).toEqual(['3 rue de l’Église']);
  });
});
