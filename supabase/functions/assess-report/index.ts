import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reportContent, labSheetContent, rubric, studentName } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `You are an expert university lab report assessor. You will be given:
1. A lab sheet (the original assignment instructions)
2. A student's lab report submission
3. A marking rubric with sections and max scores

Your job is to:
- Compare the student's report against the lab sheet requirements
- Grade each rubric section with a score (0 to max) and specific feedback
- Provide overall feedback

You MUST respond with valid JSON in this exact format:
{
  "sectionScores": [
    { "sectionId": "...", "score": <number>, "feedback": "..." }
  ],
  "overallFeedback": "..."
}

Be fair, constructive, and specific in feedback. Scores must be between 0 and the max score for each section.`;

    const userPrompt = `
## Lab Sheet Instructions:
${labSheetContent || "No lab sheet provided - assess based on general lab report standards."}

## Student Report (${studentName || "Unknown Student"}):
${reportContent || "No content could be extracted from the report."}

## Marking Rubric:
${JSON.stringify(rubric.sections.map((s: any) => ({ id: s.id, name: s.name, maxScore: s.maxScore, description: s.description })), null, 2)}

Please assess this report against the lab sheet and rubric. Respond ONLY with the JSON object.`;

    const models = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    let lastError = "";

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 8192,
              temperature: 0.3,
            },
          }),
        });

        if (response.status === 429) {
          console.log(`Rate limited on ${model}, trying next...`);
          lastError = `Rate limited on ${model}`;
          continue;
        }
        if (!response.ok) {
          const t = await response.text();
          console.error(`Model ${model} failed:`, response.status, t);
          lastError = `${model} error: ${response.status}`;
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = `${model} returned no content`;
          continue;
        }

        const result = JSON.parse(text);
        const totalScore = result.sectionScores.reduce((a: number, s: any) => a + s.score, 0);

        return new Response(
          JSON.stringify({
            sectionScores: result.sectionScores,
            totalScore,
            totalMax: rubric.totalMax,
            overallFeedback: result.overallFeedback,
            model,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (modelErr) {
        console.error(`Error with ${model}:`, modelErr);
        lastError = `${model}: ${modelErr instanceof Error ? modelErr.message : "Unknown"}`;
        continue;
      }
    }

    return new Response(
      JSON.stringify({ error: `All AI models failed. Last error: ${lastError}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("assess-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
