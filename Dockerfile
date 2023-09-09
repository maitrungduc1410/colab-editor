# Install dependencies only when needed
FROM node:18.17-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn --frozen-lockfile
COPY . .

RUN yarn build


# Rebuild the source code only when needed
FROM node:18.17-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package.prod.json package.json
COPY server.js server.js

RUN yarn install

EXPOSE 3000

CMD ["yarn", "start"]