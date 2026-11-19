const ORIGIN = "https://the-rascal-of-sakurasou.github.io";
const HEADERS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-anixia-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin"
};

Deno.serve((req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== ORIGIN) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403, headers: HEADERS
    });
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: HEADERS });
  return new Response(JSON.stringify({
    error: "Season metadata synchronization is paused. AniList is approved for poster-image use only; metadata synchronization requires a separate rights review."
  }), {
    status: 423,
    headers: HEADERS
  });
});
