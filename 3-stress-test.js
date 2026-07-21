import http from 'k6/http';
import { sleep } from 'k6';

const TARGET = __ENV.TARGET_URL || 'https://schoolwebapp.com/';

export const options = {
  stages: [
    { duration: '10s', target: 400 },
    { duration: '45s', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  http.get(TARGET);
  sleep(1);
}