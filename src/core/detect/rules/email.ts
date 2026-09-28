import type { Rule } from '../types';

export const emailRule: Rule = {
  type: 'EMAIL',
  priority: 45,
  pattern: /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,24}/g,
};
