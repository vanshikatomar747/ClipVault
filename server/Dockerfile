# Use official Node.js image as base
FROM node:18-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=10000

# Install Python and other required system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    libsndfile1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory for the Express server
WORKDIR /app

# Copy dependency files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy server code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript code
RUN npm run build

# Copy Python engine files
COPY python_engine/ ./python_engine/

# Install lightweight Python dependencies (skip heavy PyTorch / Qwen for free tier RAM limits)
RUN pip install --no-cache-dir --break-system-packages \
    fastapi \
    uvicorn \
    soundfile \
    gTTS \
    edge-tts \
    python-multipart \
    numpy \
    librosa

# Copy start script
COPY start.sh ./
RUN chmod +x start.sh

# Expose Node.js application port
EXPOSE 10000

# Start command
CMD ["./start.sh"]
