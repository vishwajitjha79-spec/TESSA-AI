import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion } from '@/lib/groq';
import { getSystemPrompt } from '@/lib/prompts';
import { detectMoodFromText, detectMoodFromResponse } from '@/lib/mood';
import { searchWeb, scrapeWebpage } from '@/lib/search';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Message { role: string; content: string | any; }

export async function POST(request: NextRequest) {
  try {
    let body;
    try { 
      body = await request.json(); 
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { messages, isCreatorMode, currentMood, needsSearch, maxTokens = 600, _systemOverride, language } = body;

    // Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages:', messages);
      return NextResponse.json({ error: 'Valid messages array required' }, { status: 400 });
    }

    // Extract user message (handle both string and array content for images)
    const lastMessage = messages[messages.length - 1];
    let userMessage = '';
    
    try {
      if (typeof lastMessage.content === 'string') {
        userMessage = lastMessage.content;
      } else if (Array.isArray(lastMessage.content)) {
        // Multi-modal content (image + text)
        const textContent = lastMessage.content.find((c: any) => c.type === 'text');
        userMessage = textContent?.text || '';
        console.log('📷 Image message detected');
      }
    } catch (contentError) {
      console.error('Error extracting user message:', contentError);
      userMessage = 'Hello';
    }

    let searchContext = '';
    let webPages: string[] = [];

    // Web search (with error handling)
    if (needsSearch && userMessage) {
      try {
        const searchResults = await searchWeb(userMessage);
        if (searchResults?.length > 0) {
          const topResults = searchResults.slice(0, 3);
          
          // Scrape first result
          if (topResults[0]?.url) {
            try {
              const pg = await scrapeWebpage(topResults[0].url);
              if (pg) webPages.push(pg);
            } catch (scrapeError) {
              console.error('Scraping failed:', scrapeError);
            }
          }

          searchContext = '\n\n=== CURRENT WEB INFORMATION (Live Data) ===\n';
          if (webPages.length > 0) {
            searchContext += `\nFULL PAGE CONTENT:\n${webPages[0].slice(0, 3000)}\n`;
          }
          searchContext += '\nSEARCH RESULTS:\n';
          topResults.forEach((r, i) => {
            searchContext += `\n[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}\n`;
          });
          searchContext += '\n=== END WEB INFORMATION ===\n';
          searchContext += '\nIMPORTANT: Use this current web data to provide accurate, up-to-date information. Cite sources when relevant.\n';
        }
      } catch (searchError) {
        console.error('Search failed:', searchError);
        searchContext = '\n[Note: Web search failed, using existing knowledge]\n';
      }
    }

    // Prepare system prompt
    let systemPrompt;
    try {
      systemPrompt = _systemOverride
        ? String(_systemOverride)
        : getSystemPrompt(isCreatorMode || false, userMessage, language || 'en');
    } catch (promptError) {
      console.error('Error generating system prompt:', promptError);
      systemPrompt = 'You are T.E.S.S.A., a helpful AI assistant.';
    }

    // Prepare conversation messages - PRESERVE multi-modal content
    const conversationMessages: Message[] = [...messages];
    if (searchContext && typeof conversationMessages[conversationMessages.length - 1].content === 'string') {
      const last = conversationMessages[conversationMessages.length - 1];
      conversationMessages[conversationMessages.length - 1] = {
        ...last,
        content: last.content + searchContext,
      };
    }

    const fullMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages.slice(-20), // Pass messages as-is to preserve image data
    ];

    // Call Groq API with comprehensive error handling
    let groqResponse;
    try {
      // For complex queries (longer messages), lower temp for precision
      const isComplex = userMessage.length > 120 || /solve|calculate|explain|prove|derive|analyse|code|write|essay|compare/i.test(userMessage);
      const temperature = isComplex ? 0.4 : 0.75 + Math.random() * 0.15;
      groqResponse = await getChatCompletion(fullMessages, {
        temperature,
        maxTokens: Math.min(maxTokens, 2000), // Increased for complex answers
      });
    } catch (groqError: any) {
      console.error('Groq API error:', groqError);
      
      if (groqError.message?.includes('rate limit')) {
        return NextResponse.json({ 
          error: 'Too many requests. Please wait a moment and try again.' 
        }, { status: 429 });
      }
      
      if (groqError.message?.includes('context length')) {
        return NextResponse.json({ 
          error: 'Message too long. Please try a shorter message.' 
        }, { status: 400 });
      }

      if (groqError.message?.includes('authentication')) {
        return NextResponse.json({ 
          error: 'AI service configuration error. Please contact support.' 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        error: `AI service error: ${groqError.message || 'Unknown error'}` 
      }, { status: 500 });
    }

    const { content, usage } = groqResponse;

    if (!content || typeof content !== 'string') {
      console.error('Invalid Groq response:', groqResponse);
      return NextResponse.json({ 
        error: 'Received invalid response from AI service' 
      }, { status: 500 });
    }

    // Mood detection with fallback
    let newMood = currentMood || 'calm';
    try {
      const moodFromUser = detectMoodFromText(userMessage, currentMood || 'calm', isCreatorMode || false);
      const moodFromResponse = detectMoodFromResponse(content, userMessage, isCreatorMode || false);
      newMood = moodFromUser !== currentMood ? moodFromUser : moodFromResponse;
    } catch (moodError) {
      console.error('Mood detection error:', moodError);
    }

    return NextResponse.json({
      content,
      mood: newMood,
      usage,
      searchPerformed: !!searchContext,
      sourcesUsed: searchContext ? 'live web data' : 'knowledge base',
    });

  } catch (error: any) {
    console.error('Unhandled API error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred. Please try again.' 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
