import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function askGemini(prompt: string, systemInstruction?: string) {
  const model = genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: systemInstruction || "You are a helpful tutor for Algerian Baccalaureate students. Answer in Arabic or French as appropriate."
    }
  });
  const response = await model;
  return response.text;
}

export async function generateQuiz(subject: string, chapter: string) {
  const prompt = `Generate a quiz for the subject "${subject}" and chapter "${chapter}" for the Algerian Baccalaureate. 
  Include 3 questions: one MCQ, one short answer, and one problem-solving question.
  Return the response in JSON format with the following structure:
  {
    "title": "Quiz Title",
    "questions": [
      { "type": "MCQ", "text": "Question text", "options": ["A", "B", "C", "D"], "correct": "A", "explanation": "Why it is correct" },
      { "type": "Short", "text": "Question text", "correct": "Sample correct answer", "explanation": "Detailed explanation" },
      { "type": "Problem", "text": "Problem text", "correct": "Solution steps", "explanation": "Detailed solution" }
    ]
  }`;

  const model = genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });
  const response = await model;
  return JSON.parse(response.text);
}

export async function analyzeYouTube(url: string) {
  const prompt = `Analyze this YouTube lesson for the Algerian Baccalaureate: ${url}. 
  Provide a summary, key concepts, and 3 review questions. 
  Answer in Arabic.`;
  
  return askGemini(prompt, "You are an expert teacher summarizing educational videos.");
}
