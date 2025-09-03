
import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: Import gsap to resolve namespace error and enable type checking.
import gsap from 'gsap';
import type { StageElement, AnimationStep } from './types';
import { generateAnimationSteps } from './services/geminiService';
import { PlayIcon, PauseIcon, ReplayIcon, CopyIcon, PlusIcon, TrashIcon, WandIcon, BoxIcon, CircleIcon } from './components/icons';

// == Helper Functions ==
const formatCode = (steps: AnimationStep[]): string => {
  if (steps.length === 0) {
    return '// No animation steps generated.';
  }
  const header = `const tl = gsap.timeline({\n  // You can add default timeline options here\n});\n\n`;
  const timelineSteps = steps.map(step => {
    const varsString = JSON.stringify(step.vars, null, 2)
      .replace(/"([^"]+)":/g, '$1:') // remove quotes from keys
      .replace(/\n/g, '\n  '); // indent
    const positionString = step.position ? `, "${step.position}"` : '';
    return `tl.to("${step.target}", ${varsString}${positionString});`;
  }).join('\n');
  return header + timelineSteps;
};

// == Child Components defined outside App to prevent re-renders ==

interface StageProps {
  elements: StageElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  stageRef: React.RefObject<HTMLDivElement>;
}

const Stage: React.FC<StageProps> = ({ elements, selectedElementId, onSelectElement, stageRef }) => {
  return (
    <div ref={stageRef} className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700" onClick={() => onSelectElement(null)}>
      {elements.map(el => (
        <div
          key={el.id}
          id={el.id}
          className={`absolute cursor-pointer border-2 ${selectedElementId === el.id ? 'border-cyan-400' : 'border-transparent'} transition-all duration-200`}
          style={{
            left: `${el.x}px`,
            top: `${el.y}px`,
            width: `${el.width}px`,
            height: `${el.height}px`,
            backgroundColor: el.color,
            borderRadius: el.type === 'circle' ? '50%' : '0%',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectElement(el.id);
          }}
        />
      ))}
    </div>
  );
};


interface ElementManagerProps {
    elements: StageElement[];
    setElements: React.Dispatch<React.SetStateAction<StageElement[]>>;
    selectedElementId: string | null;
    setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
}

const ElementManager: React.FC<ElementManagerProps> = ({ elements, setElements, selectedElementId, setSelectedElementId }) => {
    
    const addElement = (type: 'box' | 'circle') => {
        const newId = `element-${Date.now()}`;
        const newElement: StageElement = {
            id: newId,
            type,
            color: type === 'box' ? '#3b82f6' : '#ec4899',
            x: 50,
            y: 50,
            width: 80,
            height: 80,
        };
        setElements(prev => [...prev, newElement]);
        setSelectedElementId(newId);
    };

    const removeElement = (id: string) => {
        setElements(prev => prev.filter(el => el.id !== id));
        if (selectedElementId === id) {
            setSelectedElementId(null);
        }
    };

    const updateElement = (id: string, newProps: Partial<StageElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...newProps } : el));
    };

    const selectedElement = elements.find(el => el.id === selectedElementId);

    return (
        <div className="bg-gray-800 p-4 rounded-lg flex flex-col space-y-4 h-full">
            <h2 className="text-xl font-bold text-cyan-400">Elements</h2>
            <div className="flex space-x-2">
                <button onClick={() => addElement('box')} className="flex-1 flex items-center justify-center p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors">
                    <BoxIcon className="w-5 h-5 mr-2" /> Box
                </button>
                <button onClick={() => addElement('circle')} className="flex-1 flex items-center justify-center p-2 bg-gray-700 hover:bg-pink-500 rounded-md transition-colors">
                   <CircleIcon className="w-5 h-5 mr-2" /> Circle
                </button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                {elements.map(el => (
                    <div key={el.id} 
                         className={`p-2 rounded-md cursor-pointer transition-all ${selectedElementId === el.id ? 'bg-cyan-500/20 ring-2 ring-cyan-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                         onClick={() => setSelectedElementId(el.id)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div style={{backgroundColor: el.color}} className="w-4 h-4 rounded-sm"/>
                                <span className="font-mono text-sm">{el.id}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeElement(el.id);}} className="text-gray-400 hover:text-red-500">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
             {selectedElement && (
                <div className="border-t border-gray-700 pt-4 space-y-3">
                    <h3 className="font-bold text-lg">Properties: <span className="font-mono text-cyan-400">{selectedElement.id}</span></h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>ID:</span><input type="text" value={selectedElement.id} onChange={(e) => updateElement(selectedElement.id, {id: e.target.value})} className="bg-gray-900 rounded p-1 font-mono"/>
                        <span>Color:</span><input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedElement.id, {color: e.target.value})} className="bg-gray-900 rounded p-1 w-full"/>
                        <span>X:</span><input type="number" value={selectedElement.x} onChange={(e) => updateElement(selectedElement.id, {x: parseInt(e.target.value)})} className="bg-gray-900 rounded p-1"/>
                        <span>Y:</span><input type="number" value={selectedElement.y} onChange={(e) => updateElement(selectedElement.id, {y: parseInt(e.target.value)})} className="bg-gray-900 rounded p-1"/>
                        <span>Width:</span><input type="number" value={selectedElement.width} onChange={(e) => updateElement(selectedElement.id, {width: parseInt(e.target.value)})} className="bg-gray-900 rounded p-1"/>
                        <span>Height:</span><input type="number" value={selectedElement.height} onChange={(e) => updateElement(selectedElement.id, {height: parseInt(e.target.value)})} className="bg-gray-900 rounded p-1"/>
                    </div>
                </div>
            )}
        </div>
    );
};


// == Main App Component ==

export default function App() {
  const [elements, setElements] = useState<StageElement[]>([
    { id: 'box-1', type: 'box', color: '#3b82f6', x: 50, y: 150, width: 100, height: 100 },
    { id: 'circle-1', type: 'circle', color: '#ec4899', x: 450, y: 150, width: 80, height: 80 },
  ]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('Make the blue box move to the right by 300px and rotate 360 degrees, then make the pink circle scale to 1.5 and fade out.');
  const [generatedCode, setGeneratedCode] = useState<string>('// Your generated GSAP code will appear here.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Kill timeline on unmount
  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
    };
  }, []);

  const generateAnimation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedCode('// Generating...');

    // Reset elements to initial positions before creating a new animation
    if(timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
    }
    elements.forEach(el => {
      // FIX: Use the imported gsap object instead of accessing it from the window object.
      gsap.set(`#${el.id}`, {
        x: 0, y: 0, rotation: 0, scale: 1, opacity: 1,
      });
    });


    try {
      const steps = await generateAnimationSteps(instruction, elements);
      const code = formatCode(steps);
      setGeneratedCode(code);

      // FIX: Use the imported gsap object instead of accessing it from the window object.
      const tl = gsap.timeline({
        onComplete: () => setIsPlaying(false),
        onStart: () => setIsPlaying(true),
      });

      steps.forEach(step => {
        tl.to(step.target, step.vars, step.position);
      });

      timelineRef.current = tl;
      
    } catch (err: any) {
      setError(err.message);
      setGeneratedCode(`// Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [instruction, elements]);

  const handlePlayPause = () => {
    if (!timelineRef.current) return;
    if (timelineRef.current.isPlaying()) {
      timelineRef.current.pause();
      setIsPlaying(false);
    } else {
       if (timelineRef.current.progress() === 1) {
            timelineRef.current.restart();
       } else {
            timelineRef.current.play();
       }
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    timelineRef.current?.restart();
    setIsPlaying(true);
  };
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col p-4 font-sans">
        <header className="flex items-center justify-between pb-4 border-b border-gray-700">
            <h1 className="text-2xl font-bold tracking-wider">GSAP AI Timeline Editor</h1>
            <a href="https://gsap.com" target="_blank" rel="noopener noreferrer" className="text-green-400 font-bold">Powered by GSAP & Gemini</a>
        </header>

        <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
            
            {/* Left Panel: Elements */}
            <div className="lg:col-span-3 h-[40vh] lg:h-auto">
               <ElementManager elements={elements} setElements={setElements} selectedElementId={selectedElementId} setSelectedElementId={setSelectedElementId}/>
            </div>

            {/* Center Panel: Stage & Controls */}
            <div className="lg:col-span-5 flex flex-col gap-4 h-[50vh] lg:h-auto">
              <Stage elements={elements} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} stageRef={stageRef} />
              <div className="bg-gray-800 p-3 rounded-lg flex items-center justify-center space-x-4">
                  <button onClick={handlePlayPause} className="p-2 rounded-full bg-gray-700 hover:bg-cyan-500 transition-colors" title={isPlaying ? 'Pause' : 'Play'}>
                      {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button onClick={handleRestart} className="p-2 rounded-full bg-gray-700 hover:bg-cyan-500 transition-colors" title="Restart">
                      <ReplayIcon />
                  </button>
              </div>
            </div>

            {/* Right Panel: Instructions & Code */}
            <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col gap-3 flex-grow">
                    <label htmlFor="instruction" className="text-xl font-bold text-cyan-400">Animation Instructions</label>
                    <textarea
                        id="instruction"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="e.g., Make the blue box move right and fade out"
                        className="w-full h-32 p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
                    />
                    <button
                        onClick={generateAnimation}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center p-3 font-bold bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                          <><WandIcon className="w-5 h-5 mr-2" /> Generate Animation</>
                      )}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col gap-3 flex-grow min-h-0">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-cyan-400">Generated Code</h2>
                        <button onClick={handleCopyCode} className="p-2 rounded-md bg-gray-700 hover:bg-cyan-500 transition-colors" title="Copy Code">
                            <CopyIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    <pre className="flex-grow bg-gray-900 p-3 rounded-md overflow-auto text-sm">
                        <code className="language-javascript whitespace-pre-wrap font-mono">{generatedCode}</code>
                    </pre>
                </div>
            </div>
        </div>
    </div>
  );
}