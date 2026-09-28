import type { Detection, Rule } from './types';
import { resolveOverlaps, type Candidate } from './resolve';
import { RULES } from './rules';

export function runRules(text: string, rules: Rule[]): Detection[] {
  const candidates: Candidate[] = [];
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      const value = match[0];
      if (rule.validate && !rule.validate(value)) continue;
      const start = match.index ?? 0;
      const end = start + value.length;
      candidates.push({
        id: `${rule.type}-${start}-${end}`,
        type: rule.type,
        start,
        end,
        value,
        priority: rule.priority,
      });
    }
  }
  return resolveOverlaps(candidates);
}

export function detect(text: string): Detection[] {
  return runRules(text, RULES);
}
