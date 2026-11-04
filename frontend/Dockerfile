# Build stage
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production serve stage
FROM nginx:alpine

# htpasswd, used to create the basic-auth password file at start-up
RUN apk add --no-cache apache2-utils

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/10-containbench-auth.sh /docker-entrypoint.d/10-containbench-auth.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/10-containbench-auth.sh && \
    chmod +x /docker-entrypoint.d/10-containbench-auth.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
