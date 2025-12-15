import { GoogleGenAI } from "@google/genai";
import { Question } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getAiFeedback = async (score: number, history: Question[], difficulty: string): Promise<string> => {
  if (!ai) {
    return "عذراً، خدمة الذكاء الاصطناعي غير متوفرة حالياً. يرجى التحقق من مفتاح API.";
  }

  const wrongAnswers = history.filter(q => !q.isCorrect);
  
  const prompt = `
    أنت معلم رياضيات ذكي وداعم للأطفال.
    قام طالب بإنهاء اختبار رياضيات بمستوى صعوبة "${difficulty}".
    النتيجة: ${score} من 10.
    
    تفاصيل الأخطاء (إن وجدت):
    ${wrongAnswers.map(q => `سؤال: ${q.num1} ${q.operation} ${q.num2} = ؟ (الإجابة الصحيحة: ${q.correctAnswer}، إجابة الطالب: ${q.userAnswer})`).join('\n')}

    المطلوب:
    1. قدم رسالة تشجيعية قصيرة جداً ومناسبة للنتيجة.
    2. إذا كانت هناك أخطاء، اشرح بلطف وبساطة كيف يمكن للطالب تحسين مهاراته في هذا النوع من المسائل.
    3. إذا كانت النتيجة كاملة، قدم تحدياً ذهنياً صغيراً أو معلومة ممتعة عن الرياضيات.
    
    اجعل الرد باللغة العربية، بأسلوب مرح ومناسب للأطفال، ولا يتجاوز 4 أسطر.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "أحسنت! واصل التدريب.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "أحسنت محاولة جيدة! استمر في التدريب لتصبح أفضل.";
  }
};