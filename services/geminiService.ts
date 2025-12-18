
import { GoogleGenAI } from "@google/genai";
import { Question } from "../types";

// Always initialize the client using the API key obtained from process.env.API_KEY.
// Recommendation: Create the instance right before the API call to ensure use of the correct key.

export const getAiFeedback = async (score: number, history: Question[], difficulty: string): Promise<string> => {
  // Ensure strict adherence to initialization guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const wrongAnswers = history.filter(q => !q.isCorrect);
  
  const prompt = `
    أنت معلم رياضيات ودود جداً ومشجع للأطفال.
    قام طالب بإنهاء اختبار رياضيات بمستوى "${difficulty}".
    النتيجة: ${score} من ${history.length}.
    
    تفاصيل الأخطاء:
    ${wrongAnswers.map(q => `سؤال: ${q.num1} ${q.operation} ${q.num2} = ؟ (الصح: ${q.correctAnswer}، إجابة الطالب: ${q.userAnswer})`).join('\n')}

    المطلوب منك:
    1. رسالة تشجيعية قصيرة (سطر واحد) تناسب مستواه.
    2. نصيحة بسيطة جداً للتحسن في المسائل التي أخطأ فيها.
    3. إذا كانت النتيجة كاملة، أعطه حقيقة ممتعة عن الأرقام.
    
    اجعل الرد باللغة العربية، بأسلوب مرح وقصير جداً (لا يتجاوز 3 أسطر).
  `;

  try {
    // Call generateContent with both the model name and the prompt.
    // gemini-3-flash-preview is suitable for basic text feedback tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // The text content is directly accessible via the .text property of the response object.
    return response.text || "أداء رائع! واصل التدريب لتصبح عبقري الرياضيات الأول.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "محاولة ممتازة! استمر في حل المسائل لتطور مهاراتك أكثر.";
  }
};
