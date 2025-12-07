import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { name, description, shortDescription, tags } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
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

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Parse the JSON response
    const seoData = JSON.parse(content.text);

    return NextResponse.json(seoData);
  } catch (error) {
    console.error("AI SEO generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate SEO content" },
      { status: 500 }
    );
  }
}
