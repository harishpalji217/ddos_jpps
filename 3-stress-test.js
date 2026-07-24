import http from 'k6/http';

const TARGET = __ENV.TARGET_URL || 'https://schoolwebapp.com/';
const MAX_VUS = parseInt(__ENV.MAX_VUS) || 200;

export const options = {
  scenarios: {
    continuous: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: Math.round(MAX_VUS * 0.75) },
        { duration: '20s', target: MAX_VUS },
        { duration: '876000h', target: MAX_VUS },
      ],
      gracefulStop: '0s',
      gracefulRampDown: '0s',
    },
  },
};

export default function () {
  http.batch([
    ['GET', TARGET, null, { timeout: '3s' }],
    ['GET', TARGET, null, { timeout: '3s' }],
    ['GET', TARGET, null, { timeout: '3s' }],
    ['GET', TARGET, null, { timeout: '3s' }],
    ['GET', TARGET, null, { timeout: '3s' }],
  ]);
}