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

  // Validate API key
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  // Validate messages
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  // Cap temperature
  const safeTemp = Math.min(Math.max(temperature, 0), 2);
  
  // Cap tokens
  const safeTokens = Math.min(Math.max(maxTokens, 50), 1400);

  try {
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model,
      temperature: safeTemp,
      max_tokens: safeTokens,
      top_p: 1,
      stream: false,
    });

    // Validate response
    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('Empty response from Groq API');
    }

    return {
      content: completion.choices[0].message.content,
      usage: completion.usage,
    };
  } catch (error: any) {
    // Enhanced error logging
    console.error('Groq API Error Details:', {
      error: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    // Rethrow with more context
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
