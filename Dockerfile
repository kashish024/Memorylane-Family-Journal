# Dockerfile for MemoryLane Backend
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Expose port (if you have a backend server)
EXPOSE 3000

# Start command
CMD ["npm", "start"]