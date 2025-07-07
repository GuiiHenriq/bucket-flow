FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Install additional type definitions
RUN npm install --save-dev @types/node @types/react @types/react-dom --legacy-peer-deps

# Build the application
RUN npm run build

EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]