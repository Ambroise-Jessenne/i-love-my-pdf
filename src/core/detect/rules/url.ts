import type { Rule } from '../types';

export const urlRule: Rule = {
  type: 'URL',
  priority: 50,
  pattern: /\b(?:https?:\/\/|www\.)[^\s<>"']*[^\s<>"'.,;:!?)\]]/gi,
};
