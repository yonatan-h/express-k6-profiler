import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 100 },  // Ramp-up: 0 to 50 users over 2 minutes
    { duration: '5s', target: 100 },  // Ramp-up: 0 to 50 users over 2 minutes
    { duration: '5s', target: 0 },  // Ramp-up: 0 to 50 users over 2 minutes
    { duration: '5s', target: 0 },  // Ramp-up: 0 to 50 users over 2 minutes
    { duration: '30s', target: 50 },  // Steady state: Stay at 50 users for 5 minutes
    { duration: '5s', target: 0 },   // Ramp-down: 50 to 0 users over 2 minutes
  ],
};
const PORT = 3010;

export default function () {
  const responses = http.batch([
    ['GET', `http://localhost:${PORT}/api/users/551`],
    ['GET', `http://localhost:${PORT}/api/orders`],
    ['GET', `http://localhost:${PORT}/api/items/deep`],
  ]);

  responses.forEach((res) => {
    check(res, {
      'status is 200': (r) => r.status === 200,
    });
  });

  const responses2 = http.batch([
    ['POST', `http://localhost:${PORT}/api/users`],
    ['POST', `http://localhost:${PORT}/api/orders`],
  ]);

  responses2.forEach((res) => {
    check(res, {
      'status is 201': (r) => r.status === 201,
    });
  });

  const responses3 = http.batch([
    ['POST', `http://localhost:${PORT}/api/items/deep`],
    ['POST', `http://localhost:${PORT}/api/non-existent`],
  ]);

  responses3.forEach((res) => {
    check(res, {
      'status is not 201': (r) => r.status !== 201,
    });
  });

  const responses4 = http.batch([
    ['GET', `http://localhost:${PORT}/api/items/exclusive`],
  ]);

  responses4.forEach((res) => {
    check(res, {
      'status is 500': (r) => r.status === 500,
    });
  });

  sleep(0.3);
}
