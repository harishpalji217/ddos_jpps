import http from 'k6/http';
import { sleep } from 'k6';

const TARGET = __ENV.TARGET_URL || 'https://schoolwebapp.com/';

export const options = {
  scenarios: {
    continuous: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '20s', target: 150 },
        { duration: '876000h', target: 150 },
      ],
      gracefulStop: '0s',
      gracefulRampDown: '0s',
    },
  },
};

export default function () {
  http.get(TARGET);
  sleep(1);
}