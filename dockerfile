FROM node:18-alpine AS builder
WORKDIR /app

# Instala dependencias de construcción
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copia solo los archivos de dependencias (capa cacheable)
COPY package*.json ./
RUN npm ci --production

# Copia el resto de la aplicación
COPY . .

FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init chromium
COPY --from=builder /app /app
COPY --from=builder /usr/bin/chromium-browser /usr/bin/chromium-browser

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/index.js"]