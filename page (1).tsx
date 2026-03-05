// DeepSeek R1 API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com';

export async function generateResponse(prompt: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('未配置 DeepSeek API 密钥');
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-r1',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API 错误响应:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      
      if (response.status === 401) {
        throw new Error('API 密钥无效或未授权');
      } else if (response.status === 429) {
        throw new Error('API 请求次数超限，请稍后重试');
      } else if (response.status >= 500) {
        throw new Error('AI 服务暂时不可用，请稍后重试');
      } else {
        throw new Error(`API 请求失败: ${response.statusText}`);
      }
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('API 响应格式错误:', data);
      throw new Error('AI 服务返回的数据格式不正确');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('调用 DeepSeek API 时出错:', error);
    throw error;
  }
}
