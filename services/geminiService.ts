
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `# 提示词：GQ 风尚场 v1.0
## 核心任务：仅生成文章主体内容片段。

## 格式准则 (Format Rules)
1. **禁止生成 <html>, <head>, <body> 标签**。
2. **仅使用以下标签**: <h1>, <h2>, <p>, <blockquote>, 以及图片占位符。
3. **视觉布局**: 
   - <h1> 必须极具冲击力（核心标题）。
   - <blockquote> 用于金句提炼。
   - 每一个段落 <p> 都要精炼，体现睿智。
4. **图片占位符**: 严格遵守 \`<!-- [IMAGE: 描述, 尺寸] -->\`。

## 风格偏好 (GQ Style)
- 留白是最高级的装饰。
- 文本需体现：自信、阳刚、智慧、幽默。
- 排版需体现：严谨的网格感。
`;

export const generateGQLayout = async (inputText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `请将以下文案重构为 GQ 杂志风格的文章片段（仅输出 <h1>, <p>, <blockquote> 等内容标签，严禁输出 html/body 外壳）：\n\n${inputText}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
  
  let text = response.text || '';
  
  // 深度清理：剔除所有可能干扰布局的标签外壳
  text = text.replace(/```html/gi, '')
             .replace(/```/gi, '')
             .replace(/<!DOCTYPE.*?>/gi, '')
             .replace(/<html.*?>/gi, '')
             .replace(/<\/html>/gi, '')
             .replace(/<head.*?>[\s\S]*?<\/head>/gi, '')
             .replace(/<body.*?>/gi, '')
             .replace(/<\/body>/gi, '')
             .trim();
             
  return text;
};

export const generateGQImage = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ 
        text: `Cinematic high-end fashion photography, GQ magazine style, sophisticated studio lighting, ${prompt}, ultra-sharp details, expensive texture, 8k.` 
      }],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
