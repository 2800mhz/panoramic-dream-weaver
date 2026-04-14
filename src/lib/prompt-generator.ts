import { ZONE_NAMES, ZONE_DESCRIPTIONS, SLICE_DESCRIPTIONS } from '@/lib/constants';
import type { Scene, Segment } from '@/lib/types';

import { Groq } from 'groq-sdk';

const GROQ_API_KEY = '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';
const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 1,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: true,
    stop: null
  });

  let fullContent = '';
  for await (const chunk of chatCompletion) {
    fullContent += chunk.choices[0]?.delta?.content || '';
  }

  return fullContent.trim();
}

function buildSystemPrompt(scene: Scene, allSegments: Segment[], targetSegment: Segment): string {
  const segmentList = allSegments
    .filter(s => s.content_desc && s.status !== 'empty')
    .map(s => `${ZONE_NAMES[s.zone]} — Dilim ${s.slice}: ${s.content_desc}`)
    .join('\n');

  return `You are an elite cinematic AI image prompt engineer specializing in hyper-realistic, highly detailed immersive 360° VR panoramic environments.

Your objective: Generate an incredibly rich, dense, and visual text-to-image prompt for ONE specific segment of a continuous, wraparound panoramic scene. Prioritize vivid details about lighting, textures, atmosphere, composition, and mood. Ensure spatial coherence and photographic realism.

SCENE METADATA:
- Location/Biome: ${scene.location_name || 'Unspecified'}
- Period/Era: ${scene.date_label || 'Unspecified'}
- Time of Day: ${scene.time_of_day || 'Unspecified'}
- Weather: ${scene.weather || 'Unspecified'}
- Season: ${scene.season || 'Unspecified'}
- Style: ${scene.style_preset || 'photorealistic'}
- Camera POV: Center pivot, eye level at ${scene.camera_height_cm || 160}cm from ground

CONTEXT OF THE ENTIRE 360 ENVIRONMENT (All Segments):
${segmentList || 'None yet'}

BLIND ZONE (rear 90°, seam area — dark/interior):
${scene.blind_zone_desc || 'Dark interior'}

TARGET SEGMENT YOU ARE WRITING FOR:
- Zone: ${ZONE_NAMES[targetSegment.zone]} (${ZONE_DESCRIPTIONS[targetSegment.zone]})
- Slice/Sector: Dilim ${targetSegment.slice} (${SLICE_DESCRIPTIONS[targetSegment.slice]})
- Core Content: ${targetSegment.content_desc}
- Extra Director's Notes: ${targetSegment.extra_notes || 'None'}

IMPORTANT TECHNICAL CONSTRAINTS:
- This segment is a vital piece of a 360° equirectangular panorama.
- Explicitly describe the visual content: what exactly does the camera see in this specific direction?
- Infuse the prompt with rich adjectives focusing on lighting (e.g., raytraced, volumetric lighting, global illumination), materials (e.g., weathered crusts, gleaming metals, hyper-detailed textures), and depth of field.
- DO NOT summarize the whole scene. ONLY describe the content visible in THIS specific segment.
- Adhere strictly to the atmosphere and lighting established in the scene metadata.
- No humans unless explicitly described in the Core Content.
- No UI elements, no floating text, no borders.

Output ONLY the raw prompt text for this segment. No explanation, no preamble, no markdown.`;
}

function buildMasterSystemPrompt(scene: Scene): string {
  return `You are an elite, world-class cinematic AI image prompt engineer, specialized in crafting highly detailed, maximum-fidelity prompts for 360° VR panoramic images (equirectangular projection for immersive VR environments).

Your task: Given several individual segment descriptions of a scene, synthesize them into ONE breathtaking, incredibly dense, and highly cohesive master prompt. The final text must be a masterclass in prompt engineering for state-of-the-art text-to-image models (like Midjourney v6, DALL-E 3, or Stable Diffusion XL).

It should read like a continuous, immersive, 360-degree environmental description. Emphasize spatial continuity, seamless transitions across the panorama, hyper-realistic textures, volumetric global illumination, and cinematic depth.

SCENE METADATA:
- Title/Concept: ${scene.title}
- Location & Atmosphere: ${scene.location_name || 'Unspecified'}
- Period/Era: ${scene.date_label || 'Unspecified'}
- Time of Day: ${scene.time_of_day || 'Unspecified'}
- Weather & Ambient Effects: ${scene.weather || 'Unspecified'}
- Season: ${scene.season || 'Unspecified'}
- Aesthetic/Style: ${scene.style_preset || 'photorealistic'}
- Camera POV: Center of the scene, static, eye level at exactly ${scene.camera_height_cm || 160}cm

BLIND ZONE (rear 90°, the seam area of the panorama — it MUST be smoothly integrated into the darker/interior background, creating a natural framing transition):
${scene.blind_zone_desc || 'Dark interior'}

KEYWORDS & DIRECTIVES TO WEAVE IN:
"360 VR, 8k resolution, equirectangular projection, wide-angle distortion, seamless panorama, extreme detail, immersive VR360 environment, volumetric lighting, raytracing, high dynamic range, intricate macro textures, award-winning masterpiece, unreal engine 5 render style, absolute realism."

CRITICAL RULES:
1. Output ONLY the raw final prompt text. 
2. Absolutely no introductory or concluding text (e.g., "Here is your prompt:"). 
3. No markdown formatting, quotes, or code blocks.
4. Ensure the prompt describes a single unbroken, wraparound world that connects seamlessly at the left and right edges.
5. Create a rich tapestry of adjectives—describe the lighting (e.g., golden hour bounce light, neon reflections), environmental atmospherics (dust motes, low-hanging fog, god rays), and material qualities (rough stone, wet asphalt, rusted metal) dynamically.
6. The final text should be highly descriptive, using comma-separated keywords and expressive phrases, flowing logically from the overall atmosphere down to specific localized details.`;
}

export async function generateSegmentPrompt(scene: Scene, allSegments: Segment[], targetSegment: Segment): Promise<string> {
  const systemPrompt = buildSystemPrompt(scene, allSegments, targetSegment);
  const userPrompt = `Generate the image prompt for ${ZONE_NAMES[targetSegment.zone]} — Dilim ${targetSegment.slice}: ${targetSegment.content_desc}`;
  return callGroq(systemPrompt, userPrompt);
}

export async function generateMasterPrompt(scene: Scene, segments: Segment[]): Promise<string> {
  const promptedSegments = segments.filter(s => s.generated_prompt);
  const systemPrompt = buildMasterSystemPrompt(scene);
  const userPrompt = promptedSegments
    .map(s => `[${ZONE_NAMES[s.zone]} — Dilim ${s.slice}]\n${s.generated_prompt}`)
    .join('\n\n');
  return callGroq(systemPrompt, userPrompt);
}
