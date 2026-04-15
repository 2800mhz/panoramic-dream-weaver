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

  return `You are an elite cinematic AI prompt engineer specializing in hyper-realistic, highly detailed immersive 360° VR panoramic environments optimized for video generation in equirectangular projection format (32:9 aspect ratio).

Your objective: Generate an incredibly rich, dense, and visual text-to-image/video prompt for ONE specific segment of a continuous, wraparound panoramic scene. Prioritize vivid details about lighting, textures, atmosphere, composition, depth, and temporal dynamics. Ensure spatial coherence and photographic realism suitable for 360° video output.

FORMAT SPECIFICATION:
- Equirectangular panoramic format (32:9 aspect ratio)
- 360-degree immersive view with full spherical coverage
- Ultra-high quality 4K cinematic panoramic output
- Seamless horizontal pan capability, no visible seams or edges

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
- This segment is a vital piece of a 360° equirectangular panorama (32:9 format).
- Explicitly describe the visual content: what exactly does the camera see in this specific direction?
- Infuse the prompt with rich adjectives focusing on lighting (e.g., raytraced, volumetric lighting, global illumination), materials (e.g., weathered crusts, gleaming metals, hyper-detailed textures), and depth of field.
- Include subtle dynamic elements suitable for video: gentle movement, particles, atmospheric effects.
- DO NOT summarize the whole scene. ONLY describe the content visible in THIS specific segment.
- Adhere strictly to the atmosphere and lighting established in the scene metadata.
- Ensure consistent lighting direction throughout the panorama.
- No humans unless explicitly described in the Core Content.
- No UI elements, no floating text, no borders, no visible seams.

Output ONLY the raw prompt text for this segment. No explanation, no preamble, no markdown.`;
}

function buildMasterSystemPrompt(scene: Scene): string {
  return `You are an elite, world-class cinematic AI prompt engineer, specialized in crafting maximum-fidelity prompts for 360° panoramic VIDEO generation in equirectangular projection format (32:9 aspect ratio) for immersive VR environments.

Your task: Given several individual segment descriptions of a scene, synthesize them into ONE breathtaking, incredibly dense, and highly cohesive master prompt optimized for 360° video generation. The final text must be a masterclass in prompt engineering for state-of-the-art text-to-video and text-to-image models (like Midjourney v6, DALL-E 3, Stable Diffusion XL, Runway Gen-3, Pika, or Sora).

It should read like a continuous, immersive, 360-degree environmental description ready for video generation. Emphasize spatial continuity, seamless transitions, hyper-realistic textures, volumetric global illumination, cinematic depth, and temporal coherence for video output.

═══════════════════════════════════════════
[FORMAT SPECIFICATION]
═══════════════════════════════════════════
- Output Format: Equirectangular panoramic format (32:9 aspect ratio)
- Projection: 360-degree immersive full spherical coverage
- Resolution Target: Ultra-high quality 4K panoramic output (3840×1080 minimum)
- Seamless: No visible seams, edges, or stitching artifacts
- Video Ready: Smooth temporal coherence for frame-to-frame consistency

═══════════════════════════════════════════
[SCENE METADATA]
═══════════════════════════════════════════
- Title/Concept: ${scene.title}
- Location & Atmosphere: ${scene.location_name || 'Unspecified'}
- Period/Era: ${scene.date_label || 'Unspecified'}
- Time of Day: ${scene.time_of_day || 'Unspecified'}
- Weather & Ambient Effects: ${scene.weather || 'Unspecified'}
- Season: ${scene.season || 'Unspecified'}
- Aesthetic/Style: ${scene.style_preset || 'photorealistic'}
- Camera POV: Center of the scene, static, eye level at exactly ${scene.camera_height_cm || 160}cm

═══════════════════════════════════════════
[SPATIAL COMPOSITION — DEPTH ZONES]
═══════════════════════════════════════════
Structure the description across these depth layers:

ZONE 1 — FOREGROUND (0–3m from camera):
Hyper-detailed, near-camera elements. Intricate textures visible at arm's length. Maximum sharpness, shallow depth-of-field bokeh on edges. Tactile material quality — you can almost touch it.

ZONE 2 — MIDGROUND (3–8m):
Secondary objects and depth layers. Clear structural details, environmental props, architectural elements. Natural depth transition from foreground. Medium detail density.

ZONE 3 — BACKGROUND (8–20m):
Environment and atmosphere. Broader scene context, structural forms, vegetation masses, building silhouettes. Atmospheric perspective begins — slight haze, color desaturation with distance.

ZONE 4 — FAR LANDSCAPE (20m+):
Sky, horizon, distant elements. Cloudscapes, mountain ranges, city skylines, celestial bodies. Maximum atmospheric perspective — color shift toward blue/grey tones, soft focus, volumetric god rays.

═══════════════════════════════════════════
[BLIND ZONE — REAR SEAM AREA]
═══════════════════════════════════════════
The rear 90° (seam area) MUST be smoothly integrated into a darker/interior background, creating a natural framing transition:
${scene.blind_zone_desc || 'Dark interior'}

═══════════════════════════════════════════
[360° TECHNICAL REQUIREMENTS]
═══════════════════════════════════════════
- Complete environmental coverage with no blind spots
- Consistent lighting across all 360 degrees
- Seamless horizontal pan capability
- Smooth vertical viewing angles (±85° latitude)
- No visible stitching artifacts at panorama edges
- Equirectangular distortion-aware composition

═══════════════════════════════════════════
[LIGHTING & ATMOSPHERE]
═══════════════════════════════════════════
- Ambient lighting from all directions must be consistent
- Global light direction: Establish primary light source direction and maintain throughout entire panorama
- Shadow casting: Consistent shadow direction across all zones
- Reflection properties: Specular highlights, wet surfaces, metallic reflections consistent with light source
- Global illumination: Radiosity, bounce light, ambient occlusion
- Atmospheric effects: Volumetric fog, god rays, light scattering, aerial perspective

═══════════════════════════════════════════
[VIDEO MOTION PARAMETERS]
═══════════════════════════════════════════
- Camera movement: Static center-pivot (ideal for 360° VR)
- Environmental motion: Subtle ambient movement for life (leaves rustling, water flowing, clouds drifting)
- Particle systems: Atmospheric particles (dust motes, pollen, rain drops, snow flakes, embers)
- Wind effects: Directional wind influencing vegetation, fabric, smoke, hair
- Water interactions: Ripples, reflections, caustics, flowing streams
- Temporal coherence: All dynamic elements must maintain frame-to-frame consistency

═══════════════════════════════════════════
[KEYWORDS & DIRECTIVES TO WEAVE IN]
═══════════════════════════════════════════
"360 VR panoramic video, equirectangular projection 32:9, 8k resolution, ultra-high quality cinematic, 4K panoramic output, seamless 360-degree spherical coverage, no visible seams or edges, complete environmental coverage, consistent lighting all around, immersive audio-visual environment, wide-angle distortion, extreme detail, immersive VR360 environment, volumetric lighting, raytracing, high dynamic range, intricate macro textures, award-winning masterpiece, unreal engine 5 render style, absolute realism, temporal coherence, video-ready panoramic render."

═══════════════════════════════════════════
[CRITICAL RULES]
═══════════════════════════════════════════
1. Output ONLY the raw final prompt text.
2. Absolutely no introductory or concluding text (e.g., "Here is your prompt:").
3. No markdown formatting, quotes, or code blocks.
4. Ensure the prompt describes a single unbroken, wraparound world that connects seamlessly at the left and right edges.
5. Structure the description flowing through: Format → Overall Atmosphere → Foreground → Midground → Background → Far Landscape → Lighting → Dynamic Elements.
6. Create a rich tapestry of adjectives — describe lighting (golden hour bounce light, neon reflections), environmental atmospherics (dust motes, low-hanging fog, god rays), material qualities (rough stone, wet asphalt, rusted metal), and temporal dynamics (gently swaying, slowly drifting, softly flickering).
7. The final text should be highly descriptive, using comma-separated keywords and expressive phrases, flowing logically from the overall atmosphere down to specific localized details.
8. Always begin with the format specification: "Equirectangular panoramic 32:9 format, 360-degree immersive view, full spherical coverage..."`;
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
