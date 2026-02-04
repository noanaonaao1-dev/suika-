export interface Env {
  RANKING_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const KV_KEY = "top_scores";

    // GET /ranking
    if (url.pathname === "/ranking" && request.method === "GET") {
      const data = await env.RANKING_KV.get(KV_KEY, "json") || [];
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /ranking
    if (url.pathname === "/ranking" && request.method === "POST") {
      try {
        const { score } = (await request.json()) as { score: number };
        if (typeof score !== "number") {
          return new Response("Invalid score", { status: 400, headers: corsHeaders });
        }

        // Fetch current ranking
        let ranking = (await env.RANKING_KV.get<{ score: number }[]>(KV_KEY, "json")) || [];

        // Add new score and sort
        ranking.push({ score });
        ranking.sort((a, b) => b.score - a.score);

        // Keep top 10
        ranking = ranking.slice(0, 10);

        // Save back to KV
        await env.RANKING_KV.put(KV_KEY, JSON.stringify(ranking));

        return new Response("OK", { status: 201, headers: corsHeaders });
      } catch (e: any) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
