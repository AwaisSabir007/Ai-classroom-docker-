import os
import tempfile
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
import whisper
import torch

app = FastAPI()
logging.basicConfig(level=logging.INFO)

# Load the model on startup. Options: tiny, base, small, medium, large
# We check if MPS (Apple Silicon) or CUDA is available to accelerate transcription
device = "cpu"
if torch.backends.mps.is_available():
    device = "mps"
elif torch.cuda.is_available():
    device = "cuda"

logging.info(f"Loading Whisper model (base) on device: {device}")
try:
    # Use base model as a good balance of speed vs accuracy for live transcription
    model = whisper.load_model("base", device=device)
    logging.info("Model loaded successfully.")
except Exception as e:
    logging.error(f"Failed to load Whisper model: {e}")
    model = None

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=500, detail="Whisper model not loaded.")

    # Save the uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        try:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save audio: {e}")

    # Transcribe
    try:
        logging.info(f"Transcribing audio file: {audio.filename} of size {len(content)} bytes")
        # We assume the file is small enough (few seconds) so transcription is fast
        result = model.transcribe(tmp_path, fp16=(device != "cpu"))
        text = result.get("text", "").strip()
        logging.info(f"Transcription result: {text}")
        return {"text": text}
    except Exception as e:
        logging.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
