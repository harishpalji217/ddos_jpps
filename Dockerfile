FROM node:18-bullseye

RUN apt-get update && apt-get install -y gnupg ca-certificates wget && \
    wget -q -O - https://dl.k6.io/key.gpg | gpg --dearmor -o /usr/share/keyrings/k6.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/k6.gpg] https://dl.k6.io/deb stable main" | tee /etc/apt/sources.list.d/k6.list && \
    apt-get update && apt-get install -y k6 tor && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
CMD ["/entrypoint.sh"]
