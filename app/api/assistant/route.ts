import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 1. Check for API Key (supports both common names)
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { reply: "Error: Missing API Key. Add GEMINI_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  try {
    // 2. Parse the incoming message
    // Your frontend likely sends { message: "hi" }, but your previous code expected { prompt: "hi" }
    // We'll support both to be safe.
    const body = await req.json();
    const message = body.message || body.prompt;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ reply: "Send a message and I'll respond." });
    }

    // 3. Define the Model
    // FIXED: Changed "gemini-2.5-flash" (invalid) to "gemini-1.5-flash" (valid)
    const model = "gemini-2.5-flash";
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 4. Call Google Gemini REST API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: message }]
          }
        ],
        // Optional system instruction to define the persona
        systemInstruction: {
          parts: [{ text: "You are the webOS AI Assistant. Be concise, helpful, and friendly." }]
        }
      }),
    });

    const data = await response.json();

    // 5. Handle Errors from Google
    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return NextResponse.json({ 
        reply: `Error: ${data.error?.message || "Failed to fetch from Gemini"}` 
      });
    }

    // 6. Extract the text response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    return NextResponse.json({ reply: text });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ reply: `Server Error: ${error.message}` });
  }
}