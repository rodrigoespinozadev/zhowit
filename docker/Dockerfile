FROM node:stretch-slim
RUN apt-get update && apt-get install -y imagemagick
RUN npm install -g nodemon
RUN mkdir -p /usr/src/app
EXPOSE 3000
WORKDIR /usr/src/app