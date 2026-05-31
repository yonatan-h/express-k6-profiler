export const K_RECORDS = 'k-records';
export const K_RES_DATAS = 'k-res-datas';
export const K_INTERVALS = 'k-intervals';
export const K_BASE_I = 'k-base-i';
export const K_CUR_I = 'k-cur-i';

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
