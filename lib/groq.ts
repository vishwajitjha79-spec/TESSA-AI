import Groq from 'groq-sdk';

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY,
});

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function getChatCompletion(
  messages: Array<{ role: string; content: string | any }>,
  options: ChatCompletionOptions = {}
) {
  const { 
    model = 'llama-3.3-70b-versatile', 
    temperature = 1.0, 
    maxTokens = 600 
  } = options;

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  const safeTemp = Math.min(Math.max(temperature, 0), 2);
  const safeTokens = Math.min(Math.max(maxTokens, 50), 1400);

  // ═══ FIX: Check for images and strip them (Groq doesn't support vision) ═══
  const hasImage = messages.some(m => 
    Array.isArray(m.content) && 
    m.content.some((c: any) => c.type === 'image')
  );

  // If image detected, convert to text-only
  const processedMessages = hasImage 
    ? messages.map(m => {
        if (Array.isArray(m.content)) {
          const textContent = m.content.find((c: any) => c.type === 'text');
          return {
            role: m.role,
            content: textContent?.text || 'What do you see in this image?'
          };
        }
        return m;
      })
    : messages;

  try {
    const completion = await groq.chat.completions.create({
      messages: processedMessages as any,
      model,
      temperature: safeTemp,
      max_tokens: safeTokens,
      top_p: 1,
      stream: false,
    });

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('Empty response from Groq API');
    }

    return {
      content: completion.choices[0].message.content,
      usage: completion.usage,
    };
  } catch (error: any) {
    console.error('Groq API Error Details:', {
      error: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    
    if (error.status === 401) {
      throw new Error('Invalid API key. Please check your GROQ_API_KEY configuration.');
    }

    if (error.status === 400) {
      throw new Error(`Invalid request: ${error.message || 'Bad request to Groq API'}`);
    }

    if (error.message?.includes('context_length_exceeded')) {
      throw new Error('Message is too long. Please try a shorter message.');
    }

    throw new Error(`Groq API Error: ${error.message || 'Unknown error occurred'}`);
  }
}

export { groq };
