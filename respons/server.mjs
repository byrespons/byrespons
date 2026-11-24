import { generateStory } from './generation.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/story.js', ['story.js', 'text/javascript']]
]);

const port = Number(process.env.RESPONS_PORT || 8765);
createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/status") {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
    const account = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_') ? {
      url: SUPABASE_URL,
      key: SUPABASE_PUBLISHABLE_KEY
    } : null;
    response.end(JSON.stringify({ ai: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL), account }));
    return;
  }
  if (request.method === "POST" && request.url === "/api/story") {
    await generateStory(request, response);
    return;
  }
  const file = files.get(request.url);
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  try {
    const contents = await readFile(new URL(file[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8' }).end(contents);
  } catch {
    response.writeHead(500).end('Kunne ikke åpne siden.');
  }
}).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port));
