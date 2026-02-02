import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    // Пріоритет: Змінна середовища Vercel, інакше — hardcoded ключ
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDhNAK8S9_HQdCQD-y9nkY_d9IaLOmm9tg";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key is missing' }),
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/gi, '').trim();

    return new Response(JSON.stringify({ data: JSON.parse(text) }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[Server /api/gemini]', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Server Error' }),
      { status: 500 }
    );
  }
}
