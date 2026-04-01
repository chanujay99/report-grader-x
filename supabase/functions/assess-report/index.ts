import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reportContent, labSheetContent, rubric, studentName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert university lab report assessor. You will be given:
1. A lab sheet (the original assignment instructions)
2. A student's lab report submission
3. A marking rubric with sections and max scores

Your job is to:
- Compare the student's report against the lab sheet requirements
- Grade each rubric section with a score (0 to max) and specific feedback
- Provide overall feedback

You MUST respond using the assess_report tool/function provided. Be fair, constructive, and specific in feedback.`;

    const userPrompt = `
## Lab Sheet Instructions:
${labSheetContent || "No lab sheet provided - assess based on general lab report standards."}

## Student Report (${studentName || "Unknown Student"}):
${reportContent || "No content could be extracted from the report."}

## Marking Rubric:
${JSON.stringify(rubric.sections.map((s: any) => ({ id: s.id, name: s.name, maxScore: s.maxScore, description: s.description })), null, 2)}

Please assess this report against the lab sheet and rubric.`;

    const models = [
      "openai/gpt-5.2",
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-flash",
    ];

    let lastError = "";

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "assess_report",
                  description: "Submit the assessment result for a student lab report",
                  parameters: {
                    type: "object",
                    properties: {
                      sectionScores: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            sectionId: { type: "string" },
                            score: { type: "number" },
                            feedback: { type: "string" },
                          },
                          required: ["sectionId", "score", "feedback"],
                          additionalProperties: false,
                        },
                      },
                      overallFeedback: { type: "string" },
                    },
                    required: ["sectionScores", "overallFeedback"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "assess_report" } },
          }),
        });

        if (response.status === 429) {
          console.log(`Rate limited on ${model}, trying next...`);
          lastError = `Rate limited on ${model}`;
          continue;
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!response.ok) {
          const t = await response.text();
          console.error(`Model ${model} failed:`, response.status, t);
          lastError = `${model} error: ${response.status}`;
          continue;
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          lastError = `${model} did not return tool call`;
          continue;
        }

        const result = JSON.parse(toolCall.function.arguments);
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
