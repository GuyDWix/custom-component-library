FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN sed -i "s#https://npm.dev.wixpress.com/api/npm/npm-repos/#https://registry.npmjs.org/#g" package-lock.json && npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production
CMD ["npm", "start"]
