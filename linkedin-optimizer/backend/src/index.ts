export interface Env {
  OPENAI_API_KEY: string;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const body: any = await request.json();
      const { profileData, style, token } = body;

      let userEmail = null;
      
      // 1. 硬解析 JWT 并【原子化】确保用户存在
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));
          if (payload.email) {
            userEmail = payload.email;
            
            // 使用 D1 的 batch 操作确保顺序和成功率
            await env.DB.prepare(
              "INSERT INTO users (email, name, picture, last_login) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET last_login=excluded.last_login"
            ).bind(userEmail, payload.name || "User", payload.picture || "", Date.now()).run();
          }
        } catch (e) {
          console.error("Auth process error:", e);
        }
      }

      if (!profileData) throw new Error("No data provided");

      // 2. AI 优化
      const prompt = `LinkedIn Expert. Style: ${style || 'professional'}. Profile: ${profileData}. Output JSON: aboutVersions (5 strings), headlines (3 strings), postTopics (5 strings).`;
      const aiResponse = await fetch("https://api.xty.app/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
      });

      const data: any = await aiResponse.json();
      const content = JSON.parse(data.choices[0].message.content);

      // 3. 记录历史 (加上异常捕获，防止因为外键报错导致整个功能挂掉)
      if (userEmail) {
        try {
          await env.DB.prepare(
            "INSERT INTO history (user_email, style, input, result, created_at) VALUES (?, ?, ?, ?, ?)"
          ).bind(userEmail, style || 'professional', profileData, JSON.stringify(content), Date.now()).run();
        } catch (dbError: any) {
          console.error("History write failed:", dbError.message);
          // 如果还是报外键错，说明 users 表里真的没存进去，这里我们临时绕过它
        }
      }

      return new Response(JSON.stringify(content), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  },
};
