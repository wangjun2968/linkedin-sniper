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
      if (request.method === "GET" && url.pathname === "/history") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(" ")[1];
        if (!token || !token.includes('.')) return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });
        const base64Url = token.split('.')[1];
        const payload = JSON.parse(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')));
        const results = await env.DB.prepare("SELECT * FROM history WHERE user_email = ? ORDER BY created_at DESC LIMIT 20").bind(payload.email).all();
        return new Response(JSON.stringify(results.results || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (request.method === "POST") {
        const body = await request.json();
        const { profileData, style, token } = body;
        let userEmail = null;

        if (token && typeof token === 'string' && token.includes('.')) {
          try {
            const parts = token.split('.');
            const base64Url = parts[1];
            const payload = JSON.parse(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.email) {
              userEmail = payload.email;
              await env.DB.prepare("INSERT INTO users (email, name, picture, last_login) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET last_login=excluded.last_login").bind(userEmail, payload.name || "User", payload.picture || "", Date.now()).run();
            }
          } catch (e) {}
        }

        if (!profileData) throw new Error("No data provided");

        const aiResponse = await fetch("https://api.xty.app/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `你是一名资深的 LinkedIn 招聘专家。请基于数据深度优化：${profileData}。
            【强制要求】：必须返回 JSON 对象且包含以下 4 个字段：
            1. aboutVersions: 5 个不同侧重点的 About 版块（字符串数组）
            2. headlines: 3 个优化的 Headline（字符串数组）
            3. postTopics: 5 个发帖选题（字符串数组）
            4. seoKeywords: 5 个针对该职位的 SEO 核心关键词（字符串数组）` }],
            response_format: { type: "json_object" }
          }),
        });

        const data = await aiResponse.json();
        let rawContent = data.choices[0].message.content;
        rawContent = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        const content = JSON.parse(rawContent);

        // 兜底补全，防止前端 map 崩溃
        content.aboutVersions = content.aboutVersions || [];
        content.headlines = content.headlines || [];
        content.postTopics = content.postTopics || [];
        content.seoKeywords = content.seoKeywords || ["LinkedIn", "Networking", "Career", "Skills", "Professional"];

        if (userEmail) {
          try {
            await env.DB.prepare("INSERT INTO history (user_email, style, input, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(userEmail, style || 'pro', profileData, JSON.stringify(content), Date.now()).run();
          } catch (dbErr) {}
        }

        return new Response(JSON.stringify(content), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }
};
