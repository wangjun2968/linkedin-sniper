export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const PAYPAL_BASE_URL = env.PAYPAL_BASE_URL || "https://api-m.paypal.com";
    const pricing = { starter: "0.99", pro: "19", ultra: "149" };

    const decodeJwtPayload = (token) => {
      if (!token || typeof token !== "string" || !token.includes(".")) {
        throw new Error("Invalid token");
      }
      const base64Url = token.split(".")[1];
      return JSON.parse(atob(base64Url.replace(/-/g, "+").replace(/_/g, "/")));
    };

    const ensureUserRow = async (payload) => {
      if (!payload?.email) return;
      await env.DB.prepare(`
        INSERT INTO users (email, name, picture, plan, expires_at, last_login)
        VALUES (?, ?, ?, 'free', NULL, ?)
        ON CONFLICT(email) DO UPDATE SET
          name=excluded.name,
          picture=excluded.picture,
          last_login=excluded.last_login
      `)
        .bind(payload.email, payload.name || 'User', payload.picture || '', Date.now())
        .run();
    };

    const getUserProfile = async (email) => {
      const row = await env.DB.prepare(`
        SELECT email, name, picture, COALESCE(plan, 'free') AS plan, expires_at, last_login
        FROM users WHERE email = ?
      `).bind(email).first();
      return row || null;
    };

    const getPlanRank = (plan) => ({ free: 0, starter: 1, pro: 2, ultra: 3 }[String(plan || 'free').toLowerCase()] || 0);
    const getCurrentPeriodKey = () => {
      const now = new Date();
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    };

    const getUsageCount = async (email, accessPlan, periodKey = null) => {
      if (periodKey) {
        const row = await env.DB.prepare(`
          SELECT COUNT(*) AS count FROM usage_events WHERE user_email = ? AND access_plan = ? AND period_key = ?
        `).bind(email, accessPlan, periodKey).first();
        return Number(row?.count || 0);
      }
      const row = await env.DB.prepare(`
        SELECT COUNT(*) AS count FROM usage_events WHERE user_email = ? AND access_plan = ?
      `).bind(email, accessPlan).first();
      return Number(row?.count || 0);
    };

    const getCompletedPaymentsCount = async (email, plan) => {
      const row = await env.DB.prepare(`
        SELECT COUNT(*) AS count FROM payments WHERE user_email = ? AND plan = ? AND status = 'completed'
      `).bind(email, plan).first();
      return Number(row?.count || 0);
    };

    const getEffectiveStoredPlan = (profile) => {
      const storedPlan = String(profile?.plan || 'free').toLowerCase();
      const expiresAt = Number(profile?.expires_at || 0);
      if ((storedPlan === 'pro' || storedPlan === 'ultra') && expiresAt && expiresAt < Date.now()) {
        return 'free';
      }
      return storedPlan;
    };

    const getAccessSummary = async (email) => {
      const profile = await getUserProfile(email);
      const storedPlan = String(profile?.plan || 'free').toLowerCase();
      const effectiveStoredPlan = getEffectiveStoredPlan(profile);
      const periodKey = getCurrentPeriodKey();
      const freeUsed = await getUsageCount(email, 'free');
      const starterPurchases = await getCompletedPaymentsCount(email, 'starter');
      const starterUsed = await getUsageCount(email, 'starter');
      const starterCreditsRemaining = Math.max(starterPurchases - starterUsed, 0);
      const proUsedThisPeriod = await getUsageCount(email, 'pro', periodKey);
      const ultraUsedThisPeriod = await getUsageCount(email, 'ultra', periodKey);

      let currentPlan = 'free';
      let generationLimit = 1;
      let generationsUsed = freeUsed;
      let generationsRemaining = Math.max(1 - freeUsed, 0);
      let quotaPeriod = 'lifetime';

      if (effectiveStoredPlan === 'ultra') {
        currentPlan = 'ultra';
        generationLimit = 200;
        generationsUsed = ultraUsedThisPeriod;
        generationsRemaining = Math.max(200 - ultraUsedThisPeriod, 0);
        quotaPeriod = '30d';
      } else if (effectiveStoredPlan === 'pro') {
        currentPlan = 'pro';
        generationLimit = 30;
        generationsUsed = proUsedThisPeriod;
        generationsRemaining = Math.max(30 - proUsedThisPeriod, 0);
        quotaPeriod = '30d';
      } else if (starterCreditsRemaining > 0) {
        currentPlan = 'starter';
        generationLimit = starterPurchases;
        generationsUsed = starterUsed;
        generationsRemaining = starterCreditsRemaining;
        quotaPeriod = 'credit';
      }

      return {
        storedPlan,
        currentPlan,
        expiresAt: Number(profile?.expires_at || 0) || null,
        periodKey,
        quotaPeriod,
        generationLimit,
        generationsUsed,
        generationsRemaining,
        freeUsed,
        starterPurchases,
        starterUsed,
        starterCreditsRemaining,
        canUse: generationsRemaining > 0,
        includeDmAssets: currentPlan === 'ultra',
        includeFullRewrite: currentPlan === 'pro' || currentPlan === 'ultra',
        monthlyLimit: currentPlan === 'pro' ? 30 : currentPlan === 'ultra' ? 200 : null,
      };
    };

    const recordUsageEvent = async (email, accessPlan, mode) => {
      await env.DB.prepare(`
        INSERT INTO usage_events (user_email, access_plan, mode, period_key, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(email, accessPlan, mode, getCurrentPeriodKey(), Date.now()).run();
    };

    const getPayPalAccessToken = async () => {
      if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
        throw new Error("Missing PayPal credentials");
      }

      const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
      const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const data = await response.json();
      if (!response.ok || !data.access_token) {
        const detail = data?.error_description || data?.error || "Unable to fetch PayPal access token";
        throw new Error(detail);
      }
      return data.access_token;
    };

    try {
      if (request.method === "POST" && url.pathname === "/api/paypal/create-order") {
        const { planType } = await request.json();
        const normalizedPlan = pricing[planType] ? planType : "pro";
        const amount = pricing[normalizedPlan];

        const accessToken = await getPayPalAccessToken();
        const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              amount: { currency_code: "USD", value: amount },
              description: `LinkedIn-Sniper ${normalizedPlan} Plan`,
              custom_id: normalizedPlan,
            }],
            application_context: {
              user_action: "PAY_NOW",
              return_url: "https://linkedin-sniper.pages.dev/pricing?paypal=success",
              cancel_url: "https://linkedin-sniper.pages.dev/pricing?paypal=cancel",
            },
          }),
        });

        const order = await response.json();
        if (!response.ok) {
          return new Response(JSON.stringify(order), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const approveUrl = order?.links?.find((link) => link.rel === "approve")?.href || null;
        return new Response(JSON.stringify({
          id: order.id,
          status: order.status,
          approveUrl,
          planType: normalizedPlan,
          amount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.method === "POST" && url.pathname === "/api/paypal/capture-order") {
        const { orderID, token } = await request.json();
        const payload = decodeJwtPayload(token);
        const userEmail = payload.email;

        await ensureUserRow(payload);

        const accessToken = await getPayPalAccessToken();

        const orderDetailsRes = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const orderDetails = await orderDetailsRes.json();

        const orderCustomId = String(orderDetails?.purchase_units?.[0]?.custom_id || '').toLowerCase();
        const orderDescription = String(orderDetails?.purchase_units?.[0]?.description || '').toLowerCase();
        const orderAmountRaw = orderDetails?.purchase_units?.[0]?.amount?.value || null;
        const orderAmount = orderAmountRaw ? String(Number(orderAmountRaw)) : null;

        const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const captureData = await response.json();

        if (captureData.status === "COMPLETED") {
          const captureAmountRaw = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || null;
          const amount = captureAmountRaw ? String(Number(captureAmountRaw)) : orderAmount;
          const currency = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || 'USD';

          let plan = 'pro';
          if (orderCustomId.includes('starter') || orderDescription.includes('starter') || amount === '0.99') {
            plan = 'starter';
          } else if (orderCustomId.includes('ultra') || orderDescription.includes('ultra') || amount === '149') {
            plan = 'ultra';
          } else if (orderCustomId.includes('pro') || orderDescription.includes('pro') || amount === '19') {
            plan = 'pro';
          }

          const currentProfile = await getUserProfile(userEmail);
          const currentPlan = getEffectiveStoredPlan(currentProfile);
          const effectivePlan = getPlanRank(plan) >= getPlanRank(currentPlan) ? plan : currentPlan;
          const expiry = effectivePlan === "pro" || effectivePlan === "ultra"
            ? Date.now() + 30 * 24 * 60 * 60 * 1000
            : null;

          await env.DB.prepare("UPDATE users SET plan = ?, expires_at = ?, last_login = ? WHERE email = ?")
            .bind(effectivePlan, expiry, Date.now(), userEmail)
            .run();

          try {
            await env.DB.prepare(`
              INSERT INTO payments (user_email, order_id, plan, amount, currency, status, created_at)
              VALUES (?, ?, ?, ?, ?, 'completed', ?)
            `)
              .bind(userEmail, orderID, plan, amount, currency, Date.now())
              .run();
          } catch (e) {}

          return new Response(JSON.stringify({ status: "success", plan: effectivePlan, purchasedPlan: plan, amount, currency }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(captureData), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.method === "GET" && url.pathname === "/user/me") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const token = authHeader.split(" " )[1];
        const payload = decodeJwtPayload(token);
        await ensureUserRow(payload);
        const profile = await getUserProfile(payload.email);
        const access = await getAccessSummary(payload.email);
        return new Response(JSON.stringify({
          ...(profile || { email: payload.email, name: payload.name, picture: payload.picture, plan: 'free' }),
          plan: access.currentPlan,
          access,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.method === "GET" && url.pathname === "/payments") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const token = authHeader.split(" " )[1];
        const payload = decodeJwtPayload(token);
        const results = await env.DB.prepare(`
          SELECT id, order_id, plan, amount, currency, status, created_at
          FROM payments WHERE user_email = ?
          ORDER BY created_at DESC LIMIT 20
        `).bind(payload.email).all();
        return new Response(JSON.stringify(results.results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.method === "GET" && url.pathname === "/history") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const token = authHeader.split(" ")[1];
        const payload = decodeJwtPayload(token);
        const results = await env.DB.prepare("SELECT * FROM history WHERE user_email = ? ORDER BY created_at DESC LIMIT 20")
          .bind(payload.email)
          .all();
        return new Response(JSON.stringify(results.results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.method === "POST") {
        const body = await request.json();
        const {
          profileData,
          style,
          mode = "client",
          targetClientType = "SaaS Founder",
          token,
        } = body;

        let userEmail = null;
        let access = null;

        if (token && typeof token === "string" && token.includes(".")) {
          try {
            const payload = decodeJwtPayload(token);
            if (payload.email) {
              userEmail = payload.email;
              await ensureUserRow(payload);
              access = await getAccessSummary(payload.email);
            }
          } catch (e) {}
        }

        if (!profileData) throw new Error("No data provided");
        if (!userEmail || !access) {
          return new Response(JSON.stringify({ error: "Please sign in first. Free access is login-gated." }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!access.canUse) {
          return new Response(JSON.stringify({ error: "Your current plan has no generations remaining. Upgrade to continue.", code: "GENERATION_LIMIT_REACHED", access }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const systemPrompt = mode === "client"
          ? `你是一名顶级的 LinkedIn 客户获取顾问、转化诊断师和私信转化策略顾问。你的任务不是润色简历，而是把一个人的 LinkedIn 资料和后续对话，改造成“更容易被目标客户发现、信任、私信并推进成交”的客户获取系统。

你必须像一个狠但专业的增长顾问思考：
- 优先判断这个资料是否像“在卖服务/解决方案”，而不是像普通求职自我介绍
- 找出为什么客户看完不会发消息
- 找出缺少哪些信任信号、结果表达、服务对象表达、行动召唤
- 设计更像真实 LinkedIn 场景的私信模板，而不是垃圾销售话术
- 所有建议必须具体、直接、可执行，不能写正确但没用的废话
- 私信文案必须像真人发的，不要像机器人、模板销售或客服脚本`
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
- connectionRequests 必须短、自然、像真人，不像群发垃圾消息
- inboundReplies 必须像别人主动来问时的真实回复，不要太长
- followUpMessages 必须能推进下一步，但不能油腻或骚扰

私信文案额外硬规则：
- 不准写“Hope you're doing well”这类废话开场
- 不准写太长的段落，优先 1-3 句
- 不准一上来强卖或强约 call
- 要像 LinkedIn 上正常人会发的话
- 每条文案都要有明确场景感
- 至少体现 soft / normal / direct 的强度差异
- follow-up 要体现两种场景：没回复、已表示兴趣
- inbound reply 要体现两种场景：对方只是好奇、对方已经有潜在需求
- connection request 要像精准连接，不像 spam outreach

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
15. connectionRequests: 3 个连接请求模板（字符串数组，分别偏 soft / normal / direct）
16. inboundReplies: 3 个别人主动来问时的回复模板（字符串数组，分别覆盖好奇 / 潜在需求 / 高意向）
17. followUpMessages: 3 个跟进消息模板（字符串数组，分别覆盖无回复 / 轻兴趣 / 推进下一步）

额外输出质量要求：
- headlines 要短、狠、清晰，尽量避免正确的废话
- positioningStatement 要像一句能直接放进 Profile 的定位句
- conversionIssues 要像增长顾问做的诊断，不像老师写评语
- quickFixes 要像能立刻照着改资料的动作清单
- ctaSuggestions 要能直接复制到 About 或 Featured 里使用
- priorityFixes 必须告诉用户先改哪 3 个最值钱
- actionPlan 要有执行顺序，不要泛泛而谈
- connectionRequests / inboundReplies / followUpMessages 都必须像真实 LinkedIn 对话，不要像机器人或 sales spam`;

        const aiResponse = await fetch("https://api.xty.app/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        const data = await aiResponse.json();
        let rawContent = data?.choices?.[0]?.message?.content || "{}";
        rawContent = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        const content = JSON.parse(rawContent || "{}");

        content.aboutVersions = Array.isArray(content.aboutVersions) ? content.aboutVersions : [];
        content.headlines = Array.isArray(content.headlines) ? content.headlines : [];
        content.postTopics = Array.isArray(content.postTopics) ? content.postTopics : [];
        content.seoKeywords = Array.isArray(content.seoKeywords) ? content.seoKeywords : ["LinkedIn", "Optimization", "Inbound Leads", "Positioning", "Authority"];
        content.auditScore = typeof content.auditScore === "number" ? content.auditScore : 60;
        content.missingKeywords = Array.isArray(content.missingKeywords) ? content.missingKeywords : [];
        content.conversionIssues = Array.isArray(content.conversionIssues) ? content.conversionIssues : [];
        content.trustGaps = Array.isArray(content.trustGaps) ? content.trustGaps : [];
        content.quickFixes = Array.isArray(content.quickFixes) ? content.quickFixes : [];
        content.targetAudience = Array.isArray(content.targetAudience) ? content.targetAudience : [];
        content.positioningStatement = typeof content.positioningStatement === "string" ? content.positioningStatement : "";
        content.ctaSuggestions = Array.isArray(content.ctaSuggestions) ? content.ctaSuggestions : [];
        content.priorityFixes = Array.isArray(content.priorityFixes) ? content.priorityFixes : [];
        content.actionPlan = typeof content.actionPlan === "object" && content.actionPlan ? content.actionPlan : {};
        content.actionPlan.today = Array.isArray(content.actionPlan.today) ? content.actionPlan.today : [];
        content.actionPlan.thisWeek = Array.isArray(content.actionPlan.thisWeek) ? content.actionPlan.thisWeek : [];
        content.connectionRequests = Array.isArray(content.connectionRequests) ? content.connectionRequests : [];
        content.inboundReplies = Array.isArray(content.inboundReplies) ? content.inboundReplies : [];
        content.followUpMessages = Array.isArray(content.followUpMessages) ? content.followUpMessages : [];

        if (access.currentPlan === 'free') {
          content.aboutVersions = content.aboutVersions.slice(0, 1);
          content.headlines = content.headlines.slice(0, 1);
          content.seoKeywords = content.seoKeywords.slice(0, 2);
          content.missingKeywords = content.missingKeywords.slice(0, 2);
          content.conversionIssues = content.conversionIssues.slice(0, 2);
          content.trustGaps = content.trustGaps.slice(0, 1);
          content.quickFixes = content.quickFixes.slice(0, 1);
          content.ctaSuggestions = content.ctaSuggestions.slice(0, 1);
          content.priorityFixes = content.priorityFixes.slice(0, 1);
          content.actionPlan.today = content.actionPlan.today.slice(0, 1);
          content.actionPlan.thisWeek = content.actionPlan.thisWeek.slice(0, 1);
          content.connectionRequests = [];
          content.inboundReplies = [];
          content.followUpMessages = [];
        } else if (access.currentPlan === 'starter') {
          content.aboutVersions = content.aboutVersions.slice(0, 1);
          content.headlines = content.headlines.slice(0, 1);
          content.connectionRequests = [];
          content.inboundReplies = [];
          content.followUpMessages = [];
        } else if (access.currentPlan === 'pro') {
          content.connectionRequests = [];
          content.inboundReplies = [];
          content.followUpMessages = [];
        }

        try {
          await env.DB.prepare("INSERT INTO history (user_email, style, input, result, created_at) VALUES (?, ?, ?, ?, ?)")
            .bind(userEmail, `${style || "story"}|${mode}`, profileData, JSON.stringify(content), Date.now())
            .run();
          await recordUsageEvent(userEmail, access.currentPlan, mode);
        } catch (dbErr) {}

        const refreshedAccess = await getAccessSummary(userEmail);
        return new Response(JSON.stringify({ ...content, access: refreshedAccess }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
