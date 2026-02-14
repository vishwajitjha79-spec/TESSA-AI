import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion } from '@/lib/groq';
import { getSystemPrompt } from '@/lib/prompts';
import { detectMoodFromText, detectMoodFromResponse } from '@/lib/mood';
import { searchWeb } from '@/lib/search';

export async function POST(request: NextRequest) {
  try {
    const { messages, isCreatorMode, currentMood, needsSearch } = await request.json();

    let searchContext = '';
    if (needsSearch) {
      try {
        const lastUserMessage = messages[messages.length - 1].content;
        const searchResults = await searchWeb(lastUserMessage);
        
        searchContext = '\n\nWEB SEARCH RESULTS:\n' + 
          searchResults.map((r, i) => 
            `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
          ).join('\n\n');
      } catch (error) {
        console.error('Search failed:', error);
      }
    }

    const systemPrompt = getSystemPrompt(isCreatorMode);
    
    const conversationMessages = [...messages];
    if (searchContext && conversationMessages.length > 0) {
      conversationMessages[conversationMessages.length - 1] = {
        ...conversationMessages[conversationMessages.length - 1],
        content: conversationMessages[conversationMessages.length - 1].content + searchContext
      };
    }

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages.slice(-20)
    ];

    const { content, usage } = await getChatCompletion(fullMessages, {
      temperature: 0.9 + Math.random() * 0.3,
      maxTokens: 200 + Math.floor(Math.random() * 200),
    });

    const userMessage = messages[messages.length - 1].content;
    const moodFromUser = detectMoodFromText(userMessage, currentMood, isCreatorMode);
    const moodFromResponse = detectMoodFromResponse(content, userMessage, isCreatorMode);
    const newMood = moodFromUser !== currentMood ? moodFromUser : moodFromResponse;

    return NextResponse.json({
      content,
      mood: newMood,
      usage,
      searchPerformed: !!searchContext
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response' },
      { status: 500 }
    );
  }
}
