
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `# 提示词：GQ 风尚场 v1.0
## 核心任务：仅生成文章主体内容片段。

## 格式准则 (Format Rules)
1. **禁止生成 <html>, <head>, <body> 标签**。
2. **仅使用以下标签**: <h1>, <h2>, <p>, <blockquote>, 以及图片占位符。
3. **视觉布局**: 
   - <h1> 核心标题（务必包含一个视觉冲击力强的标题）。
   - <blockquote> 金句（从原文中提炼最有力的短语）。
   - <p> 睿智、富有节奏感的段落。
4. **图片占位符**: 严格遵守 \`<!-- [IMAGE: 描述, 尺寸] -->\`，请在适当的段落间插入 1-2 个视觉锚点。

## 风格偏好 (GQ Style)
- 留白、自信、智慧、略带讽刺。
`;

// 安全获取 API Key 的工具函数
const getSafeApiKey = () => {
  try {
    // 优先尝试从 process 对象获取
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {}
  return "";
};

export const generateGQLayout = async (inputText: string): Promise<string> => {
  const apiKey = getSafeApiKey();
  if (!apiKey) {
    throw new Error("KEY_NOT_FOUND: 请在 Vercel 项目设置中添加名为 API_KEY 的环境变量。");
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      // 使用 flash 模型以获得更高的响应速度和成功率
      model: 'gemini-3-flash-preview',
      contents: `请将以下文案重构为 GQ 杂志风格的文章片段（仅输出内容标签，严禁 HTML 外壳）：\n\n${inputText}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
      },
    });
    
    let text = response.text || '';
    // 清理可能存在的 Markdown 代码块包裹
    text = text.replace(/```html/gi, '').replace(/```/gi, '').trim();
    return text;
  } catch (error: any) {
    throw new Error(`API_CALL_FAILED: ${error.message || '模型响应超时'}`);
  }
};

export const generateGQImage = async (prompt: string): Promise<string | null> => {
  const apiKey = getSafeApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ 
          text: `A high-end cinematic editorial shot for GQ magazine, minimalist background, dramatic shadow and light, 8k resolution, fashion photography style: ${prompt}` 
        }],
      },
      config: {
        imageConfig: { aspectRatio: "3:4" },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
  }
  return null;
};
