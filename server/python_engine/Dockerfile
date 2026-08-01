# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    HOME=/home/user

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and set up workspace (Hugging Face requirement)
RUN useradd -m -u 1000 user
WORKDIR $HOME/app

# Install PyTorch CPU-only first to keep image size small
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install all other python requirements
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    soundfile \
    gTTS \
    edge-tts \
    openai-whisper \
    qwen-tts \
    python-multipart \
    numpy \
    librosa \
    transformers \
    accelerate \
    einx \
    einops

# Copy application files (make sure to set ownership to user 1000)
COPY --chown=user:user . .

# Create the storage directory and set permissions
RUN mkdir -p storage && chown -R user:user storage

# Switch to non-root user
USER user

# Pre-download models to cache them during image build
# This prevents timeouts when the space starts up
RUN python -c "import whisper; whisper.load_model('base', device='cpu')" && \
    python -c "from qwen_tts import Qwen3TTSModel; import torch; Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-0.6B-Base', device_map='cpu', dtype=torch.bfloat16)"

# Expose port 7860 (Hugging Face requirement)
EXPOSE 7860

# Run the FastAPI server using Uvicorn
CMD ["uvicorn", "tts_worker:app", "--host", "0.0.0.0", "--port", "7860"]
