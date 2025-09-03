
import { GoogleGenAI, Type } from "@google/genai";
import type { StageElement, AnimationStep } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateAnimationSteps = async (instruction: string, elements: StageElement[]): Promise<AnimationStep[]> => {
  if (!instruction.trim()) {
    throw new Error("Instruction cannot be empty.");
  }
  if (elements.length === 0) {
    throw new Error("Please add at least one element to the stage.");
  }

  const formattedElements = elements.map(el => ({ id: el.id, type: el.type }));

  const prompt = `
    You are an expert GSAP 3 animation code generator. Your task is to translate a user's natural language instruction into a sequence of GSAP timeline animations.
    The user wants to animate elements on a stage.
    
    Available HTML elements on the stage:
    ${JSON.stringify(formattedElements)}

    User's animation instruction:
    "${instruction}"

    Based on the instruction, generate a valid JSON array of objects representing the GSAP timeline steps. Each object in the array must conform to the following schema.
    The 'target' property must be a valid CSS selector for an element from the list (e.g., '#element-id').
    The 'vars' object should contain GSAP animation properties (e.g., x, y, rotation, scale, opacity, duration, ease).
    The 'position' property is optional and specifies the position in the GSAP timeline (e.g., "+=0.5", "-=1", "<", ">").

    Examples of common properties:
    - Movement: x, y (for pixels, e.g., x: 100 moves 100px right)
    - Rotation: rotation (in degrees, e.g., rotation: 360 for a full spin)
    - Scaling: scale (e.g., scale: 1.5 makes it 50% larger)
    - Fading: opacity (e.g., opacity: 0 makes it invisible)
    - Duration: duration (in seconds, e.g., duration: 2)

    IMPORTANT: Do not include any explanations, comments, or any text outside of the JSON array. Your entire response must be only the JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        target: {
                            type: Type.STRING,
                            description: 'The CSS selector for the element to animate.'
                        },
                        vars: {
                            type: Type.OBJECT,
                            description: 'A GSAP vars object containing properties to animate.',
                            // FIX: Removed non-standard 'nullable' property. Properties are optional by default when not in a 'required' array.
                            properties: {
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER },
                                rotation: { type: Type.NUMBER },
                                scale: { type: Type.NUMBER },
                                opacity: { type: Type.NUMBER },
                                duration: { type: Type.NUMBER },
                                ease: { type: Type.STRING },
                            }
                        },
                        position: {
                            type: Type.STRING,
                            description: 'Optional. The position parameter for the GSAP timeline.',
                        }
                    },
                    required: ['target', 'vars']
                }
            }
        }
    });

    const jsonText = response.text.trim();
    const parsedResponse = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedResponse)) {
      throw new Error("AI response is not a valid array.");
    }
    
    return parsedResponse as AnimationStep[];

  } catch (error) {
    console.error("Error generating animation steps:", error);
    throw new Error("Failed to generate animation from AI. Please check the console for details.");
  }
};