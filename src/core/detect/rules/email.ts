import type { Rule } from '../types';

export const emailRule: Rule = {
  type: 'EMAIL',
  priority: 45,
  pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
};
