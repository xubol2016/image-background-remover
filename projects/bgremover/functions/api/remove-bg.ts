import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  REMOVE_BG_API_KEY: string;
}

interface RemoveBgApiResponse {
  data: {
    result_b64: string;
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  try {
    // 检查 API Key
    if (!env.REMOVE_BG_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '服务器配置错误：缺少 API Key'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 解析表单数据
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    
    if (!imageFile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '请选择要处理的图片'
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 验证文件类型
    if (!imageFile.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '请上传有效的图片文件 (JPG 或 PNG)'
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 验证文件大小 (10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '图片大小不能超过 10MB'
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 准备 Remove.bg API 请求
    const removeBgFormData = new FormData();
    removeBgFormData.append('image_file', imageFile);
    removeBgFormData.append('size', 'auto');

    // 调用 Remove.bg API
    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': env.REMOVE_BG_API_KEY,
      },
      body: removeBgFormData,
    });

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text();
      console.error('Remove.bg API error:', errorText);
      
      let errorMessage = '背景移除服务暂时不可用，请稍后重试';
      
      if (removeBgResponse.status === 402) {
        errorMessage = 'API 额度已用完，请联系管理员';
      } else if (removeBgResponse.status === 429) {
        errorMessage = '请求过于频繁，请稍后再试';
      } else if (removeBgResponse.status === 400) {
        errorMessage = '图片格式不支持或无法识别主体';
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage
        }),
        { 
          status: removeBgResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // 获取处理后的图片
    const resultBuffer = await removeBgResponse.arrayBuffer();
    const resultBase64 = btoa(
      String.fromCharCode(...new Uint8Array(resultBuffer))
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          image: resultBase64
        }
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Error processing image:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: '处理图片时发生错误，请重试'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
};

// 处理 OPTIONS 请求 (CORS 预检)
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
};
