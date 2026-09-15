FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); p.workspaces=['apps/api','packages/shared']; fs.writeFileSync('package.json', JSON.stringify(p,null,2));" \
  && npm install --omit=dev --workspace=@savorly/api --workspace=@savorly/shared --include-workspace-root

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "run", "start:hosted"]
