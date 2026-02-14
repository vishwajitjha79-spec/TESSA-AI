import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion } from '@/lib/groq';
import { getSystemPrompt } from '@/lib/prompts';
import { detectMoodFromText, detectMoodFromResponse } from '@/lib/mood';
import { searchWeb } from '@/lib/search';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { messages, isCreatorMode, currentMood, needsSearch, maxTokens = 600 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    let searchContext = '';
    if (needsSearch) {
      try {
        const lastUserMessage = messages[messages.length - 1].content;
        const searchResults = await searchWeb(lastUserMessage);
        
        // Enhanced search context with more details
        searchContext = '\n\nCURRENT WEB SEARCH RESULTS (Live Data from 2024-2026):\n' + 
          searchResults.map((r, i) => 
            `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}\n`
          ).join('\n');
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
      ...conversationMessages.slice(-25) // Increased context window
    ];

    let groqResponse;
    try {
      groqResponse = await getChatCompletion(fullMessages, {
        temperature: 0.85 + Math.random() * 0.3, // 0.85-1.15
        maxTokens: maxTokens, // Use setting from frontend
      });
    } catch (groqError: any) {
      console.error('Groq API error:', groqError);
      return NextResponse.json(
        { error: `AI API Error: ${groqError.message || 'Failed to get AI response'}` },
        { status: 500 }
      );
    }

    const { content, usage } = groqResponse;

    const userMessage = messages[messages.length - 1].content;
    const moodFromUser = detectMoodFromText(userMessage, currentMood || 'calm', isCreatorMode || false);
    const moodFromResponse = detectMoodFromResponse(content, userMessage, isCreatorMode || false);
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
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
