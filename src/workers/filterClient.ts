import { wrap, type Remote } from 'comlink';
import type { FilterApi } from './filter.worker';

let api: Remote<FilterApi> | undefined;

export function getFilterApi(): Remote<FilterApi> {
  api ??= wrap<FilterApi>(new Worker(new URL('./filter.worker.ts', import.meta.url), { type: 'module' }));
  return api;
}
