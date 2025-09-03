import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { StageElement, AnimationStep } from '../types';

let chat: Chat | null = null;

const initializeChat = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const systemInstruction = `You are an expert GSAP and web animation assistant. Your goal is to help users create animations by interpreting their natural language commands. You will control a scene with elements and a GSAP timeline. You MUST respond in a specific JSON format. Do not add any text outside the JSON object.

The user will provide a message and the current list of elements on the stage. Based on this, you will decide on an action.

**Possible Actions & JSON Responses:**

1.  **Create Elements**: If the user asks to add something (e.g., "add a red square", "put some text that says hello").
    - The \`response_type\` will be "element_creation".
    - The \`explanation\` will be a confirmation message, e.g., "Okay, I've added the new elements to the stage for you.".
    - The \`new_elements\` property will be an array of one or more \`StageElement\` objects to be added. Ensure new elements have a unique \`id\` (e.g., \`type-timestamp\`). Default size is 100x100. Default position is x:50, y:50.

2.  **Modify Elements**: If the user asks to change a property of an existing element (e.g., "make box-1 blue", "change the text").
    - The \`response_type\` will be "element_modification".
    - The \`explanation\` will be a confirmation, e.g., "I've updated the properties of the element(s).".
    - The \`modified_elements\` property will be an array of objects, each with an \`id\` and a \`props\` object containing the properties to change.

3.  **Generate Animation**: If the user describes a motion or animation (e.g., "make the circle spin", "move the box to the right").
    - The \`response_type\` will be "animation".
    - The \`explanation\` will be a message like "Here is the animation you described. Press play to see it!".
    - The \`animation_steps\` property will be an array of \`AnimationStep\` objects for the GSAP timeline.

4.  **Answer a Question / Clarify**: If the user asks a question or the request is unclear.
    - The \`response_type\` will be "clarification".
    - The \`explanation\` will be your answer or clarifying question.

**Element Schema (\`StageElement\`):**
\`id: string, type: 'box' | 'circle' | 'text' | 'image' | 'video', x: number, y: number, width: string (e.g. "100px", "50%"), height: string (e.g. "100px", "50%"), rotation: number, opacity: number, backgroundColor?: string, text?: string, color?: string, fontSize?: number, fontWeight?: string, src?: string, autoplay?: boolean, loop?: boolean, muted?: boolean\`

**Animation Schema (\`AnimationStep\`):**
\`target: string (CSS selector), vars: object, position?: string\`

**Rules:**
*   Always provide a friendly and helpful \`explanation\`.
*   When creating elements, assign a reasonable default size and position if not specified.
*   Element IDs are crucial. Refer to elements by their ID. If the user uses a vague description like "the box", use the ID of the most likely target.
*   Be creative but stick to the user's request.
*   The origin (0,0) is the top-left of the stage.`;
    
  chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                response_type: { type: Type.STRING },
                explanation: { type: Type.STRING },
                new_elements: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            type: { type: Type.STRING },
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                            width: { type: Type.STRING },
                            height: { type: Type.STRING },
                            rotation: { type: Type.NUMBER },
                            opacity: { type: Type.NUMBER },
                            backgroundColor: { type: Type.STRING },
                            text: { type: Type.STRING },
                            color: { type: Type.STRING },
                            fontSize: { type: Type.NUMBER },
                            fontWeight: { type: Type.STRING },
                            src: { type: Type.STRING },
                            autoplay: { type: Type.BOOLEAN },
                            loop: { type: Type.BOOLEAN },
                            muted: { type: Type.BOOLEAN },
                        }
                    }
                },
                modified_elements: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            props: {
                                type: Type.OBJECT,
                                properties: {
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    width: { type: Type.STRING },
                                    height: { type: Type.STRING },
                                    rotation: { type: Type.NUMBER },
                                    opacity: { type: Type.NUMBER },
                                    backgroundColor: { type: Type.STRING },
                                    text: { type: Type.STRING },
                                    color: { type: Type.STRING },
                                    fontSize: { type: Type.NUMBER },
                                    fontWeight: { type: Type.STRING },
                                    src: { type: Type.STRING },
                                    autoplay: { type: Type.BOOLEAN },
                                    loop: { type: Type.BOOLEAN },
                                    muted: { type: Type.BOOLEAN },
                                }
                            }
                        }
                    }
                },
                animation_steps: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            target: { type: Type.STRING },
                            vars: {
                                type: Type.OBJECT,
                                properties: {
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    rotation: { type: Type.NUMBER },
                                    scale: { type: Type.NUMBER },
                                    opacity: { type: Type.NUMBER },
                                    duration: { type: Type.NUMBER },
                                    backgroundColor: { type: Type.STRING },
                                    color: { type: Type.STRING },
                                }
                            },
                            position: { type: Type.STRING }
                        }
                    }
                },
            }
          }
      }
  });
}

export interface AIResponse {
    response_type: 'element_creation' | 'element_modification' | 'animation' | 'clarification' | 'error';
    explanation: string;
    new_elements?: StageElement[];
    modified_elements?: { id: string, props: Partial<StageElement> }[];
    animation_steps?: AnimationStep[];
    error_message?: string;
}


export const sendMessageToAI = async (message: string, elements: StageElement[]): Promise<AIResponse> => {
  if (!chat) {
    initializeChat();
  }
  
  if (!message.trim()) {
    throw new Error("Message cannot be empty.");
  }

  const prompt = `User message: "${message}"\n\nCurrent elements on stage:\n${JSON.stringify(elements, null, 2)}`;

  try {
    const response = await chat!.sendMessage({ message: prompt });
    const jsonText = response.text.trim();
    // A simple validation to ensure it's JSON before parsing
    if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
        throw new Error('AI did not return valid JSON.');
    }
    const parsedResponse = JSON.parse(jsonText);
    return parsedResponse as AIResponse;
  } catch (error) {
    console.error("Error communicating with AI:", error);
    // Let's try to gracefully inform the user.
    return {
        response_type: 'error',
        explanation: "Sorry, I encountered an error trying to process that. Maybe try phrasing it differently?",
        error_message: error instanceof Error ? error.message : "An unknown error occurred."
    };
  }
};