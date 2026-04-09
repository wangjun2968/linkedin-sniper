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
          ? `你是一名顶级的 LinkedIn 客户获取顾问和转化诊断师。你的任务不是润色简历，而是把一个人的 LinkedIn 资料改造成“更容易被目标客户发现、信任并主动私信”的客户获取资产。

你必须像一个狠但专业的增长顾问思考：
- 优先判断这个资料是否像“在卖服务/解决方案”，而不是像普通求职自我介绍
- 找出为什么客户看完不会发消息
- 找出缺少哪些信任信号、结果表达、服务对象表达、行动召唤
- 所有建议必须具体、直接、可执行，不能写正确但没用的废话
- 严禁空泛词汇堆砌，如 passionate, innovative, results-driven, dynamic, hard-working 这类无差异表达，除非有具体结果支撑
- 输出必须更像客户获取策略，不像传统求职优化`
          : `你是一名资深的 LinkedIn 求职优化顾问，擅长帮助求职者提升 LinkedIn 搜索曝光、岗位匹配度和招聘吸引力。你的建议要具体、明确、可执行，避免空泛套话。`;

        const userPrompt = `请基于以下 LinkedIn 资料进行深度优化与审计。

模式: ${mode}
目标客户类型: ${targetClientType}
文案风格: ${style}

资料原文:
${profileData}

通用要求：
- 输出必须是合法 JSON
- 不要输出 markdown
- 不要解释过程
- 不要写空泛套话
- 所有建议必须具体、直接、能落地

如果是 client 模式，必须严格遵守以下规则：
- 不要把用户写成“正在找工作的人”，而要把用户写成“提供服务/能力/解决方案的人”
- 优先强调：服务对象、问题、结果、方法、信任证明、CTA
- Headline 必须至少包含以下四项中的两项：服务对象 / 解决的问题 / 结果 / 方法或技术路径
- About 必须更像转化型介绍，而不是自我抒情简介
- conversionIssues 必须直接指出“为什么客户不会私信他”，不要写泛泛建议
- quickFixes 必须是可以立即改资料的动作，不要写大道理
- positioningStatement 必须是一句能拿来放进 LinkedIn profile 的真实定位陈述
- ctaSuggestions 必须像真实可成交的私信引导，不要写 feel free to connect 这种废话
- targetAudience 必须是潜在客户/买家，而不是泛泛同行
- missingKeywords 必须围绕客户搜索、服务标签、业务问题、解决方案表达
- trustGaps 必须指出缺失的案例、结果、证明、流程、方法论等信任元素
- priorityFixes 必须是优先级最高、最影响获客效果的 3 个动作
- actionPlan.today 必须是今天就能改的动作
- actionPlan.thisWeek 必须是这周内能完成的动作

如果是 job 模式：
- 重点围绕“被招聘方搜索到、资料更适合岗位匹配、表达更专业可信”

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
12. ctaSuggestions: 3 个 CTA 建议（字符串数组）
13. priorityFixes: 3 个最高优先级修复动作（字符串数组）
14. actionPlan: { today: string[], thisWeek: string[] }

额外输出质量要求：
- headlines 要短、狠、清晰，尽量避免正确的废话
- positioningStatement 要像一句能直接放进 Profile 的定位句
- conversionIssues 要像增长顾问做的诊断，不像老师写评语
- quickFixes 要像能立刻照着改资料的动作清单
- ctaSuggestions 要能直接复制到 About 或 Featured 里使用
- priorityFixes 必须告诉用户先改哪 3 个最值钱
- actionPlan 要有执行顺序，不要泛泛而谈`;

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
        content.priorityFixes = Array.isArray(content.priorityFixes) ? content.priorityFixes : [];
        content.actionPlan = typeof content.actionPlan === 'object' && content.actionPlan ? content.actionPlan : {};
        content.actionPlan.today = Array.isArray(content.actionPlan.today) ? content.actionPlan.today : [];
        content.actionPlan.thisWeek = Array.isArray(content.actionPlan.thisWeek) ? content.actionPlan.thisWeek : [];

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
