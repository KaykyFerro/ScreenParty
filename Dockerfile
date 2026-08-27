FROM node:20-alpine

WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY server ./server
COPY web ./web

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["node", "server/server.js"]
