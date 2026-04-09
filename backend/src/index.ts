export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    const getPayPalAccessToken = async (env) => {
      const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
      const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      const data = await response.json();
      return data.access_token;
    };

    try {
      if (request.method === "POST" && url.pathname === "/api/paypal/create-order") {
        const { planType } = await request.json();
        const pricing = { starter: "0.99", pro: "4.90", ultra: "19.90" };
        const amount = pricing[planType] || "4.90";

        const accessToken = await getPayPalAccessToken(env);
        const response = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              amount: { currency_code: "USD", value: amount },
              description: `LinkedIn-Sniper ${planType} Plan`
            }],
          }),
        });
        const order = await response.json();
        return new Response(JSON.stringify(order), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (request.method === "POST" && url.pathname === "/api/paypal/capture-order") {
        const { orderID, token } = await request.json();
        const base64Url = token.split('.')[1];
        const payload = JSON.parse(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')));
        const userEmail = payload.email;

        const accessToken = await getPayPalAccessToken(env);
        const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const captureData = await response.json();

        if (captureData.status === "COMPLETED") {
          const description = captureData.purchase_units[0].description;
          const isUltra = description.includes("ultra");
          const plan = isUltra ? "ultra" : "pro";
          const expiry = isUltra ? 4070908800000 : Date.now() + 30 * 24 * 60 * 60 * 1000;

          await env.DB.prepare("UPDATE users SET plan = ?, expires_at = ? WHERE email = ?")
            .bind(plan, expiry, userEmail)
            .run();

          return new Response(JSON.stringify({ status: "success", plan }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(captureData), { status: 400, headers: corsHeaders });
      }

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
        const {
          profileData,
          style,
          mode = 'client',
          targetClientType = 'SaaS Founder',
          token
        } = body;

        let userEmail = null;

        if (token && typeof token === 'string' && token.includes('.')) {
          try {
            const parts = token.split('.');
            const base64Url = parts[1];
            const payload = JSON.parse(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.email) {
              userEmail = payload.email;
              await env.DB.prepare("INSERT INTO users (email, name, picture, last_login) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET last_login=excluded.last_login")
                .bind(userEmail, payload.name || "User", payload.picture || "", Date.now())
                .run();
            }
          } catch (e) {}
        }

        if (!profileData) throw new Error("No data provided");

        const systemPrompt = mode === 'client'
          ? '你是一名资深的 LinkedIn 客户获取策略顾问，擅长帮助创始人、自由职业者、顾问和服务提供者优化 LinkedIn 资料，以获得更多搜索曝光、更多主页访问和更多私信咨询。'
          : '你是一名资深的 LinkedIn 求职优化顾问，擅长帮助求职者提升 LinkedIn 搜索曝光、岗位匹配度和招聘吸引力。';

        const userPrompt = `请基于以下 LinkedIn 资料进行深度优化与审计。

模式: ${mode}
目标客户类型: ${targetClientType}
文案风格: ${style}

资料原文:
${profileData}

要求：
- 输出必须是合法 JSON
- 不要输出 markdown
- 不要解释过程
- 建议必须具体，不要空泛
- 如果是 client 模式，重点围绕“被客户搜索到、被信任、被私信”
- 如果是 job 模式，重点围绕“被招聘方搜索到、资料更适合岗位匹配”

【必须返回以下字段】
1. aboutVersions: 5 个不同版本的 About（字符串数组）
2. headlines: 3 个优化后的 Headline（字符串数组）
3. postTopics: 5 个发帖选题（字符串数组）
4. seoKeywords: 5 个关键词（字符串数组）
5. auditScore: 0-100 的资料评分（数字）
6. missingKeywords: 5 个缺失的重要关键词（字符串数组）
7. conversionIssues: 3-5 个转化问题（字符串数组）
8. trustGaps: 3-5 个信任缺口（字符串数组）
9. quickFixes: 3-5 个快速修复建议（字符串数组）
10. targetAudience: 3 个最适合吸引的人群（字符串数组）
11. positioningStatement: 1 句定位陈述（字符串）
12. ctaSuggestions: 3 个 CTA 建议（字符串数组）`;

        const aiResponse = await fetch("https://api.xty.app/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
          }),
        });

        const data = await aiResponse.json();
        let rawContent = data?.choices?.[0]?.message?.content || '{}';
        rawContent = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        const content = JSON.parse(rawContent || '{}');

        content.aboutVersions = Array.isArray(content.aboutVersions) ? content.aboutVersions : [];
        content.headlines = Array.isArray(content.headlines) ? content.headlines : [];
        content.postTopics = Array.isArray(content.postTopics) ? content.postTopics : [];
        content.seoKeywords = Array.isArray(content.seoKeywords) ? content.seoKeywords : ["LinkedIn", "Optimization", "Inbound Leads", "Positioning", "Authority"];
        content.auditScore = typeof content.auditScore === 'number' ? content.auditScore : 60;
        content.missingKeywords = Array.isArray(content.missingKeywords) ? content.missingKeywords : [];
        content.conversionIssues = Array.isArray(content.conversionIssues) ? content.conversionIssues : [];
        content.trustGaps = Array.isArray(content.trustGaps) ? content.trustGaps : [];
        content.quickFixes = Array.isArray(content.quickFixes) ? content.quickFixes : [];
        content.targetAudience = Array.isArray(content.targetAudience) ? content.targetAudience : [];
        content.positioningStatement = typeof content.positioningStatement === 'string' ? content.positioningStatement : '';
        content.ctaSuggestions = Array.isArray(content.ctaSuggestions) ? content.ctaSuggestions : [];

        if (userEmail) {
          try {
            await env.DB.prepare("INSERT INTO history (user_email, style, input, result, created_at) VALUES (?, ?, ?, ?, ?)")
              .bind(userEmail, `${style || 'story'}|${mode}`, profileData, JSON.stringify(content), Date.now())
              .run();
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
