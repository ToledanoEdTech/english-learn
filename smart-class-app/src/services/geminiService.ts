import { GoogleGenAI } from "@google/genai";
import { Student, GenerationStyle } from "../types";

const getClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export const generateStudentMessage = async (
  student: Student,
  style: GenerationStyle,
  customInstructions: string,
  teacherName: string,
  abortSignal?: AbortSignal
): Promise<string> => {
  const ai = getClient();
  const prompt = createPrompt(student, style, customInstructions, teacherName);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        systemInstruction: `You are a professional school teacher writing a personalized update.
        Guidelines:
        1. Be honest and direct based on the data.
        2. Sign the message exactly as: "${teacherName}".
        3. Language: Write in ${student.language || 'Hebrew'}.
        `
      }
    });
    if (abortSignal?.aborted) { throw new Error("Aborted"); }
    return response.text?.trim() || "שגיאה ביצירת ההודעה.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "שגיאה בהתחברות ל-AI. אנא בדוק את מפתח ה-API או נסה שנית.";
  }
};

const createPrompt = (student: Student, style: GenerationStyle, customInstructions: string, teacherName: string): string => {
  let dataDescription = JSON.stringify(student.subjects, null, 2);
  let styleInstructions = "";
  let openingInstruction = "";
  const targetLanguage = student.language || 'Hebrew';

  if (style === GenerationStyle.REPORT_CARD) {
     openingInstruction = `Start the message exactly with: "${student.firstName} היקר," (or correct gender equivalent in Hebrew).`;
     styleInstructions = `
     Write a personal, warm, and strengthening letter for the report card (approx. 300-500 characters).
     KEY FOCUS INSTRUCTIONS:
     1. Focus PRIMARILY on **Behavior, Derech Eretz (Respect), and Good Character Traits (Middot Tovot)**.
     2. Academic achievements are secondary to character and values in this message.
     3. Highlight positive points, kindness, social behavior, and effort.
     4. Be optimistic, empowering, and warm.
     5. Do NOT mention specific grades or negative numbers.
     `;
  } else if (style === GenerationStyle.DETAILED) {
     openingInstruction = `Start with a polite greeting to the parents (e.g., "שלום וברכה"). Address the student by name (${student.firstName}).`;
     styleInstructions = "Include specific grades, detailed behavioral notes, absences, lates, and specific events mentioned in the data. Provide a comprehensive update.";
  } else {
     openingInstruction = `Start with a polite greeting to the parents. Address the student by name (${student.firstName}).`;
     styleInstructions = `
     Write a **GENERAL OVERVIEW** summary only.
     STRICT PROHIBITIONS:
     - DO NOT list specific grades.
     - DO NOT list specific disciplinary events.
     - DO NOT list specific subject names unless summarizing a broad category.
     FOCUS ON:
     - The overall trend (Is the student improving? Stable? Struggling?).
     - General attitude, effort, and attendance patterns as a whole.
     - A holistic view of the student's status in the class.
     `;
  }

  return `
  Student Name: ${student.fullName}
  First Name: ${student.firstName}
  Teacher Name: ${teacherName}
  
  Data from various subjects (Grades, Behavior, Absences, Comments):
  ${dataDescription}

  Task: Write a message based on the data above.
  
  Specific Instructions:
  1. ${openingInstruction}
  2. ${styleInstructions}
  3. ${customInstructions}
  
  Ensure the message is written entirely in ${targetLanguage} and signed by ${teacherName}.
  `;
};