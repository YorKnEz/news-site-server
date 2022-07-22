FROM node:14

USER node

RUN mkdir /home/node/app
WORKDIR /home/node/app

COPY ./package.json ./package-lock.json ./

RUN npm install

COPY . .
