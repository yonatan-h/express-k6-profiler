import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 3, 
  duration: '4s', 
};

export default function () {
  http.batch([
    ['GET', 'http://localhost:3002/api/users/9001'],
    ['GET', 'http://localhost:3002/api/products'],
    ['GET', 'http://localhost:3002/api/status']
  ]);

  sleep(0.3);
}
