import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://127.0.0.1:8000';

export class TTSService {
  
  static cleanText(text: string): string {
    // Strip HTML tags using regex and decode common entities
    const plainText = text
      .replace(/<[^>]*>?/gm, ' ') // replace HTML tags with spaces
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .trim();
    return plainText;
  }

  /**
   * Generates standard TTS
   */
  static async generateStandardTTS(text: string, voice: string, accent: string, signal?: AbortSignal): Promise<string> {
    const cleanedText = this.cleanText(text);
    const form = new FormData();
    form.append('text', cleanedText);
    form.append('voice', voice);
    form.append('accent', accent);

    const response = await axios.post(`${PYTHON_ENGINE_URL}/generate`, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
      signal
    });

    const fileName = `tts_${Date.now()}.mp3`;
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = path.join(dir, fileName);
    fs.writeFileSync(tempPath, response.data);
    return `/uploads/${fileName}`;
  }

  /**
   * Generates cloned TTS using saved embedding
   */
  static async generateClonedTTS(text: string, embeddingPath: string, signal?: AbortSignal): Promise<string> {
    const cleanedText = this.cleanText(text);
    const form = new FormData();
    form.append('text', cleanedText);
    form.append('embedding_path', embeddingPath);

    const response = await axios.post(`${PYTHON_ENGINE_URL}/generate_cloned`, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
      signal
    });

    const fileName = `tts_cloned_${Date.now()}.wav`;
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = path.join(dir, fileName);
    fs.writeFileSync(tempPath, response.data);
    return `/uploads/${fileName}`;
  }

  /**
   * Clones a voice by extracting embeddings
   */
  static async cloneVoice(audioPath: string): Promise<string> {
    const form = new FormData();
    form.append('audio', fs.createReadStream(audioPath));

    const response = await axios.post(`${PYTHON_ENGINE_URL}/clone_voice`, form, {
      headers: form.getHeaders()
    });

    return response.data.embedding_path;
  }
}
