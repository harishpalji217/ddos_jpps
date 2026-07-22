#!/bin/bash

(
  while true; do
    tor
    sleep 2
  done
) &

for i in $(seq 1 30); do
  if timeout 2 bash -c 'echo > /dev/tcp/127.0.0.1/9050' 2>/dev/null; then
    break
  fi
  sleep 2
done

export HTTP_PROXY=socks5://localhost:9050
export HTTPS_PROXY=socks5://localhost:9050
export NO_PROXY=localhost,127.0.0.1

exec node server.js
