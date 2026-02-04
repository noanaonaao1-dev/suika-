export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // GET /ranking - Fetch top scores
    if (url.pathname === "/ranking" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare(
          "SELECT score FROM rankings ORDER BY score DESC LIMIT 10"
        ).all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    // POST /ranking - Submit a new score
    if (url.pathname === "/ranking" && request.method === "POST") {
      try {
        const { score } = (await request.json()) as { score: number };
        if (typeof score !== "number") {
          return new Response("Invalid score", { status: 400, headers: corsHeaders });
        }

        await env.DB.prepare(
          "INSERT INTO rankings (score) VALUES (?)"
        ).bind(score).run();

        return new Response("OK", { status: 201, headers: corsHeaders });
      } catch (e: any) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
