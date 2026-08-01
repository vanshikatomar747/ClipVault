

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/generate`;
const MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

export type SummaryType = 'quick' | 'detailed' | 'bullet' | 'action';

function getPromptTemplate(type: SummaryType, content: string): string {
  switch (type) {
    case 'quick':
      return `You are an expert summarization assistant.
Summarize the following content in 4-7 concise sentences.
Focus only on the most important information.
Avoid repetition.

Text:
${content}`;
    case 'detailed':
      return `You are an expert summarization assistant.
Generate a detailed summary of the following content.
Preserve important context, major ideas, explanations, and conclusions.
Remove duplicate information while keeping the summary easy to read.

Text:
${content}`;
    case 'bullet':
      return `You are an expert summarization assistant.
Convert the following content into organized bullet points.
Group related ideas together.
Keep the output clean and easy to scan.

Text:
${content}`;
    case 'action':
      return `You are an expert productivity assistant.
Read the following content.
Extract only:
- Tasks
- Important reminders
- Action items
- Deadlines
- Decisions
- Important URLs
- Key takeaways

Ignore everything else.

Text:
${content}`;
    default:
      return content;
  }
}

/**
 * Checks if Ollama (or a configured cloud LLM API) is available.
 */
export async function checkOllamaStatus(): Promise<boolean> {
  if (process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY) {
    return true; // Cloud API is configured and active
  }

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) return false;
    const data = await res.json();
    const models = data.models || [];
    return models.some((m: any) => m.name === MODEL || m.name === 'llama3.2:latest');
  } catch (error: any) {
    console.warn(`Ollama status check failed: ${error.message || error}`);
    return false;
  }
}

/**
 * Generates a summary for a given text.
 * Bypasses local Ollama and uses Gemini or Groq API if configured, falling back to local Ollama.
 */
export async function generateSummaryText(type: SummaryType, text: string, signal?: AbortSignal): Promise<string> {
  const prompt = getPromptTemplate(type, text);

  // 1. Check Gemini Cloud API
  if (process.env.GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`Gemini API error! HTTP status: ${response.status}`);
      }

      const data = await response.json();
      const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (outputText) return outputText;
      throw new Error('Empty response from Gemini API');
    } catch (error: any) {
      console.error('Gemini API Error:', error?.message);
      throw error;
    }
  }

  // 2. Check Groq Cloud API (OpenAI-compatible)
  if (process.env.GROQ_API_KEY) {
    try {
      const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`Groq API error! HTTP status: ${response.status}`);
      }

      const data = await response.json();
      const outputText = data.choices?.[0]?.message?.content;
      if (outputText) return outputText;
      throw new Error('Empty response from Groq API');
    } catch (error: any) {
      console.error('Groq API Error:', error?.message);
      throw error;
    }
  }

  // 3. Fallback to Local Ollama
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error: any) {
    console.error('Ollama Error:', error?.message);
    throw new Error('Failed to connect to Ollama. Ensure Ollama is running locally with the llama3.2:3b model.');
  }
}
