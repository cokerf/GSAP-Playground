import React, { useState, useRef, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import type { StageElement, AnimationStep, ChatMessage, ElementType } from './types';
import { sendMessageToAI, AIResponse } from './services/geminiService';
import { PlayIcon, PauseIcon, ReplayIcon, CopyIcon, TrashIcon, BoxIcon, CircleIcon, TextIcon, ImageIcon, VideoIcon, SendIcon, LaptopIcon, TabletIcon, PhoneIcon, SquareIcon } from './components/icons';

// == Helper Functions ==
const formatGSAPCode = (steps: AnimationStep[]): string => {
  if (!steps || steps.length === 0) {
    return '// No animation steps generated yet. Describe an animation in the chat!';
  }
  const header = `const tl = gsap.timeline();\n\n`;
  const timelineSteps = steps.map(step => {
    const varsString = JSON.stringify(step.vars, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/\n/g, '\n  ');
    const positionString = step.position ? `, "${step.position}"` : '';
    return `tl.to("${step.target}", ${varsString}${positionString});`;
  }).join('\n');
  return header + timelineSteps;
};

// == Child Components ==

const LeftPanel = ({ elements, setElements, selectedElementId, setSelectedElementId, canvasSettings, setCanvasSettings }) => (
    <div className="bg-gray-800/50 rounded-lg flex flex-col gap-4 p-4 overflow-y-auto">
        <CanvasSettings settings={canvasSettings} setSettings={setCanvasSettings} />
        <ElementManager elements={elements} setElements={setElements} selectedElementId={selectedElementId} setSelectedElementId={setSelectedElementId} />
    </div>
);

const CanvasSettings = ({ settings, setSettings }) => {
    const presets = {
        '16:9': { width: 1280, height: 720 }, '4:3': { width: 1024, height: 768 }, '1:1': { width: 800, height: 800 }, 'Mobile': { width: 375, height: 667 }
    };
    return (
        <div className="flex flex-col gap-3 p-3 bg-gray-900/50 rounded-md">
            <h3 className="font-bold text-cyan-400">Canvas</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Width:</span><input type="number" value={settings.width} onChange={(e) => setSettings(s => ({...s, width: parseInt(e.target.value)}))} className="bg-gray-800 rounded p-1 w-full"/>
                <span>Height:</span><input type="number" value={settings.height} onChange={(e) => setSettings(s => ({...s, height: parseInt(e.target.value)}))} className="bg-gray-800 rounded p-1 w-full"/>
                <span>Bg Color:</span><input type="color" value={settings.backgroundColor} onChange={(e) => setSettings(s => ({...s, backgroundColor: e.target.value}))} className="bg-transparent rounded p-0 w-full h-7"/>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setSettings(s => ({...s, ...presets['16:9']}))} className="p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors" title="16:9"><LaptopIcon/></button>
                <button onClick={() => setSettings(s => ({...s, ...presets['4:3']}))} className="p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors" title="4:3"><TabletIcon/></button>
                <button onClick={() => setSettings(s => ({...s, ...presets['1:1']}))} className="p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors" title="1:1"><SquareIcon/></button>
                <button onClick={() => setSettings(s => ({...s, ...presets['Mobile']}))} className="p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors" title="Mobile"><PhoneIcon/></button>
            </div>
        </div>
    );
};

const ElementManager = ({ elements, setElements, selectedElementId, setSelectedElementId }) => {
    const addElement = (type: ElementType) => {
        const newElement: StageElement = {
            id: `${type}-${Date.now()}`, type, x: 50, y: 50, width: '100px', height: '100px', rotation: 0, opacity: 1,
            ...(type === 'box' && { backgroundColor: '#3b82f6' }),
            ...(type === 'circle' && { backgroundColor: '#ec4899', width: '80px', height: '80px' }),
            ...(type === 'text' && { text: 'Hello World', color: '#1f2937', fontSize: 24, fontWeight: 'bold', width: 'auto', height: 'auto' }),
            ...(type === 'image' && { src: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=200', width: '150px', height: '150px' }),
            ...(type === 'video' && { src: 'https://assets.mixkit.co/videos/preview/mixkit-waving-flag-of-the-united-states-345-small.mp4', autoplay: true, loop: true, muted: true, width: '200px', height: '120px' }),
        };
        setElements(prev => [...prev, newElement]);
        setSelectedElementId(newElement.id);
    };

    const removeElement = (id: string) => {
        setElements(prev => prev.filter(el => el.id !== id));
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const updateElement = (id: string, newProps: Partial<StageElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...newProps } : el));
    };

    const selectedElement = elements.find(el => el.id === selectedElementId);

    return (
        <div className="flex flex-col gap-3 p-3 bg-gray-900/50 rounded-md flex-grow">
            <h3 className="font-bold text-cyan-400">Elements</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                <button onClick={() => addElement('box')} className="flex items-center justify-center p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors"><BoxIcon className="w-5 h-5 mr-1" /> Box</button>
                <button onClick={() => addElement('circle')} className="flex items-center justify-center p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors"><CircleIcon className="w-5 h-5 mr-1" /> Circ</button>
                <button onClick={() => addElement('text')} className="flex items-center justify-center p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors"><TextIcon className="w-5 h-5 mr-1" /> Text</button>
                <button onClick={() => addElement('image')} className="flex items-center justify-center p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors"><ImageIcon className="w-5 h-5 mr-1" /> Img</button>
                <button onClick={() => addElement('video')} className="flex items-center justify-center p-2 bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors"><VideoIcon className="w-5 h-5 mr-1" /> Vid</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-2 pr-2 min-h-[100px]">
                {elements.map(el => (
                    <div key={el.id} className={`p-2 rounded-md cursor-pointer transition-all text-xs ${selectedElementId === el.id ? 'bg-cyan-500/20 ring-2 ring-cyan-500' : 'bg-gray-700/50 hover:bg-gray-700'}`} onClick={() => setSelectedElementId(el.id)}>
                        <div className="flex items-center justify-between"><span className="font-mono">{el.id}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeElement(el.id);}} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
            {selectedElement && (
                <div className="border-t border-gray-700 pt-3 space-y-2 text-sm">
                    <h4 className="font-bold">Properties: <span className="font-mono text-cyan-400">{selectedElement.id}</span></h4>
                    <div className="grid grid-cols-2 gap-2">
                        <span>ID:</span><input type="text" value={selectedElement.id} onChange={(e) => updateElement(selectedElement.id, {id: e.target.value})} className="bg-gray-800 rounded p-1 font-mono w-full"/>
                        <span>Width:</span><input type="text" value={selectedElement.width} onChange={e => updateElement(selectedElement.id, {width: e.target.value})} className="bg-gray-800 rounded p-1 w-full"/>
                        <span>Height:</span><input type="text" value={selectedElement.height} onChange={e => updateElement(selectedElement.id, {height: e.target.value})} className="bg-gray-800 rounded p-1 w-full"/>
                        {selectedElement.type === 'text' && <>
                            <span>Text:</span><input type="text" value={selectedElement.text} onChange={e => updateElement(selectedElement.id, {text: e.target.value})} className="bg-gray-800 rounded p-1 w-full"/>
                            <span>Color:</span><input type="color" value={selectedElement.color} onChange={e => updateElement(selectedElement.id, {color: e.target.value})} className="bg-transparent rounded p-0 w-full h-7"/>
                            <span>Size:</span><input type="number" value={selectedElement.fontSize} onChange={e => updateElement(selectedElement.id, {fontSize: parseInt(e.target.value)})} className="bg-gray-800 rounded p-1 w-full"/>
                        </>}
                        {(selectedElement.type === 'image' || selectedElement.type === 'video') && <>
                            <span>Source:</span><input type="text" value={selectedElement.src} onChange={e => updateElement(selectedElement.id, {src: e.target.value})} className="bg-gray-800 rounded p-1 w-full"/>
                        </>}
                        {(selectedElement.type === 'box' || selectedElement.type === 'circle') && <>
                           <span>BG Color:</span><input type="color" value={selectedElement.backgroundColor} onChange={e => updateElement(selectedElement.id, {backgroundColor: e.target.value})} className="bg-transparent rounded p-0 w-full h-7"/>
                        </>}
                    </div>
                </div>
            )}
        </div>
    );
};

const Stage = ({ elements, selectedElementId, onSelectElement, settings }) => (
    <div className="w-full h-full bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 flex items-center justify-center p-4">
        <div 
            id="stage-parent"
            className="relative shadow-lg" 
            style={{ width: `${settings.width}px`, height: `${settings.height}px`, backgroundColor: settings.backgroundColor, transition: 'all 0.3s ease' }} 
            onClick={() => onSelectElement(null)}
        >
            {elements.map(el => {
                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${el.x}px`, top: `${el.y}px`, width: el.width, height: el.height,
                    opacity: el.opacity, transform: `rotate(${el.rotation}deg)`,
                    border: `2px solid ${selectedElementId === el.id ? '#22d3ee' : 'transparent'}`,
                    transition: 'border-color 0.2s', cursor: 'pointer',
                };
                switch(el.type) {
                    case 'box': return <div key={el.id} id={el.id} style={{...style, backgroundColor: el.backgroundColor}} onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }}/>
                    case 'circle': return <div key={el.id} id={el.id} style={{...style, backgroundColor: el.backgroundColor, borderRadius: '50%'}} onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }}/>
                    case 'text': return <div key={el.id} id={el.id} style={{...style, color: el.color, fontSize: `${el.fontSize}px`, fontWeight: el.fontWeight as any}} onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }}>{el.text}</div>
                    case 'image': return <img key={el.id} id={el.id} src={el.src} style={{...style, objectFit: 'cover'}} onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }} alt={el.id} />
                    case 'video': return <video key={el.id} id={el.id} src={el.src} style={{...style, objectFit: 'cover'}} autoPlay={el.autoplay} loop={el.loop} muted={el.muted} onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }}/>
                    default: return null;
                }
            })}
        </div>
    </div>
);


const RightPanel = ({ chatHistory, onSendMessage, isLoading, animationSteps, elements, canvasSettings }) => {
    const [activeTab, setActiveTab] = useState('chat');
    return (
        <div className="bg-gray-800/50 rounded-lg flex flex-col p-1">
            <div className="flex border-b border-gray-700">
                <button onClick={() => setActiveTab('chat')} className={`flex-1 p-3 font-bold ${activeTab === 'chat' ? 'bg-gray-800 text-cyan-400' : 'bg-transparent text-gray-400 hover:bg-gray-700/50'}`}>Chat</button>
                <button onClick={() => setActiveTab('export')} className={`flex-1 p-3 font-bold ${activeTab === 'export' ? 'bg-gray-800 text-cyan-400' : 'bg-transparent text-gray-400 hover:bg-gray-700/50'}`}>Export</button>
            </div>
            <div className="flex-grow p-3 min-h-0">
                {activeTab === 'chat' && <ChatInterface history={chatHistory} onSendMessage={onSendMessage} isLoading={isLoading} />}
                {activeTab === 'export' && <ExportPanel animationSteps={animationSteps} elements={elements} canvasSettings={canvasSettings} />}
            </div>
        </div>
    );
};

const ChatInterface = ({ history, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);
    
    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                {history.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-sm p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-600' : 'bg-gray-700'}`}>
                            <p className="text-sm">{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-700"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div></div></div>}

            </div>
            <div className="mt-4 flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="e.g., Make the blue box spin"
                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    disabled={isLoading}
                />
                <button onClick={handleSend} disabled={isLoading} className="p-2 bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-600"><SendIcon className="w-5 h-5 rotate-90"/></button>
            </div>
        </div>
    );
};

const ExportPanel = ({ animationSteps, elements, canvasSettings }) => {
    const [activeTab, setActiveTab] = useState('gsap');
    const [copied, setCopied] = useState(false);
    const gsapCode = formatGSAPCode(animationSteps);

    const generateExportCode = useCallback(() => {
        const elementHTML = elements.map(el => {
            const baseStyle = `position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}; height: ${el.height}; opacity: ${el.opacity}; transform: rotate(${el.rotation}deg);`;
            switch(el.type) {
                case 'box': return `    <div id="${el.id}" style="${baseStyle} background-color: ${el.backgroundColor};"></div>`;
                case 'circle': return `    <div id="${el.id}" style="${baseStyle} background-color: ${el.backgroundColor}; border-radius: 50%;"></div>`;
                case 'text': return `    <div id="${el.id}" style="${baseStyle} color: ${el.color}; font-size: ${el.fontSize}px; font-weight: ${el.fontWeight};">${el.text}</div>`;
                case 'image': return `    <img id="${el.id}" src="${el.src}" style="${baseStyle} object-fit: cover;" alt="${el.id}">`;
                case 'video': return `    <video id="${el.id}" src="${el.src}" style="${baseStyle} object-fit: cover;" ${el.autoplay ? 'autoplay' : ''} ${el.loop ? 'loop' : ''} ${el.muted ? 'muted' : ''}></video>`;
                default: return '';
            }
        }).join('\n');

        return `<!DOCTYPE html>
<html>
<head>
  <title>GSAP Animation</title>
  <style>
    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #111827; }
    #animation-container {
      position: relative;
      width: ${canvasSettings.width}px;
      height: ${canvasSettings.height}px;
      background-color: ${canvasSettings.backgroundColor};
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="animation-container">
${elementHTML}
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
${gsapCode.split('\n').map(line => '      ' + line).join('\n')}
    });
  </script>
</body>
</html>`;
    }, [elements, canvasSettings, gsapCode]);
    
    const exportCode = generateExportCode();
    const instructions = `1. In Webflow or Framer, add an "Embed" or "Custom Code" component to your page.
2. Set its dimensions to match your canvas (${canvasSettings.width}px x ${canvasSettings.height}px) or make it responsive as needed.
3. Copy the full code from the "HTML Export" tab.
4. Paste it into the embed component's code editor.
5. Publish your site. The animation should now be live!`;

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex border-b border-gray-600 text-sm">
                <button onClick={() => setActiveTab('gsap')} className={`px-4 py-2 ${activeTab === 'gsap' ? 'border-b-2 border-cyan-400 text-white' : 'text-gray-400'}`}>GSAP Code</button>
                <button onClick={() => setActiveTab('html')} className={`px-4 py-2 ${activeTab === 'html' ? 'border-b-2 border-cyan-400 text-white' : 'text-gray-400'}`}>HTML Export</button>
                <button onClick={() => setActiveTab('instructions')} className={`px-4 py-2 ${activeTab === 'instructions' ? 'border-b-2 border-cyan-400 text-white' : 'text-gray-400'}`}>Instructions</button>
            </div>
            <div className="relative flex-grow mt-2 min-h-0">
                <pre className="h-full bg-gray-900 p-3 rounded-md overflow-auto text-xs font-mono">
                    <code>
                        {activeTab === 'gsap' && gsapCode}
                        {activeTab === 'html' && exportCode}
                        {activeTab === 'instructions' && instructions}
                    </code>
                </pre>
                <button onClick={() => handleCopy(activeTab === 'gsap' ? gsapCode : activeTab === 'html' ? exportCode : instructions)} className="absolute top-2 right-2 p-2 rounded-md bg-gray-700 hover:bg-cyan-500 transition-colors" title="Copy Code">
                    <CopyIcon className="w-4 h-4"/>
                </button>
                {copied && <span className="absolute bottom-2 right-2 text-xs bg-green-500 text-white px-2 py-1 rounded">Copied!</span>}
            </div>
        </div>
    );
};


// == Main App Component ==

export default function App() {
  const [elements, setElements] = useState<StageElement[]>([
    { id: 'text-1', type: 'text', text: 'Animate Me!', color: '#111827', fontSize: 48, fontWeight: '700', x: 50, y: 180, width: 'auto', height: 'auto', rotation: 0, opacity: 1 },
    { id: 'image-1', type: 'image', src: 'https://images.unsplash.com/photo-1633423483307-ce26b641225a?w=400', x: 450, y: 125, width: '250px', height: '200px', rotation: 0, opacity: 1 },
  ]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
      { role: 'model', text: "Ready to animate? Just tell me what to do. Try something like: 'Make the image spin' or 'Add a blue circle'." }
  ]);
  const [canvasSettings, setCanvasSettings] = useState({ width: 800, height: 450, backgroundColor: '#ffffff' });

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { return () => { timelineRef.current?.kill(); }; }, []);
  
  const resetElementsToInitialState = useCallback(() => {
    if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
    }
    gsap.set(elements.map(e => `#${e.id}`), { clearProps: "all" });
  }, [elements]);

  const handleSendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', text: message }]);

    resetElementsToInitialState();

    const aiResponse: AIResponse = await sendMessageToAI(message, elements);

    if (aiResponse.explanation) {
         setChatHistory(prev => [...prev, { role: 'model', text: aiResponse.explanation }]);
    }

    if (aiResponse.response_type === 'element_creation' && aiResponse.new_elements) {
        setElements(prev => [...prev, ...aiResponse.new_elements!]);
    }

    if (aiResponse.response_type === 'element_modification' && aiResponse.modified_elements) {
        setElements(prev => prev.map(el => {
            const mod = aiResponse.modified_elements!.find(m => m.id === el.id);
            return mod ? { ...el, ...mod.props } : el;
        }));
    }

    if (aiResponse.response_type === 'animation' && aiResponse.animation_steps) {
        setAnimationSteps(aiResponse.animation_steps);
        const tl = gsap.timeline({ onComplete: () => setIsPlaying(false), onStart: () => setIsPlaying(true) });
        aiResponse.animation_steps.forEach(step => {
            tl.to(step.target, step.vars, step.position);
        });
        timelineRef.current = tl;
    } else {
        // If it's not an animation, clear previous steps
        setAnimationSteps([]);
    }

    setIsLoading(false);
  }, [elements, resetElementsToInitialState]);


  const handlePlayPause = () => {
    if (!timelineRef.current) return;
    if (isPlaying) {
      timelineRef.current.pause();
    } else {
       if (timelineRef.current.progress() === 1) timelineRef.current.restart();
       else timelineRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    timelineRef.current?.restart();
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col p-4 font-sans">
        <header className="flex items-center justify-between pb-4 border-b border-gray-700">
            <h1 className="text-2xl font-bold tracking-wider">GSAP Playground</h1>
        </header>

        <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 min-h-0">
            
            <div className="lg:col-span-3 h-[40vh] lg:h-auto min-h-0">
               <LeftPanel 
                elements={elements} setElements={setElements} 
                selectedElementId={selectedElementId} setSelectedElementId={setSelectedElementId}
                canvasSettings={canvasSettings} setCanvasSettings={setCanvasSettings}
               />
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4 h-[50vh] lg:h-auto min-h-0">
              <Stage elements={elements} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} settings={canvasSettings}/>
              <div className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-center space-x-4">
                  <button onClick={handlePlayPause} className="p-2 rounded-full bg-gray-700 hover:bg-cyan-500 transition-colors" title={isPlaying ? 'Pause' : 'Play'}>
                      {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button onClick={handleRestart} className="p-2 rounded-full bg-gray-700 hover:bg-cyan-500 transition-colors" title="Restart">
                      <ReplayIcon />
                  </button>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-4 h-[90vh] lg:h-auto min-h-0">
                <RightPanel 
                    chatHistory={chatHistory} 
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    animationSteps={animationSteps}
                    elements={elements}
                    canvasSettings={canvasSettings}
                />
            </div>
        </div>
    </div>
  );
}