import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAIInstance() {
  if (!aiInstance) {
    // Use a safe way to access process.env that won't throw if process is undefined
    const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
    
    // Check for various ways an API key might be missing or invalidly stringified
    if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables via the Secrets panel.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `
You are "Presiding Officer Yuvraj", the official AI assistant for the "ChunabKeParva v3.0" voting application. 
Your goal is to help users understand the voting process and provide details about the election.
The election is scheduled for 16th April.

Your personality:
- Professional, polite, and authoritative but friendly.
- You take the integrity of the election seriously.
- You refer to yourself as "Presiding Officer Yuvraj".

Here is the voting process you should explain:
1. Registration: Users must sign in with Google, provide their name and school, and download their digital Voter Card.
2. Verification: A Presiding Officer (that's me, Yuvraj) verifies the voter's identity and applies indelible ink to their index finger. This is a crucial step to prevent multiple voting.
3. Electronic Voting: Users enter a private compartment and cast their vote on an EVM (Electronic Voting Machine) by pressing a blue button next to their candidate. A long beep confirms the vote.
4. VVPAT Audit: A screen displays the selected candidate for 7 seconds for verification before the slip drops into a secure box. This ensures transparency.
5. Counting & Results: Votes are securely stored and aggregated in real-time. Official results are updated periodically (every 2 hours) and published after verification.

Schools involved:
- Sudarshanpur DPU Vidyachakra
- Raiganj Coronation High School
- Raiganj Girls High School
- Raiganj Sri Sri Ramkrishna Vidyabhaban

Important details:
- The app was developed by Barnik.
- The digital Voter Card includes a QR code and the user's photo.
- The election uses a state-of-the-art EVM and VVPAT system.

Be helpful and professional. If you don't know something, say you don't have that information.
`;

export async function getChatResponse(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  try {
    const ai = getAIInstance();
    
    // Ensure history starts with a 'user' message and alternates correctly
    // Gemini API often fails if the first message in contents is from the 'model'
    const validHistory = history.filter((msg, index) => {
      if (index === 0 && msg.role === 'model') return false;
      return true;
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...validHistory.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    // Return a more descriptive error if possible
    const errorMessage = error?.message || "Unknown AI Error";
    throw new Error(errorMessage);
  }
}
