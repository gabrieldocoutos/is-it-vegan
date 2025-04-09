import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Extract the MIME type from the data URL
    const mimeType = image.split(';')[0].split(':')[1];
    
    if (!SUPPORTED_FORMATS.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image format. Please use one of: ${SUPPORTED_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Remove the data URL prefix
    const base64Image = image.split(',')[1];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image and tell me if it's vegan. Consider ingredients, certifications, and any visible labels. Respond with a clear 'Yes' or 'No' followed by a brief explanation. If you are not able to read the image content please be clear about it and the only thing you should say it's to take the photo again. The answer should always be in brazilian portuguese"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    return NextResponse.json({ result: response.choices[0].message.content });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
} 