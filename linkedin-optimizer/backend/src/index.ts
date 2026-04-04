export interface Env {
  OPENAI_API_KEY: string;
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
      const { profileData } = await request.json();
      if (!profileData) throw new Error("No data provided");

      const prompt = `
        You are a professional LinkedIn Profile Expert.
        Optimize the following profile: "${profileData}"
        
        Strictly output JSON with these keys:
        - aboutVersions: array of 5 strings (Results, Story, Skills, Values, Future oriented)
        - headlines: array of 3 strings (Current Role + Unique Value Prop)
        - postTopics: array of 5 strings (Industry-specific content ideas)
        
        Write in first-person, professional English.
      `;

      const response = await fetch("https://api.xty.app/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a LinkedIn strategist." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const content = JSON.parse(data.choices[0].message.content);
      return new Response(JSON.stringify(content), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  },
};
