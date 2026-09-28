import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';

export const RULES: Rule[] = [urlRule, emailRule, ipRule];
