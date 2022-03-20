FROM node:17

RUN apt-get update && apt-get install -y sox libsox-fmt-mp3

WORKDIR /audio-radio-stream

COPY package.json package-lock.json /audio-radio-stream/

RUN npm ci --silent

COPY . .

USER node

CMD npm run live-reload