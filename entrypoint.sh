#!/bin/bash

cat > /tmp/torrc << 'EOF'
SocksPort 127.0.0.1:9050
MaxClientCircuitsPending 4096
LearnCircuitBuildTimeout 0
CircuitBuildTimeout 5
NumEntryGuards 10
NumDirectoryGuards 10
EOF

(
  while true; do
    tor -f /tmp/torrc
    sleep 2
  done
) &

for i in $(seq 1 30); do
  if timeout 2 bash -c 'echo > /dev/tcp/127.0.0.1/9050' 2>/dev/null; then
    break
  fi
  sleep 2
done

exec node server.js
