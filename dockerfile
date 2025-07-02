# Etapa de construcción
FROM node:18-alpine AS builder
WORKDIR /app

# Instala dependencias de construcción (necesarias para puppeteer)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copia archivos esenciales primero (mejora el caching de capas)
COPY package.json package-lock.json ./
RUN npm ci --production

# Copia el resto de la aplicación
COPY . .

# Etapa final (imagen ligera)
FROM node:18-alpine
WORKDIR /app

# Instala solo runtime esencial
RUN apk add --no-cache \
    dumb-init \
    chromium

# Copia desde la etapa de construcción
COPY --from=builder /app /app
COPY --from=builder /usr/bin/chromium-browser /usr/bin/chromium-browser
COPY --from=builder /usr/lib/chromium /usr/lib/chromium

# Variables de entorno para Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROMIUM_PATH=/usr/bin/chromium-browser

# Usa usuario no-root por seguridad
RUN chown -R node:node /app
USER node

# Puerto y comando de inicio
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/index.js"]