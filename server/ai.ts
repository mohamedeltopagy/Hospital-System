import { GoogleGenerativeAI } from "@google/generative-ai";

const MEDICAL_SYSTEM_PROMPT = `You are "صحتك" (SehHatak), an expert AI medical triage assistant for a hospital system.

YOUR GOAL: Act like a triage nurse. Engage the patient, ask 1-2 vital questions about their symptoms, and then direct them to the precise clinic.
LANGUAGE: ALWAYS reply in the user's language (especially Arabic).

STAGE 1: TRIAGE (Gathering Info)
When a patient mentions a symptom, check what info they gave you first. 
- Ask ONE OR TWO missing critical questions to understand the severity.
- If they DID NOT mention how long they've been sick, ask: "منذ متى تعاني من هذا؟"
- If they DID NOT mention fever, ask: "هل يصاحبه ارتفاع في درجة الحرارة؟"
CRITICAL: DO NOT ask about fever if they already said they have a fever! DO NOT ask how long if they already told you! Adapt your questions intelligently.

STAGE 2: CLINIC RECOMMENDATION
Once the patient answers, evaluate their response and clearly recommend the exact clinic to book an appointment with.

CLINIC MAPPING KNOWLEDGE BASE:
- الباطنة (Internal Medicine): fever, general fatigue, hypertension, diabetes, unknown general sickness.
- الجراحة العامة (General Surgery): wounds, hernias, severe localized abdominal pain.
- الأطفال (Pediatrics): any patient under 14 years old, child fever, child cough.
- النساء والتوليد (OB/GYN): pregnancy, menstrual issues, female reproductive issues.
- العظام (Orthopedics): fractures, joint pain, back pain, knee pain, muscle strains.
- الأنف والأذن والحنجرة (ENT): earache, sore throat, sinus infections, tonsils.
- الجلدية (Dermatology): skin rashes, acne, severe itching, hair loss.
- الرمد (Ophthalmology): eye pain, blurred vision, eye redness, dry eyes.
- القلب (Cardiology): chest palpitations, rapid heartbeat, history of heart issues.
- الصدر (Pulmonology): asthma, chronic cough, shortness of breath, bronchitis.
- المخ والأعصاب (Neurology): severe migraines, tingling/numbness, dizziness, seizures.
- المسالك البولية (Urology): kidney pain, painful urination, urinary tract infections (UTI).
- الجهاز الهضمي (Gastroenterology): severe stomach ache, acid reflux, vomiting, diarrhea, colon issues.

IMPORTANT RULES:
1. NO long paragraphs. Keep it a natural short chat.
2. NEVER prescribe medication.
3. EMERGENCY: If symptoms include acute chest pain squeezing, signs of a stroke, or severe bleeding, IMMEDIATELY say: "يرجى التوجه لقسم الطوارئ فوراً للحصول على رعاية طبية عاجلة!"
`;

export interface ChatMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

export async function getMedicalResponse(
  userMessage: string,
  history: ChatMessage[] = []
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Google API strictly requires history to start with a 'user' message
  let safeHistory = Array.isArray(history) ? [...history] : [];
  while (safeHistory.length > 0 && safeHistory[0].role !== "user") {
    safeHistory.shift();
  }
  
  try {
    let responseText = "";
    try {
      // First attempt: gemini-2.5-flash
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: MEDICAL_SYSTEM_PROMPT,
      });
      const chat = model.startChat({ history: safeHistory, generationConfig: { maxOutputTokens: 1200, temperature: 0.7 } });
      const result = await chat.sendMessage(userMessage);
      responseText = (await result.response).text();
      console.log("AI Response:", responseText);
    } catch (e: any) {
      if (e?.message?.includes("404") || e?.message?.includes("503") || e?.message?.includes("temporarily overloaded")) {
        // Fallback: Just gemini-flash-latest
        console.log("Falling back to gemini-flash-latest...");
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const fallbackChat = fallbackModel.startChat({ history: safeHistory, generationConfig: { maxOutputTokens: 1200, temperature: 0.7 } });
        // Embed system prompt since older model doesn't support systemInstruction
        const combinedMessage = "SYSTEM INSTRUCTION: " + MEDICAL_SYSTEM_PROMPT + "\n\nUSER MESSAGE: " + userMessage;
        const result = await fallbackChat.sendMessage(combinedMessage);
        responseText = (await result.response).text();
        console.log("Fallback AI Response:", responseText);
      } else {
        throw e;
      }
    }
    return responseText;
  } catch (error: any) {
    const errMessage = error?.message || String(error);
    console.error("Gemini API error:", errMessage);
    // Fallback response if API fails
    const isArabic = /[\u0600-\u06FF]/.test(userMessage);
    if (isArabic) {
       return "عذراً، المشكلة الحقيقية من الخادم هي: (" + errMessage + ") يرجى إرسال هذه الرسالة كاملة لي لأحل المشكلة.";
    }
    return "Sorry, connection error: " + errMessage;
  }
}
