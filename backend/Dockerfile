# ---- Builder Stage ----
# This stage installs dependencies and builds the application.
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies like typescript) needed to build.
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the application
RUN npm run build

# Prune devDependencies for copying into the production stage.
RUN npm prune --omit=dev

# ---- Production Stage ----
# This stage creates the final, lean image for production.
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user and group for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the necessary artifacts from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json .

# Change ownership of the files to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

EXPOSE 3000
CMD ["node", "dist/index.js"]
