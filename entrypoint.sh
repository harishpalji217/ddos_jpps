#!/bin/bash

cat > /tmp/torrc << 'EOF'
SocksPort 127.0.0.1:9050
MaxClientCircuitsPending 1024
LearnCircuitBuildTimeout 0
CircuitBuildTimeout 5
NumEntryGuards 10
NumDirectoryGuards 10
EOF

cat > /tmp/torrc2 << 'EOF'
SocksPort 127.0.0.1:9051
DataDirectory /tmp/tor2
MaxClientCircuitsPending 1024
LearnCircuitBuildTimeout 0
CircuitBuildTimeout 5
NumEntryGuards 10
NumDirectoryGuards 10
EOF

(
  while true; do tor -f /tmp/torrc; sleep 2; done
) &

(
  while true; do tor -f /tmp/torrc2; sleep 2; done
) &

for i in $(seq 1 60); do
  r1=$(timeout 2 bash -c 'echo > /dev/tcp/127.0.0.1/9050' 2>/dev/null && echo ok)
  r2=$(timeout 2 bash -c 'echo > /dev/tcp/127.0.0.1/9051' 2>/dev/null && echo ok)
  if [ "$r1" = ok ] && [ "$r2" = ok ]; then
    break
  fi
  sleep 2
done

exec node server.js
