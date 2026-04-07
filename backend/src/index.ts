export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    try {
      // 1. 获取历史记录逻辑 (GET /history)
      if (request.method === "GET" && url.pathname === "/history") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
        
        const token = authHeader.split(" ")[1];
        if (!token || !token.includes('.')) return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });

        const base64Url = token.split('.')[1];
        const payload = JSON.parse(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')));
        const userEmail = payload.email;

        const results = await env.DB.prepare(
          "SELECT * FROM history WHERE user_email = ? ORDER BY created_at DESC LIMIT 20"
        ).bind(userEmail).all();
        
        return new Response(JSON.stringify(results.results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 2. 狙击优化逻辑 (POST /)
      if (request.method === "POST") {
        const body = await request.json();
        const { profileData, style, token } = body;

        let userEmail = null;
        // 关键修复：增加对 token 的严格检查，防止未登录时崩溃
        if (token && typeof token === 'string' && token.includes('.')) {
          try {
            const parts = token.split('.');
            if (parts.length >= 2) {
              const base64Url = parts[1];
              const payload = JSON.parse(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')));
              if (payload.email) {
                userEmail = payload.email;
                await env.DB.prepare(
                  "INSERT INTO users (email, name, picture, last_login) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET last_login=excluded.last_login"
                ).bind(userEmail, payload.name || "User", payload.picture || "", Date.now()).run();
              }
            }
          } catch (e) { console.error("JWT Parse Fail:", e); }
        }

        if (!profileData) throw new Error("No data provided");

        const aiResponse = await fetch("https://api.xty.app/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ 
              role: "user", 
              content: `你是一名资深的 LinkedIn 招聘专家。请基于数据深度优化：${profileData}。输出 JSON 包含 aboutVersions (5个版本), headlines (3个), postTopics (5个), seoKeywords (5个)。` 
            }],
            response_format: { type: "json_object" }
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          throw new Error(`AI API error: ${aiResponse.status} - ${errText}`);
        }

        const data = await aiResponse.json();
        const content = JSON.parse(data.choices[0].message.content);

        if (userEmail) {
          try {
            await env.DB.prepare(
              "INSERT INTO history (user_email, style, input, result, created_at) VALUES (?, ?, ?, ?, ?)"
            ).bind(userEmail, style || 'pro', profileData, JSON.stringify(content), Date.now()).run();
          } catch (dbErr) { console.error("DB Record Error:", dbErr); }
        }

        return new Response(JSON.stringify(content), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  },
};
