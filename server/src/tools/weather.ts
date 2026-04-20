export async function getWeather(city: string): Promise<string> {
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { headers: { 'User-Agent': 'JARVIS/1.0' }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return `Could not get weather for ${city}.`;
    const data = (await res.json()) as Record<string, unknown>;
    const cur = (data.current_condition as Record<string, unknown>[])?.[0];
    if (!cur) return `Could not get weather for ${city}.`;
    const desc = (cur.weatherDesc as { value: string }[])?.[0]?.value ?? 'Unknown';
    return `${city}: ${desc}, ${cur.temp_C}°C (feels like ${cur.FeelsLikeC}°C), humidity ${cur.humidity}%, wind ${cur.windspeedKmph} km/h.`;
  } catch {
    return `Could not retrieve weather for ${city}.`;
  }
}
