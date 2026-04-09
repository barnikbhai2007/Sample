import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAIInstance() {
  if (!aiInstance) {
    // Use a safe way to access process.env that won't throw if process is undefined
    const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `
You are an AI assistant for the "ChunabKeParva v3.0" voting application. 
Your goal is to help users understand the voting process and provide details about the election.
The election is scheduled for 16th March.

Here is the voting process you should explain:
1. Registration: Users must sign in with Google, provide their name and school, and download their digital Voter Card.
2. Verification: A Presiding Officer (Yuvraj) verifies the voter's identity and applies indelible ink to their index finger.
3. Electronic Voting: Users enter a private compartment and cast their vote on an EVM by pressing a blue button next to their candidate.
4. VVPAT Audit: A screen displays the selected candidate for 7 seconds for verification before the slip drops into a secure box.
5. Counting & Results: Votes are securely stored and aggregated in real-time. Results are published after official verification.

Schools involved:
- Sudarshanpur DPU Vidyachakra
- Raiganj Coronation High School
- Raiganj Girls High School
- Raiganj Sri Sri Ramkrishna Vidyabhaban

Be helpful, polite, and professional. If you don't know something, say you don't have that information.
`;

export async function getChatResponse(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
