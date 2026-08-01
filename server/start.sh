#!/bin/bash

# Start the Python TTS worker in the background on port 8000
echo "Starting Python TTS worker on port 8000..."
python3 python_engine/tts_worker.py &

# Wait for 3 seconds to let the Python service initialize
sleep 3

# Start the Node.js Express server in the foreground
echo "Starting Express server on port ${PORT:-4000}..."
exec node dist/index.js
