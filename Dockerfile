# Multi-stage build for production - Frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Backend build stage
FROM node:18-alpine as backend-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install server dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ .

# Production stage
FROM node:18-alpine

# Install nginx for serving frontend
RUN apk add --no-cache nginx

# Copy built frontend assets
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy backend
COPY --from=backend-builder /app/server /app/server

# Copy nginx configuration for frontend
COPY nginx.conf /etc/nginx/http.d/default.conf

# Create startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 80 5000

# Start both services
CMD ["/docker-entrypoint.sh"]