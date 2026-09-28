import type { Rule } from '../types';

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';

export const ipRule: Rule = {
  type: 'IP',
  priority: 20,
  pattern: new RegExp(`\\b${OCTET}(?:\\.${OCTET}){3}\\b`, 'g'),
};
