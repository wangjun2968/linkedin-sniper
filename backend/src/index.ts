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
      
      // 1. JWT 解析与用户同步
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));
          if (payload.email) {
            userEmail = payload.email;
            await env.DB.prepare(
              "INSERT INTO users (email, name, picture, last_login) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET last_login=excluded.last_login"
            ).bind(userEmail, payload.name || "User", payload.picture || "", Date.now()).run();
          }
        } catch (e) {
          console.error("Auth process error:", e);
        }
      }

      if (!profileData) throw new Error("No data provided");

      // 2. AI 优化 - SEO 狙击模式 (The SEO Sniper)
      const prompt = `你是一名资深的 LinkedIn 招聘专家和 SEO 算法专家。请基于以下 Profile 数据进行深度优化。
      
      【强制要求】：
      1. 核心关键词分析：识别该职位在 LinkedIn 搜索权重最高的 Top 5 核心高频关键词，并在 About 和 Headlines 中自然埋伏。
      2. 多维风格“Sniper”模式：
         - [Sniper] 成果导向：强调数据、KPI、具体的商业产出。
         - [Story] 故事导向：叙述个人成长路径和独特的职业魅力。
         - [Tech] 技能导向：突出技术栈深度和解决复杂问题的硬核实力。
         - [Values] 价值观导向：展示文化契合度、团队领导力和核心价值观。
         - [Future] 未来导向：展示对行业前瞻性的理解和未来的增长潜力。
      3. Headlines：提供 3 个版本，格式为 [当前职位] + [差异化价值主张]。
      
      【输入数据】：${profileData}
      
      【输出格式】：必须返回一个 JSON 对象，包含：
      - aboutVersions (5 个字符串的数组)
      - headlines (3 个字符串的数组)
      - postTopics (5 个字符串的数组)
      - seoKeywords (5 个关键词的数组，用于增强用户信任感)
      `;

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

      // 3. 记录历史
      if (userEmail) {
        try {
          await env.DB.prepare(
            "INSERT INTO history (user_email, style, input, result, created_at) VALUES (?, ?, ?, ?, ?)"
          ).bind(userEmail, style || 'professional', profileData, JSON.stringify(content), Date.now()).run();
        } catch (dbError: any) {
          console.error("History write failed:", dbError.message);
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
