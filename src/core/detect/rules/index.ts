import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';
import { phoneRule } from './phone';
import { ibanRule } from './iban';
import { nirRule } from './nir';
import { cardRule } from './card';

export const RULES: Rule[] = [ibanRule, nirRule, cardRule, urlRule, emailRule, phoneRule, ipRule];
