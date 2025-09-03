
export interface StageElement {
  id: string;
  type: 'box' | 'circle';
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationStep {
  target: string;
  vars: { [key: string]: any };
  position?: string;
}
