# Stage 1: Build the frontend (including Rust-WASM)
FROM node:20-bookworm AS build-frontend
WORKDIR /app

# Install Rust for WASM compilation
RUN apt-get update && apt-get install -y curl build-essential
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run the server
FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build-frontend /app/dist ./dist
COPY --from=build-frontend /app/server ./server
COPY --from=build-frontend /app/shared ./shared
COPY .env .env

EXPOSE 5001
CMD ["npm", "start"]
