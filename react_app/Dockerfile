FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   

FROM node:18-alpine
RUN npm install -g serve   
WORKDIR /app
COPY --from=build /app/dist ./
EXPOSE 80
CMD ["serve", "-p", "80", "."]