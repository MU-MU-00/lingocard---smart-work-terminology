
import { TermData } from "../types";
import { v4 as uuidv4 } from 'uuid';

// 火山方舟 API 配置（/api/v3/responses）
// Vite 中浏览器端使用 import.meta.env 而不是 process.env
// 尝试多种方式读取 API key
const DOUBAO_API_KEY = 
  import.meta.env.VITE_GEMINI_API_KEY || 
  import.meta.env.GEMINI_API_KEY || 
  import.meta.env.API_KEY ||
  (typeof process !== 'undefined' && (process.env?.API_KEY || process.env?.GEMINI_API_KEY)) ||
  '01e1f8a2-ec94-4881-a0d0-b6fc4a92f042'; // 临时硬编码作为后备

const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const DOUBAO_MODEL = 'doubao-seed-1-8-251228';

// Manual base64 decoding helper as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual PCM audio decoding helper as per guidelines
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateTermDetails = async (term: string): Promise<Omit<TermData, 'groupId' | 'createdAt' | 'status' | 'nextReviewDate' | 'reviewStage' | 'consecutiveFailures'>> => {
  // 调试：检查 API key 是否读取到
  console.log('API Key check:', {
    hasKey: !!DOUBAO_API_KEY,
    keyLength: DOUBAO_API_KEY?.length,
    keyPrefix: DOUBAO_API_KEY?.substring(0, 10) + '...',
    envVars: {
      VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY ? 'exists' : 'missing',
      GEMINI_API_KEY: import.meta.env.GEMINI_API_KEY ? 'exists' : 'missing',
      API_KEY: import.meta.env.API_KEY ? 'exists' : 'missing',
    }
  });
  
  if (!DOUBAO_API_KEY) {
    throw new Error("API key not configured. Please check .env.local file.");
  }

  try {
    // ========== AI 格式与规范：本项目中所有生成术语卡片的 prompt 与返回格式均在此处定义 ==========
    const prompt = `你是一个工作/商业术语解释助手。请针对术语"${term}"，严格按以下规范返回 JSON，不要返回任何其他文字。

【格式规范】
- 必须返回且仅返回一个合法的 JSON 对象，不要包含 markdown 代码块或说明文字。
- 所有字符串字段均使用双引号，内容中的换行用 \\n，引号用 \\" 转义。

【字段说明】
1. term: 术语原文，与用户输入一致（字符串）
2. phonetic: 该术语的 IPA 音标，仅音标（字符串）
3. termTranslation: 【重要】该名词在另一种语言下的专业术语译名，仅译名本身、不要解释。若输入为英文则此处为对应中文专业术语（如 API→应用程序接口）；若输入为中文则此处为对应英文专业术语（如 人工智能→Artificial Intelligence）。只填一个短语/词组，不要填定义或句子。（字符串）
4. definitionEn: 简洁的英文定义，一两句话（字符串）
5. definitionCn: 详细的中文定义，在专业背景下充分解释概念（字符串）
6. example: 一句简短的例句（字符串）
7. wrongDefinitions: 两个错误但看似合理的中文定义，用于多选题（字符串数组，长度为 2）

请确保返回的是有效的 JSON 格式。`;

    const response = await fetch(DOUBAO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
      },
      body: JSON.stringify({
        model: DOUBAO_MODEL,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        url: DOUBAO_API_URL,
        hasApiKey: !!DOUBAO_API_KEY,
      });
      throw new Error(`API 请求失败 (${response.status}): ${errorText || response.statusText}`);
    }

    const result = await response.json();
    console.log('API Response:', result);
    
    // 火山方舟 v3 responses 的 output 可能是数组或对象
    let responseText = null;
    
    // 如果 output 是数组（根据控制台，这是实际情况）
    if (Array.isArray(result.output) && result.output.length > 0) {
      // 查找 type 为 "message" 的输出项（跳过 "reasoning" 类型的思考过程）
      const messageOutput = result.output.find((item: any) => item.type === 'message' || item.role === 'assistant');
      
      if (messageOutput) {
        // 从 content 数组中提取文本
        if (Array.isArray(messageOutput.content)) {
          const textContent = messageOutput.content.find((item: any) => 
            item.type === 'output_text' || item.type === 'text' || item.text
          );
          responseText = textContent?.text || textContent?.content;
        } else if (messageOutput.content) {
          responseText = messageOutput.content;
        } else if (messageOutput.text) {
          responseText = messageOutput.text;
        }
      }
      
      // 如果还没找到，尝试第一个输出项
      if (!responseText && result.output[0]) {
        const firstOutput = result.output[0];
        if (Array.isArray(firstOutput.content)) {
          const textContent = firstOutput.content.find((item: any) => 
            item.type === 'output_text' || item.type === 'text' || item.text
          );
          responseText = textContent?.text || textContent?.content;
        } else {
          responseText = firstOutput.text || firstOutput.content;
        }
      }
    } 
    // 如果 output 是对象
    else if (result.output && typeof result.output === 'object') {
      responseText = 
        result.output.text ||
        result.output.content ||
        result.output.choices?.[0]?.message?.content ||
        result.output.choices?.[0]?.content;
    }
    // 其他可能的格式
    else {
      responseText = 
        result.text ||
        result.content ||
        result.choices?.[0]?.message?.content ||
        result.choices?.[0]?.content;
    }
    
    if (!responseText) {
      console.error('Full API Response:', JSON.stringify(result, null, 2));
      throw new Error("无法从 API 响应中提取内容。响应格式: " + JSON.stringify(result).slice(0, 300));
    }

    // 解析 JSON 响应
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // 如果响应不是纯 JSON，尝试提取 JSON 部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON response");
      }
    }

    return {
      id: uuidv4(),
      term: data.term || term,
      phonetic: data.phonetic || '',
      termTranslation: data.termTranslation ?? '',
      definitionEn: data.definitionEn || '',
      definitionCn: data.definitionCn || '',
      example: data.example || '',
      wrongDefinitions: Array.isArray(data.wrongDefinitions) ? data.wrongDefinitions : [],
    };
  } catch (error: any) {
    console.error("Generation Error:", error);
    // 提供更友好的错误信息
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('API key not configured')) {
      throw new Error("API 密钥未配置。请检查 .env.local 文件中的 GEMINI_API_KEY。");
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      throw new Error("API 密钥无效或已过期。请检查 .env.local 中的 GEMINI_API_KEY 是否正确。");
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      throw new Error("API 访问被拒绝。请检查 API 密钥权限或账户状态。");
    } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      throw new Error("网络连接失败。请检查网络连接或 API 服务是否可用。");
    } else {
      throw new Error(`生成失败: ${errorMessage}`);
    }
  }
};

let audioContext: AudioContext | null = null;

export const playPronunciation = async (text: string): Promise<void> => {
  // 豆包 API 暂不支持 TTS，使用浏览器内置的语音合成 API
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // 使用 Web Speech API 进行语音合成
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech synthesis not supported");
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
};
