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
    const SITE_URL = (env.SITE_URL || "https://linkedin-sniper.pages.dev").replace(/\/$/, "");
    const BRAND_NAME = env.BRAND_NAME || "LinkedIn Client Optimizer";
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
    const getNextMonthlyResetAt = () => {
      const now = new Date();
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0);
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

      const quotaResetAt = quotaPeriod === '30d' ? getNextMonthlyResetAt() : null;
      const cycleEndsAt = quotaPeriod === '30d'
        ? Math.min(Number(profile?.expires_at || 0) || getNextMonthlyResetAt(), getNextMonthlyResetAt())
        : Number(profile?.expires_at || 0) || null;

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
        quotaResetAt,
        cycleEndsAt,
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
              description: `${BRAND_NAME} ${normalizedPlan} Plan`,
              custom_id: normalizedPlan,
            }],
            application_context: {
              user_action: "PAY_NOW",
              return_url: `${SITE_URL}/pricing?paypal=success`,
              cancel_url: `${SITE_URL}/pricing?paypal=cancel`,
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

        const cjkMatches = profileData.match(/[一-鿿]/g) || [];
        const latinMatches = profileData.match(/[A-Za-z]/g) || [];
        const cjkCount = cjkMatches.length;
        const latinCount = latinMatches.length;
        const outputLanguage = cjkCount >= latinCount ? "Chinese" : "English";

        const systemPrompt = mode === "client"
          ? `You are an elite LinkedIn client acquisition strategist, conversion diagnostician, and outreach messaging advisor. Your job is not to polish a resume. Your job is to turn a LinkedIn profile into a system that helps the user get found, trusted, messaged, and moved toward real business conversations.

Think like a sharp but practical growth consultant:
- Judge whether the profile feels like it sells a service / capability / solution, not like a generic job-seeker introduction
- Identify why target clients would not message this person
- Identify missing trust signals, outcomes, audience clarity, and CTAs
- Design message templates that feel natural for LinkedIn, not spammy sales scripts
- Keep every suggestion specific, direct, and usable
- The output language must match the dominant language of the user's input exactly`
          : `You are an expert LinkedIn job-search optimization advisor. Help users improve LinkedIn discoverability, role relevance, and recruiter appeal. Keep advice specific, direct, and actionable. The output language must match the dominant language of the user's input exactly.`;

        const userPrompt = `Deeply audit and optimize the LinkedIn profile below.

Mode: ${mode}
Target client type: ${targetClientType}
Writing style: ${style}
Output language: ${outputLanguage}

Profile source:
${profileData}

Universal rules:
- Return valid JSON only
- Do not output markdown
- Do not explain your process
- Avoid generic filler
- Every suggestion must be specific, direct, and actionable
- The output language must exactly match the dominant language of the user's input

If mode is client, follow these rules strictly:
- Do not frame the user like a job seeker; frame them like someone selling a service, capability, or solution
- Prioritize: target client, problem, outcome, method, proof, CTA
- Headline must include at least two of: audience / problem / result / method
- About must feel conversion-oriented, not self-expressive
- conversionIssues must directly explain why clients would not message this person
- quickFixes must be immediate profile actions, not vague advice
- positioningStatement must be a real LinkedIn-ready positioning sentence
- ctaSuggestions must feel commercially usable, not generic fluff
- targetAudience must be potential buyers / clients
- missingKeywords must focus on client search terms, service labels, business problems, and solution framing
- trustGaps must identify missing proof, outcomes, process, or credibility signals
- priorityFixes must be the 3 highest-leverage actions
- actionPlan.today must be doable today
- actionPlan.thisWeek must be doable this week
- connectionRequests must be short, natural, and human
- inboundReplies must sound like real replies to inbound interest
- followUpMessages must move the conversation forward without sounding pushy

Extra messaging rules:
- Do not open with “Hope you're doing well”
- Prefer 1-3 short sentences
- Do not hard-sell immediately
- Make each message feel like a real LinkedIn scenario
- Reflect soft / normal / direct intensity differences
- Follow-ups should cover no reply and mild interest
- Inbound replies should cover curiosity and real buying intent
- Connection requests should feel precise, not spammy

If mode is job:
- Focus on discoverability, role fit, and recruiter appeal

Required fields:
1. aboutVersions: 5 About versions (string[])
2. headlines: 3 optimized headlines (string[])
3. postTopics: 5 content topic ideas (string[])
4. seoKeywords: 5 keywords (string[])
5. auditScore: 0-100 profile score (number)
6. missingKeywords: 5 missing keywords (string[])
7. conversionIssues: 3-5 conversion issues (string[])
8. trustGaps: 3-5 trust gaps (string[])
9. quickFixes: 3-5 quick fixes (string[])
10. targetAudience: 3 best-fit audiences (string[])
11. positioningStatement: 1 positioning statement (string)
12. ctaSuggestions: 3 CTA suggestions (string[])
13. priorityFixes: 3 highest-priority fixes (string[])
14. actionPlan: { today: string[], thisWeek: string[] }
15. connectionRequests: 3 connection request templates (string[])
16. inboundReplies: 3 inbound reply templates (string[])
17. followUpMessages: 3 follow-up templates (string[])

Quality bar:
- headlines must be sharp and concise
- positioningStatement must sound LinkedIn-ready
- conversionIssues must sound like real growth diagnosis
- quickFixes must feel immediately actionable
- ctaSuggestions must be usable in About / Featured sections
- priorityFixes must reflect the highest leverage order
- actionPlan must feel sequenced, not random
- connectionRequests / inboundReplies / followUpMessages must sound like real LinkedIn conversations`;

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
        } else if (access.currentPlan === 'starter' || access.currentPlan === 'pro') {
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
