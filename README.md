# How to run news-site-server

## Docker

### Install docker

You will need [docker](https://docs.docker.com/get-started/overview/) and [docker-compose](https://docs.docker.com/compose/).

### Fill in the environment variables

### `MAIL_USER` and `MAIL_PASS`

A functioning mail account is required for sending confirmation emails to the client

### `PRIVATEKEY`

This is required for JWT token encryption

### Build and run the container

`docker-compose build`

`docker-compose up`

## Node

### Install the dependencies using `npm install`

### Fill in the environment variables just like for the Docker section

### Run the repo

nodemon src/index.js

## Notes

You can change the other environment variables too

### `DB_` variables

These are required for the db connection, change them as you see fit

### Ports

You can change the ports of the Apollo or Express servers as you wish, the client port must match the port of the client, so this can't be changed without changing the client port.
