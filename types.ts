export type ElementType = 'box' | 'circle' | 'text' | 'image' | 'video';

export interface StageElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: string;
  height: string;
  rotation: number;
  opacity: number;
  // Generic props
  backgroundColor?: string;
  color?: string;
  // Text props
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  // Image/Video props
  src?: string;
  // Video specific
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}


export interface AnimationStep {
  target: string;
  vars: { [key: string]: any };
  position?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}