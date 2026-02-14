import axios from 'axios';
import * as cheerio from 'cheerio';
import { SearchResult } from '@/types';

export async function searchWithTavily(query: string): Promise<SearchResult[]> {
  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
      }
    );

    return response.data.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      content: result.content,
    }));
  } catch (error) {
    console.error('Tavily search error:', error);
    throw new Error('Search failed');
  }
}

export async function searchWithSerper(query: string): Promise<SearchResult[]> {
  try {
    const response = await axios.post(
      'https://google.serper.dev/search',
      { q: query },
      {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );

    const organic = response.data.organic || [];
    return organic.slice(0, 5).map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet || '',
    }));
  } catch (error) {
    console.error('Serper search error:', error);
    throw new Error('Search failed');
  }
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  if (process.env.TAVILY_API_KEY) {
    try {
      return await searchWithTavily(query);
    } catch (error) {
      console.log('Tavily failed, trying Serper...');
    }
  }

  if (process.env.SERPER_API_KEY) {
    try {
      return await searchWithSerper(query);
    } catch (error) {
      console.log('Serper failed');
    }
  }

  throw new Error('No search API configured');
}

export async function scrapeWebpage(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TessaBot/1.0)',
      },
    });

    const $ = cheerio.load(response.data);
    $('script, style, nav, header, footer, aside').remove();
    const content = $('article, main, .content, .post').text() || $('body').text();
    return content.replace(/\s+/g, ' ').trim().slice(0, 5000);
  } catch (error) {
    console.error('Scraping error:', error);
    return '';
  }
}
```

**Commit**

---

## ✅ AFTER ADDING ALL 5 FILES:

### Vercel Will Auto-Deploy!

1. **Wait 2-3 minutes**
2. **Check Vercel dashboard**
3. **See new deployment**
4. **Should succeed now!** ✅

---

## 🎯 VERIFY FILES ARE THERE:

Visit your repo: https://github.com/vishwajitjha79-spec/TESSA-AI

**You should see:**
```
lib/
  ├── mood.ts
  ├── groq.ts
  ├── profile.ts
  ├── prompts.ts
  └── search.ts
