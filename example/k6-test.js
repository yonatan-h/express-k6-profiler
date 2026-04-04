import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1, // Virtual users
  duration: '1s', // Test duration
};

export default function () {
  const responses = http.batch([
    ['GET', 'http://localhost:3000/api/users'],
    ['GET', 'http://localhost:3000/api/orders'],
    ['GET', 'http://localhost:3000/api/items/deep'],
  ]);

  responses.forEach((res) => {
    check(res, {
      'status is 200': (r) => r.status === 200,
    });
  });

  const responses2 = http.batch([
    ['POST', 'http://localhost:3000/api/users'],
    ['POST', 'http://localhost:3000/api/orders'],
  ]);

  responses2.forEach((res) => {
    check(res, {
      'status is 201': (r) => r.status === 201,
    });
  });

  const responses3 = http.batch([
    ['POST', 'http://localhost:3000/api/items/deep'],
    ['POST', 'http://localhost:3000/api/non-existent'],
  ]);

  responses3.forEach((res) => {
    check(res, {
      'status is not 201': (r) => r.status !== 201,
    });
  });

  sleep(0.3);
}
