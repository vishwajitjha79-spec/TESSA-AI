import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion } from '@/lib/groq';
import { getSystemPrompt } from '@/lib/prompts';
import { detectMoodFromText, detectMoodFromResponse } from '@/lib/mood';
import { searchWeb, scrapeWebpage } from '@/lib/search';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Message {
  role: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { messages, isCreatorMode, currentMood, needsSearch, maxTokens = 600 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const userMessage = messages[messages.length - 1].content;
    let searchContext = '';
    let webPages: string[] = [];

    // Enhanced search intelligence
    if (needsSearch) {
      try {
        console.log('🔍 Searching web for:', userMessage);
        const searchResults = await searchWeb(userMessage);
        
        if (searchResults && searchResults.length > 0) {
          // Get top 3 results
          const topResults = searchResults.slice(0, 3);
          
          // Try to scrape full content from top result
          if (topResults[0]?.url) {
            try {
              console.log('📄 Scraping:', topResults[0].url);
              const pageContent = await scrapeWebpage(topResults[0].url);
              if (pageContent) {
                webPages.push(pageContent);
              }
            } catch (scrapeError) {
              console.log('❌ Scraping failed, using snippets');
            }
          }

          // Build enhanced search context
          searchContext = '\n\n=== CURRENT WEB INFORMATION (Live Data) ===\n';
          
          if (webPages.length > 0) {
            searchContext += `\nFULL PAGE CONTENT:\n${webPages[0].slice(0, 3000)}\n`;
          }
          
          searchContext += '\nSEARCH RESULTS:\n';
          topResults.forEach((r, i) => {
            searchContext += `\n[${i + 1}] ${r.title}\n`;
            searchContext += `${r.snippet}\n`;
            searchContext += `URL: ${r.url}\n`;
          });
          
          searchContext += '\n=== END WEB INFORMATION ===\n';
          searchContext += '\nIMPORTANT: Use this current web data to provide accurate, up-to-date information. Cite sources when relevant.\n';
        }
      } catch (error) {
        console.error('Search error:', error);
        searchContext = '\n[Note: Web search failed, using existing knowledge]\n';
      }
    }

    // Get system prompt with user message context
    const systemPrompt = getSystemPrompt(isCreatorMode, userMessage);
    
    // Build conversation with search context
    const conversationMessages: Message[] = [...messages];
    if (searchContext) {
      const lastMsg = conversationMessages[conversationMessages.length - 1];
      conversationMessages[conversationMessages.length - 1] = {
        ...lastMsg,
        content: lastMsg.content + searchContext
      };
    }

    // Add context window (keep last 20 messages)
    const fullMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages.slice(-20)
    ];

    // Call Groq API
    let groqResponse;
    try {
      groqResponse = await getChatCompletion(fullMessages, {
        temperature: 0.85 + Math.random() * 0.25, // 0.85-1.1
        maxTokens,
      });
    } catch (groqError: any) {
      console.error('Groq API error:', groqError);
      return NextResponse.json(
        { error: `AI Error: ${groqError.message || 'Failed to get response'}` },
        { status: 500 }
      );
    }

    const { content, usage } = groqResponse;

    // Detect mood
    const moodFromUser = detectMoodFromText(userMessage, currentMood || 'calm', isCreatorMode || false);
    const moodFromResponse = detectMoodFromResponse(content, userMessage, isCreatorMode || false);
    const newMood = moodFromUser !== currentMood ? moodFromUser : moodFromResponse;

    return NextResponse.json({
      content,
      mood: newMood,
      usage,
      searchPerformed: !!searchContext,
      sourcesUsed: searchContext ? 'live web data' : 'knowledge base'
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
