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
  messages: Array<{ role: string; content: string }>,
  options: ChatCompletionOptions = {}
) {
  const {
    model = 'llama-3.3-70b-versatile',
    temperature = 1.0,
    maxTokens = 300,
  } = options;

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: completion.usage,
    };
  } catch (error: any) {
    console.error('Groq API Error:', error);
    throw new Error(`AI Error: ${error.message}`);
  }
}

export { groq };
