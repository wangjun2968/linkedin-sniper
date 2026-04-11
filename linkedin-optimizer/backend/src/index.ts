export interface Env {
  OPENAI_API_KEY: string;
  DB: D1Database;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
}

async function updatePlan(db: D1Database, email: string, plan: string) {
  let credits = 10;
  let expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  if (plan === "ultra") {
    credits = 9999;
    expiresAt = Date.now() + 3650 * 24 * 60 * 60 * 1000;
  } else if (plan === "pro") {
    credits = 100;
  }

  await db.prepare(
    "UPDATE users SET plan = ?, credits = ?, expires_at = ? WHERE email = ?"
  ).bind(plan, credits, expiresAt, email).run();
}

async function getPayPalAccessToken(clientId: string, clientSecret: string) {
  const auth = btoa(`${clientId}:${clientSecret}`);
  // LIVE 环境域名改为 api-m.paypal.com
  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data: any = await response.json();
  if (!data.access_token) throw new Error("Failed to get PayPal Live access token");
  return data.access_token;
}

function json(data: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const SITE_URL = (env.SITE_URL || "https://linkedin-sniper.pages.dev").replace(/\/$/, "");
    const BRAND_NAME = env.BRAND_NAME || "LinkedIn Client Optimizer";

    const corsHeaders = {
      "Access-Control-Allow-Origin": SITE_URL,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/user/me" && request.method === "GET") {
      try {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Unauthorized" }, corsHeaders, 401);

        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const email = payload.email;
        if (!email) return json({ error: "Invalid token" }, corsHeaders, 401);

        const row = await env.DB.prepare(
          "SELECT email, name, picture, plan, credits, expires_at, last_login FROM users WHERE email = ?"
        ).bind(email).first();

        return json(row || {
          email,
          name: payload.name || "User",
          picture: payload.picture || "",
          plan: "free",
          credits: 0,
          expires_at: null,
          last_login: null,
        }, corsHeaders);
      } catch (e: any) {
        return json({ error: e.message }, corsHeaders, 500);
      }
    }

    if (url.pathname === "/history" && request.method === "GET") {
      try {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Unauthorized" }, corsHeaders, 401);

        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const email = payload.email;
        if (!email) return json({ error: "Invalid token" }, corsHeaders, 401);

        const rows = await env.DB.prepare(
          "SELECT id, style, input, result, created_at FROM history WHERE user_email = ? ORDER BY created_at DESC LIMIT 20"
        ).bind(email).all();

        return json(rows?.results || [], corsHeaders);
      } catch (e: any) {
        return json({ error: e.message }, corsHeaders, 500);
      }
    }

    if (url.pathname === "/api/paypal/create-order" && request.method === "POST") {
      try {
        const { planType, token } = await request.json();

        const prices: Record<string, string> = {
          starter: "0.99",
          pro: "4.90",
          ultra: "19.90"
        };
        const amount = prices[planType] || "0.99";

        let customId = `guest|${planType}`;
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            customId = `${payload.email}|${planType}`;
          } catch {}
        }

        const accessToken = await getPayPalAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);
        // LIVE 环境域名改为 api-m.paypal.com
        const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              amount: { currency_code: "USD", value: amount },
              description: `${BRAND_NAME} ${planType} Plan`,
              custom_id: customId
            }],
            application_context: {
              return_url: `${SITE_URL}/?paypal=success`,
              cancel_url: `${SITE_URL}/?paypal=cancel`,
              user_action: "PAY_NOW"
            }
          })
        });
        const orderData: any = await orderRes.json();
        if (!orderData?.id) {
          throw new Error(orderData?.message || "PayPal Live order creation failed");
        }
        const approveUrl =
          orderData?.links?.find((x: any) => x.rel === "approve")?.href ||
          `https://www.paypal.com/checkoutnow?token=${orderData.id}`;
        return json({ id: orderData.id, approveUrl }, corsHeaders);
      } catch (e: any) {
        return json({ error: e.message }, corsHeaders, 500);
      }
    }

    if (url.pathname === "/api/paypal/webhook" && request.method === "POST") {
      try {
        const body: any = await request.json();
        if (body.event_type === "PAYMENT.CAPTURE.COMPLETED") {
          const customId = body.resource.custom_id;
          if (customId) {
            const [email, plan] = customId.split('|');
            if (email !== "guest") await updatePlan(env.DB, email, plan);
          }
        }
        return new Response("OK", { headers: corsHeaders });
      } catch (e: any) {
        return new Response(e.message, { status: 400, headers: corsHeaders });
      }
    }

    if (url.pathname === "/api/paypal/capture-order" && request.method === "POST") {
      try {
        const { orderID } = await request.json();
        const accessToken = await getPayPalAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);

        // LIVE 环境域名改为 api-m.paypal.com
        const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });
        const captureData = await captureRes.json() as any;

        if (captureData.status === "COMPLETED") {
          const customId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id || captureData.purchase_units?.[0]?.custom_id;
          const [email, plan] = String(customId || "guest|starter").split('|');
          if (email !== "guest") await updatePlan(env.DB, email, plan);
          return json({ status: "success", plan }, corsHeaders);
        }
        throw new Error(`Capture failed with status: ${captureData.status}`);
      } catch (e: any) {
        return json({ error: e.message }, corsHeaders, 500);
      }
    }

    try {
      const body: any = await request.json();
      const { profileData, style, token } = body;

      let userEmail = null;
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));
          if (payload.email) {
            userEmail = payload.email;
            await env.DB.prepare(
              "INSERT INTO users (email, name, picture, last_login) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, picture=excluded.picture, last_login=excluded.last_login"
            ).bind(userEmail, payload.name || "User", payload.picture || "", Date.now()).run();
          }
        } catch {}
      }

      if (!profileData) throw new Error("No data provided");

      const prompt = `LinkedIn Expert. Style: ${style || 'professional'}. Profile: ${profileData}. Output JSON: aboutVersions (5 strings), headlines (3 strings), postTopics (5 strings).`;
      const aiResponse = await fetch("https://api.xty.app/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
      });

      const data: any = await aiResponse.json();
      const content = JSON.parse(data.choices[0].message.content);

      if (userEmail) {
        try {
          await env.DB.prepare(
            "INSERT INTO history (user_email, style, input, result, created_at) VALUES (?, ?, ?, ?, ?)"
          ).bind(userEmail, style || 'professional', profileData, JSON.stringify(content), Date.now()).run();
        } catch {}
      }

      return json(content, corsHeaders);
    } catch (e: any) {
      return json({ error: e.message }, corsHeaders, 500);
    }
  },
};
