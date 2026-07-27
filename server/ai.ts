import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ChatMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

export async function getMedicalResponse(
  userMessage: string,
  history: ChatMessage[] = [],
  patientContext: any = null,
  hospitalContext: any = null
): Promise<string> {
  const MEDICAL_SYSTEM_PROMPT = `You are "صحتك" (SehHatak), an expert AI medical assistant for a hospital system.

YOUR GOAL: Act like a proactive triage nurse and receptionist. Evaluate symptoms, consider the patient's medical context, recommend the precise clinic, and help them book an appointment with an available doctor.
LANGUAGE: ALWAYS reply in the user's language (especially Arabic).

CURRENT PATIENT CONTEXT:
${patientContext ? JSON.stringify(patientContext, null, 2) : "No patient context available."}

HOSPITAL CONTEXT (Clinics & Doctors):
${hospitalContext ? JSON.stringify(hospitalContext, null, 2) : "No hospital context available."}

STAGE 1: TRIAGE & EVALUATION
- Evaluate the patient's symptoms alongside their MEDICAL HISTORY, AGE, and GENDER. For example, if a 60-year-old male with a history of hypertension has stomach pain, consider cardiac issues (Cardiology) rather than just Gastroenterology.
- Ask 1-2 clarifying questions if symptoms are vague. DO NOT ask if they already provided the info.

STAGE 2: RECOMMENDATION & BOOKING
- Recommend the exact clinic from the Hospital Context.
- Check the 'doctors' array in the Hospital Context to see if there is a doctor assigned to that clinic's ID.
- IF THERE ARE NO DOCTORS in the recommended clinic, explicitly tell the patient: "لا يوجد أطباء مسجلين حالياً في هذه العيادة في النظام، يرجى المحاولة لاحقاً أو اختيار عيادة أخرى." (There are no doctors registered in this clinic currently). DO NOT offer to book an appointment in this case.
- IF THERE IS A DOCTOR, name the specific available doctor, mention their working days and hours, and propose a specific date and time. Ask the patient if they want you to book an appointment with that doctor right now (Ask for confirmation).

STAGE 3: ACTION (BOOKING)
If the patient EXPLICITLY agrees to book the appointment (e.g., "yes", "book it", "احجز", "موافق", "تمام"), you MUST output a JSON action block at the END of your response.
Format exactly like this (Replace X with doctorId, Y with clinicId, and date with YYYY-MM-DD):
[ACTION:BOOK_APPOINTMENT, {"doctorId": X, "clinicId": Y, "date": "2026-07-25"}]

IMPORTANT RULES:
1. NO long paragraphs. Keep it a natural short chat.
2. NEVER prescribe medication.
3. EMERGENCY: If symptoms include acute chest pain squeezing, signs of a stroke, or severe bleeding, IMMEDIATELY say: "يرجى التوجه لقسم الطوارئ فوراً للحصول على رعاية طبية عاجلة!"
`;
  const apiKey = process.env.GEMINI_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Google API strictly requires history to start with a 'user' message
  let safeHistory = Array.isArray(history) ? [...history] : [];
  while (safeHistory.length > 0 && safeHistory[0].role !== "user") {
    safeHistory.shift();
  }
  
  try {
    const MAX_RETRIES = 4;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
          const combinedMessage = "SYSTEM INSTRUCTION: " + MEDICAL_SYSTEM_PROMPT + "\n\nUSER MESSAGE: " + userMessage;
          const result = await fallbackChat.sendMessage(combinedMessage);
          responseText = (await result.response).text();
          console.log("Fallback AI Response:", responseText);
        } else {
          throw e; // Rethrow to outer try-catch
        }
      }
      return responseText;
    } catch (error: any) {
      const errMessage = error?.message || String(error);
      
      // If it's a rate limit error (429) AND we haven't reached max retries, wait and retry silently
      if ((errMessage.includes("429") || errMessage.includes("Too Many Requests") || errMessage.includes("Quota")) && attempt < MAX_RETRIES) {
        console.log(`[Rate Limit Hit] Silent Retry ${attempt}/${MAX_RETRIES} in 8 seconds...`);
        // Wait 8 seconds before trying again to clear the quota window
        await new Promise(resolve => setTimeout(resolve, 8000));
        continue; // Go to the next iteration of the loop
      }

      // If it's not a rate limit error or we exhausted all retries, break out of loop and handle it below
      throw error;
    }
  }
  } catch (error: any) {
    console.error("Gemini API error exhausted all retries:", error?.message);
    
    // Ultimate graceful fallback if API is completely blocked/rate-limited/revoked
    const isArabic = /[\u0600-\u06FF]/.test(userMessage);

    return isArabic 
      ? "أهلاً بك! نظراً لوجود ضغط كبير جداً على شبكة المستشفى حالياً، أنصحك بالتوجه لصفحة الحجز مباشرة لاختيار العيادة المناسبة لحالتك الطبية. أنا هنا دائماً لمساعدتك."
      : "Welcome! Due to exceptionally high network traffic right now, I recommend going directly to the booking page to select the appropriate clinic. I'm always here to help.";
  }
}
