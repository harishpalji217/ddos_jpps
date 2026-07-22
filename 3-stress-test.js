import http from 'k6/http';
import { sleep } from 'k6';

const TARGET = __ENV.TARGET_URL || 'https://schoolwebapp.com/';

export const options = {
  stages: [
    { duration: '10s', target: 400 },
    { duration: '45s', target: 1000 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  http.get(TARGET);
  sleep(1);
}