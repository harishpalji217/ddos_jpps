#!/bin/bash
tor &
sleep 5
export HTTP_PROXY=socks5://localhost:9050
export HTTPS_PROXY=socks5://localhost:9050
exec node server.js
