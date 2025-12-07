import { NextRequest, NextResponse } from "next/server";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) {
      return response;
    }

    // If rate limited (429), wait and retry
    if (response.status === 429) {
      const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      lastError = new Error(`Rate limit exceeded`);
      continue;
    }

    // For other errors, don't retry
    throw new Error(`Gemini API error: ${response.status}`);
  }

  throw lastError || new Error("Max retries exceeded");
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, shortDescription, tags } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const prompt = `Generate SEO-optimized metadata for an e-commerce product. Be concise and focus on conversions.

Product Details:
- Name: ${name}
- Description: ${description || "Not provided"}
- Short Description: ${shortDescription || "Not provided"}
- Tags: ${tags || "Not provided"}

Generate the following fields in JSON format:
1. metaTitle: Page title for search engines (max 60 chars, include product name)
2. metaDescription: Brief compelling description (max 155 chars, include call-to-action)
3. metaKeywords: Comma-separated relevant keywords (5-8 keywords)
4. ogTitle: Social media title (max 60 chars, catchy and shareable)
5. ogDescription: Social media description (max 160 chars, engaging)

Important:
- Use natural language, not keyword stuffing
- Focus on benefits and value proposition
- Include Indian context if relevant (prices in INR, Indian customers)
- Make it compelling for potential buyers

Return ONLY valid JSON, no markdown or explanation.`;

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No response from Gemini");
    }

    // Clean up the response (remove markdown code blocks if present)
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    const seoData = JSON.parse(cleanedText);

    return NextResponse.json(seoData);
  } catch (error) {
    console.error("AI SEO generation error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Provide specific error messages for common issues
    if (errorMessage.includes("Rate limit")) {
      return NextResponse.json(
        { error: "AI service is busy. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate SEO content" },
      { status: 500 }
    );
  }
}
