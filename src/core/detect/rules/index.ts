import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';
import { phoneRule } from './phone';
import { ibanRule } from './iban';
import { nirRule } from './nir';
import { cardRule } from './card';
import { dateRules } from './date';
import { addressRules } from './address';

export const RULES: Rule[] = [
  ...addressRules,
  ibanRule,
  nirRule,
  cardRule,
  urlRule,
  emailRule,
  phoneRule,
  ...dateRules,
  ipRule,
];
