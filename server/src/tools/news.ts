import Parser from 'rss-parser';

const parser = new Parser({ timeout: 8000 });

const FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://rss.cnn.com/rss/edition.rss',
];

export async function getNews(topic?: string): Promise<string> {
  try {
    const feed = await parser.parseURL(FEEDS[0]);
    let items = feed.items.slice(0, 8);

    if (topic) {
      const t = topic.toLowerCase();
      const filtered = items.filter(
        (i) =>
          i.title?.toLowerCase().includes(t) ||
          i.contentSnippet?.toLowerCase().includes(t)
      );
      if (filtered.length > 0) items = filtered.slice(0, 5);
    }

    return items
      .slice(0, 5)
      .map((i) => `• ${i.title}${i.contentSnippet ? ': ' + i.contentSnippet.slice(0, 120) : ''}`)
      .join('\n');
  } catch {
    return 'Unable to fetch news at this time.';
  }
}
