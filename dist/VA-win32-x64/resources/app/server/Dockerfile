FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install nodemon globally for development
RUN npm install -g nodemon

# Copy backend code
COPY . .

# Run the backend using nodemon (dev) or node (prod)
CMD ["nodemon", "index.js"]
