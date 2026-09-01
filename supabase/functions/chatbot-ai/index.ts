// Supabase Edge Function: chatbot-ai
// Nhận { prompt, systemInstruction } từ client, gọi Gemini bằng GEMINI_API_KEY
// (secret server-side, không lộ ra client). Trả về { text }.

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, systemInstruction } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Thiếu hoặc sai định dạng "prompt".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      // Secret chưa set trên server -> báo lỗi rõ ràng, không throw mù
      return new Response(
        JSON.stringify({ error: 'Server chưa cấu hình GEMINI_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction || 'Bạn là trợ lý AI hữu ích.' }] },
    };

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text().catch(() => '');
      console.error(`Gemini API lỗi (status ${geminiRes.status}):`, errBody);
      return new Response(
        JSON.stringify({ error: `Gemini API lỗi ${geminiRes.status}: ${errBody || 'Kiểm tra API key hoặc tên model.'}` }),
        { status: geminiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi từ AI.';

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('chatbot-ai lỗi không mong đợi:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Lỗi server không xác định.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
