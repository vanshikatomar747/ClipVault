from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
import uvicorn
import os
import uuid
import soundfile as sf
from gtts import gTTS
import edge_tts
import re
import numpy as np

app = FastAPI(title="ClipVault Qwen3-TTS Worker")


STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

device = "cpu"
try:
    import torch
    if torch.backends.mps.is_available():
        device = "mps"
    elif torch.cuda.is_available():
        device = "cuda"
except ImportError:
    pass

whisper_model = None
qwen_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        import whisper
        print(f"Lazy loading Whisper Model on {device}...")
        whisper_model = whisper.load_model("base", device=device)
    return whisper_model

def get_qwen_model():
    global qwen_model
    if qwen_model is None:
        import torch
        from qwen_tts import Qwen3TTSModel
        print(f"Lazy loading Qwen3-TTS (0.6B-Base) Model on {device} in bfloat16...")
        qwen_model = Qwen3TTSModel.from_pretrained(
            "Qwen/Qwen3-TTS-12Hz-0.6B-Base", 
            device_map=device, 
            dtype=torch.bfloat16
        )
    return qwen_model

def trim_silence(wav, sr, threshold_abs=0.015, frame_length=2048, hop_length=512):
    """
    Trims trailing static noise/silence from a 1D audio waveform.
    """
    num_frames = (len(wav) - frame_length) // hop_length + 1
    rms = np.zeros(num_frames)
    for i in range(num_frames):
        start = i * hop_length
        end = start + frame_length
        frame = wav[start:end]
        if len(frame) > 0:
            rms[i] = np.sqrt(np.mean(frame**2))
        else:
            rms[i] = 0
            
    # Find active frames above absolute threshold
    active_frames = np.where(rms > threshold_abs)[0]
    if len(active_frames) == 0:
        return wav
        
    last_active_frame = active_frames[-1]
    last_active_sample = last_active_frame * hop_length + frame_length
    
    # Pad 0.5s of silence so it decays naturally
    padding_samples = int(sr * 0.5)
    end_sample = min(len(wav), last_active_sample + padding_samples)
    return wav[:end_sample]

@app.post("/clone_voice")
async def clone_voice(audio: UploadFile = File(...)):
    try:
        embedding_path = os.path.join(STORAGE_DIR, f"emb_{uuid.uuid4().hex}.wav")
        with open(embedding_path, "wb") as f:
            f.write(await audio.read())
            
        # Transcribe the audio using whisper to use as ref_text for Qwen3-TTS
        transcript = ""
        model_whisper = get_whisper_model()
        if model_whisper:
            print("Transcribing reference audio...")
            result = model_whisper.transcribe(embedding_path)
            transcript = result["text"].strip()
            print(f"Transcription: {transcript}")
            
        # Save transcript alongside the audio file
        txt_path = embedding_path.replace(".wav", ".txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(transcript)
        
        return {"embedding_path": embedding_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate")
async def generate_tts(
    text: str = Form(...),
    voice: str = Form(...),
    accent: str = Form(...)
):
    output_path = os.path.join(STORAGE_DIR, f"out_{uuid.uuid4().hex}.mp3")
    try:
        print(f"=== RECEIVED TEXT FOR TTS ===\n{text}\n=============================")
        
        # Map voice and accent to edge-tts voice names
        voice_map = {
            'american': {
                'male': 'en-US-GuyNeural',
                'female': 'en-US-AriaNeural'
            },
            'british': {
                'male': 'en-GB-RyanNeural',
                'female': 'en-GB-SoniaNeural'
            },
            'indian': {
                'male': 'en-IN-PrabhatNeural',
                'female': 'en-IN-NeerjaNeural'
            }
        }
        
        selected_accent = accent.lower() if accent and accent.lower() in voice_map else 'american'
        selected_voice = voice.lower() if voice and voice.lower() in ['male', 'female'] else 'female'
        voice_name = voice_map[selected_accent][selected_voice]
        
        print(f"Generating TTS using Edge TTS voice: {voice_name}")
        communicate = edge_tts.Communicate(text, voice_name)
        await communicate.save(output_path)
        
        return FileResponse(output_path, media_type="audio/mpeg")
    except Exception as e:
        print(f"Edge TTS generation failed: {e}. Falling back to gTTS...")
        try:
            tld = 'com'
            if accent == 'british':
                tld = 'co.uk'
            elif accent == 'indian':
                tld = 'co.in'
            tts = gTTS(text=text, lang='en', tld=tld)
            tts.save(output_path)
            return FileResponse(output_path, media_type="audio/mpeg")
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail=str(fallback_err))

@app.post("/generate_cloned")
def generate_cloned_tts(
    text: str = Form(...),
    embedding_path: str = Form(...)
):
    try:
        print(f"=== RECEIVED TEXT FOR CLONED TTS ===\n{text}\n=============================")
        if not os.path.exists(embedding_path):
            raise HTTPException(status_code=404, detail="Voice embedding not found")
            
        output_path = os.path.join(STORAGE_DIR, f"cloned_{uuid.uuid4().hex}.wav")
        
        model_qwen = get_qwen_model()
        if model_qwen is None:
            raise HTTPException(status_code=500, detail="Failed to load Qwen3-TTS model")
            
        # Load the transcript text
        txt_path = embedding_path.replace(".wav", ".txt")
        ref_text = ""
        if os.path.exists(txt_path):
            with open(txt_path, "r", encoding="utf-8") as f:
                ref_text = f.read().strip()
                
        print(f"Generating cloned audio using Qwen3-TTS on {device}...")
        print(f"Reference Text: {ref_text}")
        
        # Split text into sentences for optimized chunked generation
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        print(f"Splitting text into {len(sentences)} sentences for chunked generation.")
        
        all_wavs = []
        sr_final = 24000
        
        for i, sentence in enumerate(sentences):
            word_count = len(sentence.split())
            max_tokens = max(100, word_count * 15 + 100)
            print(f"Generating sentence {i+1}/{len(sentences)} ('{sentence}') with max_new_tokens={max_tokens}...")
            
            wavs, sr = model_qwen.generate_voice_clone(
                text=sentence,
                language="English",
                ref_audio=embedding_path,
                ref_text=ref_text,
                max_new_tokens=max_tokens
            )
            sr_final = sr
            
            # Trim trailing silence/static from this sentence's waveform
            clean_wav = trim_silence(wavs[0], sr)
            all_wavs.append(clean_wav)
            
            # Add short silence (0.2s) between sentences
            if i < len(sentences) - 1:
                silence = np.zeros(int(sr * 0.2), dtype=np.float32)
                all_wavs.append(silence)
                
        combined_wav = np.concatenate(all_wavs, axis=0)
        sf.write(output_path, combined_wav, sr_final)
        
        return FileResponse(output_path, media_type="audio/wav")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
