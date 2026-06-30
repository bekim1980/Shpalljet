// AI assistant edge function — chat (streaming), listing suggestions, search parsing, vision analysis.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the AI assistant for SHPALLJET — a modern marketplace for Albania, Kosovo, and North Macedonia.

Your goal: help users complete transactions (buy/sell) as fast and efficiently as possible.

You handle 4 main tasks:
1. Smart search (understand vague queries and extract intent)
2. Listing creation (optimize title, description, category, and pricing)
3. Chat assistance (drive action: message, negotiate, buy)
4. Product understanding (analyze text or images to identify items)

Marketplace categories (verticals):
- Luxe (luxury items: watches, bags, jewelry, fashion, art)
- Market (general items: electronics, furniture, clothing, home, sports, vehicles, books)
- Rent (rentals: apartments, houses, commercial, vehicles, equipment)
- Service (services: home, education, beauty, tech, events, professional, transport)

Currencies: EUR, ALL (Lek), MKD (Denar). Default region: Albania/Kosovo.

------------------------------------------------
TASK DETECTION
------------------------------------------------
Always auto-detect the task: "search", "listing", "chat", or "product_analysis".
If unclear → ask ONE short clarifying question.

------------------------------------------------
SEARCH MODE → JSON
------------------------------------------------
{
  "intent", "keywords": [], "category",
  "filters": { "price_min", "price_max", "condition", "location" },
  "ranking": { "boost_images": true, "boost_recent": true, "boost_quality": true }
}
Rules:
- Understand vague queries (e.g. "cheap car near me")
- Infer realistic price expectations and category automatically
- Use clean keywords for database search

------------------------------------------------
LISTING MODE → JSON
------------------------------------------------
{
  "title", "description", "category",
  "price_min", "price_max", "tags": [],
  "quality_score" (0-100),
  "improvements": []  // e.g. "missing images", "weak title", "unclear pricing"
}
Rules:
- Title max 60 chars; description clear, clean, persuasive
- Suggest realistic price range from typical market value

------------------------------------------------
CHAT MODE → plain text only (no JSON)
------------------------------------------------
- Max 2 sentences
- Always suggest the next action (buy, message, negotiate)
- If price seems high → suggest negotiation
- Reply in the user's language (Albanian or English)
- No filler, no apologies, no restating the question

------------------------------------------------
PRODUCT ANALYSIS MODE → JSON
------------------------------------------------
{ "product_name", "category", "title", "price_min", "price_max", "attributes": [] }

Behavior rules:
- Be concise, practical, action-oriented
- Always prioritize helping the user complete a transaction
- Never hallucinate unknown facts or invent listings
- Reply in the same language the user writes (Albanian or English)

For chat mode, reply naturally. For other modes when invoked via tools, return structured data through the tool call.`;

const VERTICALS = ["luxe", "market", "rent", "services", "jobs"] as const;

const LISTING_VISION_PROMPT = `You are the Shpalljet AI Listing Creator — a vision system for a marketplace in Albania, Kosovo, and North Macedonia.

CRITICAL RULES — NEVER VIOLATE:
1. NEVER invent facts. Only state what you can see or read in the images with confidence.
2. NEVER suggest or estimate price. Do not include price fields.
3. NEVER invent: storage capacity, mileage, year, included accessories, damage, serial numbers, or specs not visible.
4. If uncertain, use missing_fields or disambiguation — do NOT guess.
5. Confidence scores (0-100) must reflect true certainty.
6. Description: professional, honest. Mention what is NOT confirmed when relevant.
7. Title: natural SEO-friendly format: Brand Model ProductType KeySpec – Condition (max 100 chars).
8. Tags: max 15 unique keywords, no duplicates, no price terms.
9. condition must be one of: new, like-new, excellent, good, fair, for-parts, unknown
10. Pick category and subcategory ONLY from the provided catalog slugs.

Use disambiguation when you recognize a product type but not the exact model (confidence < 85).
Use missing_fields for required info the user must provide (storage, size, mileage, year, etc.).`;

function getAiProviderConfig() {
  const apiKey = Deno.env.get("AI_PROVIDER_API_KEY");
  const gatewayUrl = Deno.env.get("AI_PROVIDER_GATEWAY_URL");
  if (!apiKey) throw new Error("AI_PROVIDER_API_KEY not configured");
  if (!gatewayUrl) throw new Error("AI_PROVIDER_GATEWAY_URL not configured");
  return { apiKey, gatewayUrl };
}

async function fetchAiGateway(body: unknown, stream = false) {
  const { apiKey, gatewayUrl } = getAiProviderConfig();
  return fetch(gatewayUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    getAiProviderConfig();

    const body = await req.json();
    const mode: "chat" | "suggest_listing" | "parse_search" | "analyze_listing_images" = body.mode ?? "chat";

    if (mode === "chat") {
      const { messages } = body;
      if (!Array.isArray(messages)) {
        return json({ error: "messages array required" }, 400);
      }
      const chatSystem = `${SYSTEM_PROMPT}

Chat mode rules — STRICT:
- Focus on helping the user complete a deal (find, list, message, negotiate, buy).
- Suggest concrete next actions (e.g. "Send: 'Is 250€ your best price?'", "Offer 220€", "Open the listing").
- Keep replies under 2 sentences unless the user explicitly asks for more detail.
- Prefer action over explanation. No filler, no apologies, no restating the question.`;
      const upstream = await fetchAiGateway({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: chatSystem }, ...messages],
        stream: true,
      }, true);
      if (!upstream.ok) return upstreamError(upstream);
      return new Response(upstream.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (mode === "suggest_listing") {
      const { title = "", description = "", vertical = "" } = body;
      const userPrompt = `Listing draft:
Vertical hint: ${vertical || "(unknown — pick best)"}
Title: ${title || "(empty)"}
Description: ${description || "(empty)"}

Suggest improvements for this listing.`;

      const upstream = await fetchAiGateway({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_listing",
            description: "Return marketplace listing suggestions",
            parameters: {
              type: "object",
              properties: {
                vertical: { type: "string", enum: [...VERTICALS] },
                category_hint: { type: "string", description: "Best matching category label" },
                improved_title: { type: "string", description: "Concise compelling title (<60 chars)" },
                improved_description: { type: "string", description: "Better description with key selling points" },
                suggested_price_min: { type: "number" },
                suggested_price_max: { type: "number" },
                currency: { type: "string", enum: ["EUR", "ALL", "MKD"] },
                tips: { type: "array", items: { type: "string" }, description: "2-4 quick tips to sell faster" },
              },
              required: ["vertical", "improved_title", "improved_description", "tips"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_listing" } },
      });
      if (!upstream.ok) return upstreamError(upstream);
      const data = await upstream.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = args ? JSON.parse(args) : null;
      return json({ suggestion: parsed });
    }

    if (mode === "parse_search") {
      const { query = "" } = body;
      if (!query.trim()) return json({ filters: { query: "" } });

      const upstream = await fetchAiGateway({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Parse this marketplace search into structured filters: "${query}"` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "parse_search",
            description: "Convert vague natural language search into marketplace filters",
            parameters: {
              type: "object",
              properties: {
                cleaned_query: { type: "string", description: "Cleaned keyword string for full-text search" },
                vertical: { type: "string", enum: [...VERTICALS], description: "Best vertical if obvious" },
                condition: { type: "string", enum: ["new", "like-new", "good", "used", "for-parts"] },
                price_max: { type: "number" },
                price_min: { type: "number" },
                location: { type: "string", description: "City or region if mentioned" },
                sort_by: { type: "string", enum: ["newest", "price-low", "price-high", "relevance"] },
                intent: { type: "string", enum: ["buy", "sell", "rent", "service", "ask"] },
                explanation: { type: "string", description: "Short user-facing note about what was understood" },
              },
              required: ["cleaned_query"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "parse_search" } },
      });
      if (!upstream.ok) return upstreamError(upstream);
      const data = await upstream.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = args ? JSON.parse(args) : { cleaned_query: query };
      return json({ filters: parsed });
    }

    if (mode === "analyze_listing_images") {
      const { images = [], category_catalog = [], locale = "en" } = body;
      if (!Array.isArray(images) || images.length === 0) {
        return json({ error: "At least one image required" }, 400);
      }
      if (images.length > 10) {
        return json({ error: "Maximum 10 images" }, 400);
      }

      const catalogJson = JSON.stringify(category_catalog).slice(0, 12000);
      const userText = `Analyze these ${images.length} product photo(s) and create a marketplace listing draft.

User locale: ${locale}
Category catalog (use ONLY these slugs for vertical, category, subcategory):
${catalogJson}

Return structured analysis via the tool. Remember: NO price, NO invented specs.`;

      const imageParts = images.map((b64: string) => ({
        type: "image_url" as const,
        image_url: { url: `data:image/jpeg;base64,${b64}` },
      }));

      const upstream = await fetchAiGateway({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: LISTING_VISION_PROMPT },
          {
            role: "user",
            content: [{ type: "text", text: userText }, ...imageParts],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_listing_images",
            description: "Return vision-based listing draft with confidence scores",
            parameters: {
              type: "object",
              properties: {
                vertical: { type: "string", enum: [...VERTICALS] },
                vertical_confidence: { type: "number" },
                category: { type: "string", description: "Category slug from catalog" },
                category_confidence: { type: "number" },
                subcategory: { type: "string", description: "Subcategory slug from catalog if applicable" },
                subcategory_confidence: { type: "number" },
                title: { type: "string" },
                title_confidence: { type: "number" },
                description: { type: "string" },
                brand: { type: "string" },
                brand_confidence: { type: "number" },
                model: { type: "string" },
                model_confidence: { type: "number" },
                condition: {
                  type: "string",
                  enum: ["new", "like-new", "excellent", "good", "fair", "for-parts", "unknown"],
                },
                condition_confidence: { type: "number" },
                attributes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string" },
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                    required: ["key", "value", "confidence"],
                  },
                },
                tags: { type: "array", items: { type: "string" }, description: "Max 15 unique tags" },
                missing_fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      label: { type: "string" },
                      reason: { type: "string" },
                      input_type: { type: "string", enum: ["text", "select", "number"] },
                      options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: { label: { type: "string" }, value: { type: "string" } },
                          required: ["label", "value"],
                        },
                      },
                    },
                    required: ["field", "label", "reason"],
                  },
                },
                disambiguation: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      message: { type: "string" },
                      confidence: { type: "number" },
                      options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: { label: { type: "string" }, value: { type: "string" } },
                          required: ["label", "value"],
                        },
                      },
                    },
                    required: ["field", "message", "confidence", "options"],
                  },
                },
                recognition_summary: { type: "string", description: "One-line summary of what was recognized" },
                overall_confidence: { type: "number" },
                image_quality_notes: { type: "array", items: { type: "string" } },
              },
              required: [
                "vertical", "vertical_confidence", "category", "category_confidence",
                "title", "title_confidence", "description",
                "condition", "condition_confidence",
                "attributes", "tags", "missing_fields", "disambiguation",
                "recognition_summary", "overall_confidence",
              ],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_listing_images" } },
      });
      if (!upstream.ok) return upstreamError(upstream);
      const data = await upstream.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = args ? JSON.parse(args) : null;
      if (!parsed) return json({ error: "No analysis returned" }, 500);
      if (Array.isArray(parsed.tags)) {
        parsed.tags = [...new Set(parsed.tags.map((t: string) => String(t).trim()).filter(Boolean))].slice(0, 15);
      }
      return json({ analysis: parsed });
    }

    return json({ error: "Unknown mode" }, 400);
  } catch (e) {
    console.error("ai-assistant error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function upstreamError(resp: Response) {
  if (resp.status === 429) return json({ error: "Rate limit exceeded. Please try again shortly." }, 429);
  if (resp.status === 402) return json({ error: "AI provider credits exhausted. Top up your AI provider account." }, 402);
  const text = await resp.text().catch(() => "");
  console.error("Upstream AI error:", resp.status, text);
  return json({ error: "AI gateway error" }, 500);
}
