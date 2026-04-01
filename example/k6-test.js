import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5, // Virtual users
  duration: '1s', // Test duration
};

export default function () {
  const responses = http.batch([
    ['GET', 'http://localhost:3000/api/users'],
    ['GET', 'http://localhost:3000/api/orders'],
  ]);

  responses.forEach((res) => {
    check(res, {
      'status is 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);
}
