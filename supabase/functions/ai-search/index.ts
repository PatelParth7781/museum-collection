import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = interpretQuery(query.toLowerCase());

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to process search", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Keyword-based query interpretation — maps natural language to collection filters
// This is the fallback that works without any external AI API
function interpretQuery(query: string): {
  search_text: string;
  category_id?: string;
  period_id?: string;
  condition?: string;
  material?: string;
} {
  const result: {
    search_text: string;
    category_id?: string;
    period_id?: string;
    condition?: string;
    material?: string;
  } = { search_text: "" };

  // Category keywords
  const categoryMap: Record<string, string> = {
    "sculpt": "sculpture",
    "statue": "sculpture",
    "carving": "sculpture",
    "paint": "painting",
    "miniature": "painting",
    "mural": "painting",
    "textile": "textile",
    "fabric": "textile",
    "weaving": "textile",
    "sari": "textile",
    "shawl": "textile",
    "embroider": "textile",
    "pottery": "pottery",
    "ceramic": "pottery",
    "terracotta": "pottery",
    "manuscript": "manuscript",
    "script": "manuscript",
    "calligraph": "manuscript",
    "document": "manuscript",
    "metal": "metalwork",
    "bronze": "metalwork",
    "copper": "metalwork",
    "iron": "metalwork",
    "silver": "metalwork",
    "jewelry": "jewelry",
    "ornament": "jewelry",
    "amulet": "jewelry",
    "armor": "arms & armor",
    "armour": "arms & armor",
    "weapon": "arms & armor",
    "sword": "arms & armor",
    "shield": "arms & armor",
    "helmet": "arms & armor",
    "axe": "arms & armor",
  };

  // Period keywords
  const periodMap: Record<string, string> = {
    "indus": "Indus Valley",
    "harappan": "Indus Valley",
    "maurya": "Maurya",
    "ashoka": "Maurya",
    "gupta": "Gupta",
    "medieval": "Medieval",
    "chola": "Medieval",
    "mughal": "Mughal",
    "colonial": "Colonial",
    "british": "Colonial",
  };

  // Condition keywords
  const conditionMap: Record<string, string> = {
    "excellent": "excellent",
    "pristine": "excellent",
    "good condition": "good",
    "good": "good",
    "fair": "fair",
    "poor": "poor",
    "damaged": "poor",
    "critical": "critical",
    "restored": "restored",
    "conserved": "restored",
  };

  // Material keywords (direct text search)
  const materialKeywords = [
    "stone", "sandstone", "marble", "wood", "ivory", "gold", "silver",
    "steel", "wool", "silk", "cotton", "paper", "glass", "jade",
    "pashmina", "terracotta", "steatite",
  ];

  // Geographic keywords
  const geoKeywords = [
    "gujarat", "gujarati", "rajasthan", "rajasthani", "bengal", "bengali",
    "kashmir", "kashmiri", "tamil", "south india", "north india",
    "delhi", "lucknow", "varanasi", "patan", "jaipur", "mysore",
    "sarnath", "mathura", "mohenjo", "harappa",
  ];

  const searchTerms: string[] = [];

  // Check categories
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (query.includes(keyword)) {
      searchTerms.push(category);
      break;
    }
  }

  // Check periods
  for (const [keyword, period] of Object.entries(periodMap)) {
    if (query.includes(keyword)) {
      searchTerms.push(period);
      break;
    }
  }

  // Check conditions
  for (const [keyword, condition] of Object.entries(conditionMap)) {
    if (query.includes(keyword)) {
      result.condition = condition;
      break;
    }
  }

  // Check materials
  for (const material of materialKeywords) {
    if (query.includes(material)) {
      result.material = material;
      searchTerms.push(material);
      break;
    }
  }

  // Check geographic terms
  for (const geo of geoKeywords) {
    if (query.includes(geo)) {
      searchTerms.push(geo);
      break;
    }
  }

  // Check for century queries
  const centuryMatch = query.match(/(\d+)(?:th|st|nd|rd)?\s*century/);
  if (centuryMatch) {
    searchTerms.push(centuryMatch[0]);
  }

  // Check for "ancient" / "old" / "historical"
  if (query.includes("ancient") || query.includes("old") || query.includes("historical")) {
    searchTerms.push("ancient");
  }

  result.search_text = searchTerms.join(" ");

  return result;
}
