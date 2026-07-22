FROM node:18-bullseye

RUN apt-get update && apt-get install -y gnupg ca-certificates wget && \
    wget -q -O - https://dl.k6.io/key.gpg | gpg --dearmor -o /usr/share/keyrings/k6.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/k6.gpg] https://dl.k6.io/deb stable main" | tee /etc/apt/sources.list.d/k6.list && \
    wget -q -O - https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc | gpg --dearmor -o /usr/share/keyrings/tor.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/tor.gpg] https://deb.torproject.org/torproject.org bullseye main" | tee /etc/apt/sources.list.d/tor.list && \
    apt-get update && apt-get install -y k6 deb.torproject.org-keyring tor && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
CMD ["/entrypoint.sh"]
