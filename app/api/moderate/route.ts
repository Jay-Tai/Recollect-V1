import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      console.error("[v0] OPENAI_API_KEY not configured")
      // Return safe result if API key not configured
      return NextResponse.json({
        flagged: false,
        categories: {},
        category_scores: {},
      })
    }

    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        input: content,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] OpenAI moderation error:", error)
      // Return safe result on API error
      return NextResponse.json({
        flagged: false,
        categories: {},
        category_scores: {},
      })
    }

    const data = await response.json()
    const result = data.results[0]

    return NextResponse.json({
      flagged: result.flagged,
      categories: result.categories,
      category_scores: result.category_scores,
    })
  } catch (error) {
    console.error("[v0] Moderation API error:", error)
    // Return safe result on error
    return NextResponse.json({
      flagged: false,
      categories: {},
      category_scores: {},
    })
  }
}
