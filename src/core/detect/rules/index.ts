import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';
import { phoneRule } from './phone';

export const RULES: Rule[] = [urlRule, emailRule, phoneRule, ipRule];
