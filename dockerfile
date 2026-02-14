FROM node:25-alpine

WORKDIR /app

COPY package.json *lock* ./

RUN npm install -g pm2-runtime

RUN yarn install --frozen-lockfile && yarn cache clean

COPY . .

EXPOSE 3000

CMD ["pm2-runtime", "ecosystem.config.cjs", "--env", "production"]