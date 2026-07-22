import http from 'k6/http';
import { sleep } from 'k6';

const TARGET = __ENV.TARGET_URL || 'https://schoolwebapp.com/';

export const options = {
  scenarios: {
    continuous: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 400 },
        { duration: '30s', target: 1000 },
      ],
      gracefulStop: '0s',
    },
  },
};

export default function () {
  http.get(TARGET);
  sleep(1);
}