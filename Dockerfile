FROM node:14-alpine

RUN apk update && apk add --no-cache bash

USER node

RUN mkdir /home/node/app
WORKDIR /home/node/app

COPY ./package.json ./package-lock.json ./

RUN npm install

COPY . .
