export const K_RECORDS = 'k-records';
export const K_ACTIVE_RECORD = 'k-active-record';
export const K_RES = 'k-res-datas';
export const K_BASE_I = 'k-base-i';
export const K_CUR_I = 'k-cur-i';
export const K_SELECTED_TD = 'k-selected-td';

export function set(key: string, x: any) {
  localStorage.setItem(key, JSON.stringify(x));
}

export function get<T>(key: string, byDefault: T) {
  const item = localStorage.getItem(key);
  if (item != null) {
    return JSON.parse(item) as T;
  } else {
    return byDefault;
  }
}
