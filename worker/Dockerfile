FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends clamav ca-certificates libreoffice-impress fonts-crosextra-carlito fonts-crosextra-caladea fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY worker/build/run.mjs /app/run.mjs
COPY worker/start.sh /app/start.sh
RUN chmod +x /app/start.sh && chmod a+r /etc/clamav/freshclam.conf && mkdir -p /data && chown node:node /data /var/lib/clamav
USER node
ENV CATHEDRAL_WORKER_DATA=/data
ENV CLAMAV_DATABASE_DIR=/var/lib/clamav
ENTRYPOINT ["/app/start.sh"]
