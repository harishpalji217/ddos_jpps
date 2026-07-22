import http from 'k6/http';

const TARGET = __ENV.TARGET_URL || 'https://schoolwebapp.com/';

export const options = {
  scenarios: {
    continuous: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 150 },
        { duration: '20s', target: 250 },
        { duration: '876000h', target: 250 },
      ],
      gracefulStop: '0s',
      gracefulRampDown: '0s',
    },
  },
};

export default function () {
  http.get(TARGET, { timeout: '10s' });
}