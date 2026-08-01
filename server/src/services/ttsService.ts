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
    try {
      const cleanedText = this.cleanText(text);
      const form = new FormData();
      form.append('text', cleanedText);
      form.append('voice', voice);
      form.append('accent', accent);

      console.log(`[TTS] Requesting standard TTS from Python worker at: ${PYTHON_ENGINE_URL}/generate`);
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
    } catch (error: any) {
      console.error('[TTS AXIOS ERROR]', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data ? Buffer.from(error.response.data).toString('utf8') : null
      });
      throw error;
    }
  }

  /**
   * Generates cloned TTS using saved embedding
   */
  static async generateClonedTTS(text: string, embeddingPath: string, signal?: AbortSignal): Promise<string> {
    try {
      const cleanedText = this.cleanText(text);
      const form = new FormData();
      form.append('text', cleanedText);
      form.append('embedding_path', embeddingPath);

      console.log(`[TTS] Requesting cloned TTS from Python worker at: ${PYTHON_ENGINE_URL}/generate_cloned`);
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
    } catch (error: any) {
      console.error('[TTS CLONED AXIOS ERROR]', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data ? Buffer.from(error.response.data).toString('utf8') : null
      });
      throw error;
    }
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
