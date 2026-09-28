import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';
import { phoneRule } from './phone';
import { ibanRule } from './iban';

export const RULES: Rule[] = [ibanRule, urlRule, emailRule, phoneRule, ipRule];
