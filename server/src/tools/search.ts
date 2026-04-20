export async function searchWeb(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JARVIS/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json()) as Record<string, unknown>;

    if (data.AbstractText) {
      return `${data.AbstractText}\nSource: ${data.AbstractURL}`;
    }

    const topics = (data.RelatedTopics as { Text?: string }[] | undefined) ?? [];
    const lines = topics
      .filter((t) => t.Text)
      .slice(0, 4)
      .map((t) => `• ${t.Text}`);

    return lines.length > 0
      ? lines.join('\n')
      : `No instant results found. Recommend opening: https://www.google.com/search?q=${encodeURIComponent(query)}`;
  } catch {
    return `Search failed. Try: https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
}
