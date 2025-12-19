
import { GoogleGenAI } from "@google/genai";
import { Question } from "../types";

/**
 * دالة الحصول على تعليقات ذكاء اصطناعي من Gemini
 * تتبع القواعد الصارمة للمكتبة @google/genai
 */
export const getAiFeedback = async (score: number, history: Question[], difficulty: string): Promise<string> => {
  // استخدام المفتاح حصراً من process.env.API_KEY
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
    // استخدام موديل gemini-3-flash-preview للمهام النصية البسيطة
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // الوصول للخاصية .text مباشرة (ليست دالة)
    return response.text || "أداء رائع! واصل التدريب لتصبح عبقري الرياضيات الأول.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "محاولة ممتازة! استمر في حل المسائل لتطور مهاراتك أكثر.";
  }
};
