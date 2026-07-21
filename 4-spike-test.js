// Pengujian ini mensimulasikan lonjakan lalu lintas yang tiba-tiba dan besar

import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '10s', target: 100000 },
    { duration: '30s', target: 100000 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  http.get('schoolwebapp.com');
  sleep(1);
}