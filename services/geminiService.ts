import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { StageElement, AnimationStep } from '../types';

let chat: Chat | null = null;

const initializeChat = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const systemInstruction = `You are GSAP-GPT, a world-class expert in the GreenSock Animation Platform (GSAP). Your purpose is to translate natural language into high-quality GSAP animations and element manipulations. You operate within a web-based playground and MUST respond ONLY with a specific JSON format. Do not add any text, markdown, or commentary outside the JSON object.

**Core Context & Rules:**
*   **Context Awareness:** You will be provided with the \`selected_element_id\`. If the user's request is ambiguous (e.g., "make it spin", "move it"), YOU MUST assume they are referring to this selected element. Use its ID as the target. If no element is selected, ask for clarification.
*   **Conversational Timeline Building:** You will be provided with the \`current_timeline\`. Your primary goal is to ADD animation steps to this existing timeline, not replace it. For example, if the current timeline has a "move" step, and the user says "then make it spin", you should generate ONLY the new "spin" step.
*   **GSAP Knowledge:** You can animate CSS properties. Common ones are \`x\` (translateX), \`y\` (translateY), \`rotation\` (rotate), \`scale\`, \`opacity\`, \`width\`, \`height\`, \`backgroundColor\`. You understand relative values (\`"+=100"\`), easing (\`"bounce.out"\`), duration, and staggering (\`{ each: 0.2 }\`).
*   **Targeting:** For targets, use the element ID selector (e.g., "#box-12345") for single elements, or a class selector for multiple elements of the same type (e.g., ".box", ".circle").
*   **Advanced Plugins:**
    *   **TextPlugin**: For typewriter effects, use the \`text\` property in \`vars\`. Example: \`{ text: { value: "The new text" }, duration: 2, ease: "none" }\`.
    *   **ScrollTrigger**: To make animations happen on scroll, add a \`scrollTrigger\` object to \`vars\`. You MUST include the target element as the trigger. Example: \`{ scrollTrigger: { trigger: "#box-12345", start: "top 80%", toggleActions: "play none none none" } }\`.

**Possible Actions & JSON Responses:**

1.  **Create Elements**: User asks to add something ("add a red square").
    -   \`response_type\`: "element_creation"
    -   \`explanation\`: Confirmation message (e.g., "Okay, I've added a new box.").
    -   \`new_elements\`: Array of one or more \`StageElement\` objects. Default size 100x100, position x:50, y:50. For image/video, create a placeholder without a 'src'.

2.  **Modify Elements**: User asks to change a static property ("make box-1 blue"). This is for non-animation changes.
    -   \`response_type\`: "element_modification"
    -   \`explanation\`: Confirmation (e.g., "I've updated the box's color.").
    -   \`modified_elements\`: Array of objects, each with an \`id\` and a \`props\` object of properties to change.

3.  **Generate/Add to Animation**: User describes a motion ("make the circle spin").
    -   \`response_type\`: "animation"
    -   \`explanation\`: Confirmation ("Here is the animation you described.").
    -   \`animation_steps\`: An array containing ONLY THE NEW steps to be added to the timeline.

4.  **Answer a Question / Clarify**: Request is unclear or is a question.
    -   \`response_type\`: "clarification"
    -   \`explanation\`: Your answer or clarifying question.

**Crucial Final Instruction:**
Your responses must be flawless JSON, adhering strictly to the schema. Do not add any commentary. Your goal is to be a silent, efficient code generator.`;
    
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
                                description: "An object containing the element properties to change. Keys should match the StageElement schema.",
                                properties: {
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    width: { type: Type.STRING },
                                    height: { type: Type.STRING },
                                    rotation: { type: Type.NUMBER },
                                    opacity: { type: Type.NUMBER },
                                    backgroundColor: { type: Type.STRING },
                                    color: { type: Type.STRING },
                                    text: { type: Type.STRING },
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
                                description: "A GSAP vars object. Can include properties like x, y, scale, rotation, opacity, duration, ease, stagger, backgroundColor, etc. Values for x and y can be numbers or strings for relative values (e.g., '+=100'). Ease should be a GSAP ease string.",
                                properties: {
                                    x: { type: Type.STRING },
                                    y: { type: Type.STRING },
                                    width: { type: Type.STRING },
                                    height: { type: Type.STRING },
                                    rotation: { type: Type.STRING },
                                    scale: { type: Type.NUMBER },
                                    opacity: { type: Type.NUMBER },
                                    backgroundColor: { type: Type.STRING },
                                    color: { type: Type.STRING },
                                    fontSize: { type: Type.STRING },
                                    duration: { type: Type.NUMBER },
                                    delay: { type: Type.NUMBER },
                                    ease: { type: Type.STRING },
                                    text: { 
                                        type: Type.OBJECT,
                                        properties: {
                                            value: { type: Type.STRING }
                                        }
                                    },
                                    stagger: {
                                        type: Type.OBJECT,
                                        properties: {
                                            each: { type: Type.NUMBER },
                                            from: { type: Type.STRING }
                                        }
                                    },
                                    scrollTrigger: {
                                        type: Type.OBJECT,
                                        properties: {
                                            trigger: { type: Type.STRING },
                                            start: { type: Type.STRING },
                                            end: { type: Type.STRING },
                                            scrub: { type: Type.BOOLEAN },
                                            toggleActions: { type: Type.STRING },
                                        }
                                    }
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


export const sendMessageToAI = async (message: string, elements: StageElement[], selectedElementId: string | null, animationSteps: AnimationStep[]): Promise<AIResponse> => {
  if (!chat) {
    initializeChat();
  }
  
  if (!message.trim()) {
    throw new Error("Message cannot be empty.");
  }
  
  const sanitizedElements = elements.map(el => {
    if (el.src && el.src.startsWith('data:')) {
        return { ...el, src: 'data:...' };
    }
    return el;
  });

  const prompt = `User message: "${message}"\n\nContext:\n- Current elements on stage: ${JSON.stringify(sanitizedElements, null, 2)}\n- Selected element ID: ${selectedElementId ? `"${selectedElementId}"` : "null"}\n- Current timeline steps: ${JSON.stringify(animationSteps, null, 2)}`;

  try {
    const response = await chat!.sendMessage({ message: prompt });
    const jsonText = response.text.trim();
    if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
        const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            const extractedJson = jsonMatch[1].trim();
            const parsedResponse = JSON.parse(extractedJson);
            return parsedResponse as AIResponse;
        }
        throw new Error('AI did not return valid JSON.');
    }
    const parsedResponse = JSON.parse(jsonText);
    return parsedResponse as AIResponse;
  } catch (error) {
    console.error("Error communicating with AI:", error);
    return {
        response_type: 'error',
        explanation: "Sorry, I encountered an error trying to process that. The AI's response might have been malformed. Please try phrasing your request differently.",
        error_message: error instanceof Error ? error.message : "An unknown error occurred."
    };
  }
};