import type { ResponseData } from "../../shared-types";

const KEY = 'prev-response-datas';

export function storePrevBackendState(state: Record<string, ResponseData>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to store previous backend state:', err);
  }
}

export function getPrevBackendState(): Record<string, ResponseData> {
  try {
    const item = localStorage.getItem(KEY);
    if (item) {
      return JSON.parse(item);
    }
  } catch (err) {
    console.error('Failed to retrieve previous backend state:', err);
  }
  return {};
}
