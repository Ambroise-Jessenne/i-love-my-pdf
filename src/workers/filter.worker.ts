import { expose } from 'comlink';
import { detect } from '../core/detect/detect';
import { redact } from '../core/redact/redact';

const api = { detect, redact };

export type FilterApi = typeof api;

expose(api);
