import { ZONE_NAMES, ZONE_DESCRIPTIONS, SLICE_DESCRIPTIONS } from '@/lib/constants';
import type { Scene, Segment } from '@/lib/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_GOOGLE_GEMINI_API_KEY environment variable. Please add it to your .env file.');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: {
        parts: {
          text: systemPrompt,
        },
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: userPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 1,
        topP: 0.95,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function buildSystemPrompt(scene: Scene, allSegments: Segment[], targetSegment: Segment): string {
  const segmentList = allSegments
    .filter(s => s.content_desc && s.status !== 'empty')
    .map(s => `Zone ${s.zone} Slice ${s.slice}: ${s.content_desc}`)
    .join('\n');

  return `You are a cinematic AI image prompt engineer specializing in 360° panoramic photography prompts for text-to-image models.

Generate a detailed, precise text-to-image prompt for ONE segment of a 32:9 panoramic scene.

SCENE CONTEXT:
- Location: ${scene.location_name || 'Unspecified'}
- Period/Date: ${scene.date_label || 'Unspecified'}
- Time of day: ${scene.time_of_day || 'Unspecified'}
- Weather: ${scene.weather || 'Unspecified'}
- Season: ${scene.season || 'Unspecified'}
- Style: ${scene.style_preset || 'photorealistic'}
- Camera height: ${scene.camera_height_cm || 160}cm from ground

ALL DEFINED SEGMENTS IN THIS SCENE:
${segmentList || 'None yet'}

BLIND ZONE (rear 90°, seam area — always rendered black/dark interior):
${scene.blind_zone_desc || 'Dark interior'}

TARGET SEGMENT:
- Zone: ${ZONE_NAMES[targetSegment.zone]} (${ZONE_DESCRIPTIONS[targetSegment.zone]})
- Slice: Dilim ${targetSegment.slice} (${SLICE_DESCRIPTIONS[targetSegment.slice]})
- Content: ${targetSegment.content_desc}
- Extra notes: ${targetSegment.extra_notes || 'None'}

IMPORTANT TECHNICAL CONSTRAINTS:
- This will be rendered as part of a 32:9 equirectangular panorama
- Left and right edges connect seamlessly — the blind zone covers this seam
- This segment occupies a 90° horizontal × ~67° vertical field of view within the panorama
- Maintain consistent lighting, atmosphere, and color palette with other segments
- No humans unless explicitly described
- Camera is static, eye level at ${scene.camera_height_cm || 160}cm

Output ONLY the prompt text. No explanation, no preamble, no markdown.`;
}

function buildMasterSystemPrompt(scene: Scene): string {
  return `You are a cinematic AI image prompt engineer. Given individual segment prompts for a 360° panoramic scene, synthesize them into ONE cohesive master prompt that describes the entire 32:9 equirectangular panorama as a single image.

SCENE: ${scene.title}
Location: ${scene.location_name || 'Unspecified'}
Period: ${scene.date_label || 'Unspecified'}
Time: ${scene.time_of_day || 'Unspecified'}
Weather: ${scene.weather || 'Unspecified'}
Season: ${scene.season || 'Unspecified'}
Style: ${scene.style_preset || 'photorealistic'}
Camera height: ${scene.camera_height_cm || 160}cm

Output ONLY the unified prompt text. No explanation.`;
}

export async function generateSegmentPrompt(scene: Scene, allSegments: Segment[], targetSegment: Segment): Promise<string> {
  const systemPrompt = buildSystemPrompt(scene, allSegments, targetSegment);
  const userPrompt = `Generate the image prompt for ${ZONE_NAMES[targetSegment.zone]} — Dilim ${targetSegment.slice}: ${targetSegment.content_desc}`;
  return callGemini(systemPrompt, userPrompt);
}

export async function generateMasterPrompt(scene: Scene, segments: Segment[]): Promise<string> {
  const promptedSegments = segments.filter(s => s.generated_prompt);
  const systemPrompt = buildMasterSystemPrompt(scene);
  const userPrompt = promptedSegments
    .map(s => `[${ZONE_NAMES[s.zone]} — Dilim ${s.slice}]\n${s.generated_prompt}`)
    .join('\n\n');
  return callGemini(systemPrompt, userPrompt);
}
