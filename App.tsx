import React, { useState, useRef, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import { Draggable } from "gsap/Draggable";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import type { StageElement, AnimationStep, ChatMessage, ElementType } from './types';
import { sendMessageToAI, AIResponse } from './services/geminiService';
import { PlayIcon, PauseIcon, ReplayIcon, CopyIcon, TrashIcon, BoxIcon, CircleIcon, TextIcon, ImageIcon, VideoIcon, SendIcon, LaptopIcon, TabletIcon, PhoneIcon, SquareIcon, SunIcon, MoonIcon, ChevronLeftIcon, ChevronRightIcon, PhotoIcon, VideoCameraIcon, SettingsIcon, ChatBubbleIcon, CodeBracketIcon, ClearIcon, DragHandleIcon, WandIcon } from './components/icons';

gsap.registerPlugin(Draggable, ScrollTrigger, TextPlugin);

// == Helper Functions ==
const formatGSAPCode = (steps: AnimationStep[]): string => {
  if (!steps || steps.length === 0) return '// No animation steps generated yet.';

  const hasScrollTrigger = steps.some(step => step.vars.scrollTrigger);
  const hasTextPlugin = steps.some(step => step.vars.text);

  let header = '';
  if (hasScrollTrigger || hasTextPlugin) {
    header += `gsap.registerPlugin(${[hasScrollTrigger && "ScrollTrigger", hasTextPlugin && "TextPlugin"].filter(Boolean).join(', ')});\n\n`;
  }
  
  const timelineSteps = steps.filter(step => !step.vars.scrollTrigger).map(step => {
    let varsString = JSON.stringify(step.vars, null, 2).replace(/"([^"]+)":/g, '$1:');
    const positionString = step.position ? `, "${step.position}"` : '';
    return `tl.to("${step.target}", ${varsString}${positionString});`;
  }).join('\n');

  const scrollTriggerSteps = steps.filter(step => step.vars.scrollTrigger).map(step => {
    let varsString = JSON.stringify(step.vars, null, 2).replace(/"([^"]+)":/g, '$1:');
    return `gsap.to("${step.target}", ${varsString});`;
  }).join('\n\n');

  let code = '';
  if(timelineSteps) {
    code += `const tl = gsap.timeline();\n${timelineSteps}\n\n`;
  }
  if(scrollTriggerSteps) {
    code += scrollTriggerSteps;
  }
  
  return header + code;
};

// == Child Components ==

const LeftPanel = ({ isCollapsed, elements, setElements, selectedElementId, setSelectedElementId, canvasSettings, setCanvasSettings, onIdChange, onApplyPreset, isScrollPreview, onScrollPreviewToggle }) => (
    <div className={`bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg flex flex-col gap-4 overflow-y-auto transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16 p-2' : 'w-80 p-4'}`}>
        {isCollapsed ? (
            <div className="flex flex-col items-center gap-4">
                <div className="p-2 rounded-md bg-gray-200 dark:bg-gray-700"><SettingsIcon className="w-6 h-6"/></div>
                <div className="p-2 rounded-md bg-gray-200 dark:bg-gray-700"><BoxIcon className="w-6 h-6"/></div>
                 <div className="p-2 rounded-md bg-gray-200 dark:bg-gray-700"><WandIcon className="w-6 h-6"/></div>
            </div>
        ) : (
            <>
                <CanvasSettings settings={canvasSettings} setSettings={setCanvasSettings} />
                <ElementManager elements={elements} setElements={setElements} selectedElementId={selectedElementId} setSelectedElementId={setSelectedElementId} onIdChange={onIdChange} />
                <PresetsPanel selectedElement={elements.find(e => e.id === selectedElementId)} onApplyPreset={onApplyPreset} isScrollPreview={isScrollPreview} onScrollPreviewToggle={onScrollPreviewToggle} />
            </>
        )}
    </div>
);

const CanvasSettings = ({ settings, setSettings }) => {
    const presets = {
        '16:9': { width: 1920, height: 1080 }, '4:3': { width: 1024, height: 768 }, '1:1': { width: 1080, height: 1080 }, 'Mobile': { width: 430, height: 932 }
    };
    return (
        <div className="flex flex-col gap-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-md">
            <h3 className="font-bold text-black dark:text-white">Canvas</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <span className="self-center">Width:</span><input type="number" value={settings.width} onChange={(e) => setSettings(s => ({...s, width: parseInt(e.target.value)}))} className="bg-gray-200 dark:bg-gray-800 rounded p-1 w-full"/>
                <span className="self-center">Height:</span><input type="number" value={settings.height} onChange={(e) => setSettings(s => ({...s, height: parseInt(e.target.value)}))} className="bg-gray-200 dark:bg-gray-800 rounded p-1 w-full"/>
                <span className="self-center">Bg Color:</span><input type="color" value={settings.backgroundColor} onChange={(e) => setSettings(s => ({...s, backgroundColor: e.target.value}))} className="bg-transparent rounded p-0 w-full h-7"/>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
                {(Object.keys(presets) as (keyof typeof presets)[]).map(key => {
                    const Icon = {'16:9': LaptopIcon, '4:3': TabletIcon, '1:1': SquareIcon, 'Mobile': PhoneIcon}[key];
                    return <button key={key} onClick={() => setSettings(s => ({...s, ...presets[key]}))} className="p-2 flex justify-center bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors" title={key}><Icon/></button>
                })}
            </div>
        </div>
    );
};

const ElementManager = ({ elements, setElements, selectedElementId, setSelectedElementId, onIdChange }) => {
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const addElement = (type: ElementType) => {
        const newElement: StageElement = {
            id: `${type}-${Date.now()}`, type, x: 50, y: 50, width: '100px', height: '100px', rotation: 0, opacity: 1,
            ...(type === 'box' && { backgroundColor: '#3b82f6' }),
            ...(type === 'circle' && { backgroundColor: '#ec4899', width: '80px', height: '80px' }),
            ...(type === 'text' && { text: 'Hello', color: '#1f2937', fontSize: 24, fontWeight: 'bold', width: 'auto', height: 'auto', backgroundColor: 'transparent' }),
            ...(type === 'image' && { src: '', width: '150px', height: '150px', backgroundColor: '#4b5563', color: '#e5e7eb' }),
            ...(type === 'video' && { src: '', autoplay: true, loop: true, muted: true, width: '200px', height: '120px', backgroundColor: '#4b5563', color: '#e5e7eb' }),
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

    const handleSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const newElements = [...elements];
        const draggedItemContent = newElements.splice(dragItem.current, 1)[0];
        newElements.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setElements(newElements);
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && selectedElementId) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const base64 = loadEvent.target?.result as string;
                updateElement(selectedElementId, { src: base64 });
            };
            reader.readAsDataURL(file);
        }
    };

    const selectedElement = elements.find(el => el.id === selectedElementId);

    return (
        <div className="flex flex-col gap-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-md flex-grow">
            <h3 className="font-bold text-black dark:text-white">Elements</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                <button onClick={() => addElement('box')} className="flex items-center justify-center p-2 bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors"><BoxIcon className="w-5 h-5 mr-1" /> Box</button>
                <button onClick={() => addElement('circle')} className="flex items-center justify-center p-2 bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors"><CircleIcon className="w-5 h-5 mr-1" /> Circ</button>
                <button onClick={() => addElement('text')} className="flex items-center justify-center p-2 bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors"><TextIcon className="w-5 h-5 mr-1" /> Text</button>
                <button onClick={() => addElement('image')} className="flex items-center justify-center p-2 bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors"><ImageIcon className="w-5 h-5 mr-1" /> Img</button>
                <button onClick={() => addElement('video')} className="flex items-center justify-center p-2 bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors"><VideoIcon className="w-5 h-5 mr-1" /> Vid</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-2 pr-2 min-h-[100px]">
                {elements.map((el, index) => (
                    <div 
                        key={el.id} 
                        draggable 
                        onDragStart={() => dragItem.current = index}
                        onDragEnter={() => dragOverItem.current = index}
                        onDragEnd={handleSort}
                        onDragOver={(e) => e.preventDefault()}
                        className={`p-2 rounded-md transition-all text-xs flex items-center justify-between ${selectedElementId === el.id ? 'bg-black/20 dark:bg-white/20 ring-2 ring-black dark:ring-white' : 'bg-gray-300/50 dark:bg-gray-700/50 hover:dark:bg-gray-700 hover:bg-gray-400/50'}`} 
                        onClick={() => setSelectedElementId(el.id)}
                    >
                        <div className="flex items-center gap-2">
                           <span className="cursor-grab text-gray-500 dark:text-gray-400"><DragHandleIcon /></span>
                           <span className="font-mono">{el.id}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeElement(el.id);}} className="text-gray-500 dark:text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
            {selectedElement && (
                <div className="border-t border-gray-300 dark:border-gray-700 pt-3 space-y-2 text-sm">
                    <h4 className="font-bold">Properties: <span className="font-mono text-black/60 dark:text-white/60">{selectedElement.id}</span></h4>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <span className="self-center">ID:</span><input type="text" value={selectedElement.id} onChange={e => onIdChange(selectedElement.id, e.target.value)} className="font-mono bg-gray-200 dark:bg-gray-800 rounded p-1 w-full"/>
                        <span className="self-center">X:</span><input type="number" value={selectedElement.x} onChange={e => updateElement(selectedElement.id, {x: parseInt(e.target.value)})} className="bg-gray-200 dark:bg-gray-800 rounded p-1 w-full"/>
                        <span className="self-center">Y:</span><input type="number" value={selectedElement.y} onChange={e => updateElement(selectedElement.id, {y: parseInt(e.target.value)})} className="bg-gray-200 dark:bg-gray-800 rounded p-1 w-full"/>
                        <span className="self-center">Width:</span><input type="text" value={selectedElement.width} onChange={e => updateElement(selectedElement.id, {width: e.target.value})} className="bg-gray-200 dark:bg-gray-800 rounded p-1 w-full"/>
                        <span className="self-center">Height:</span><input type="text" value={selectedElement.height} onChange={e => updateElement(selectedElement.id, {height: e.target.value})} className="bg-gray-200 dark:bg-gray-800 rounded p-1 w-full"/>
                        {selectedElement.type === 'text' && <>
                            <span className="col-span-2">Text:</span><textarea value={selectedElement.text} onChange={e => updateElement(selectedElement.id, {text: e.target.value})} className="col-span-2 bg-gray-200 dark:bg-gray-800 rounded p-1 w-full text-xs"/>
                            <span className="self-center">Color:</span><input type="color" value={selectedElement.color} onChange={e => updateElement(selectedElement.id, {color: e.target.value})} className="bg-transparent rounded p-0 w-full h-7"/>
                            <span className="self-center">Size:</span><input type="number" value={selectedElement.fontSize} onChange={e => updateElement(selectedElement.id, {fontSize: parseInt(e.target.value)})} className="bg-gray-200 dark:bg-gray-800 rounded p-1 w-full"/>
                        </>}
                        {(selectedElement.type === 'image' || selectedElement.type === 'video') && !selectedElement.src && <>
                           <span className="self-center">Frame:</span><input type="color" value={selectedElement.backgroundColor} onChange={e => updateElement(selectedElement.id, {backgroundColor: e.target.value})} className="bg-transparent rounded p-0 w-full h-7"/>
                           <span className="self-center">Icon:</span><input type="color" value={selectedElement.color} onChange={e => updateElement(selectedElement.id, {color: e.target.value})} className="bg-transparent rounded p-0 w-full h-7"/>
                        </>}
                        {(selectedElement.type === 'image' || selectedElement.type === 'video') && <>
                            <input type="file" ref={uploadInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden"/>
                            <button onClick={() => uploadInputRef.current?.click()} className="col-span-2 text-center p-2 bg-black text-white dark:bg-white dark:text-black hover:opacity-80 rounded-md transition-opacity">Upload</button>
                        </>}
                        {(selectedElement.type === 'box' || selectedElement.type === 'circle') && <>
                           <span className="self-center">BG Color:</span><input type="color" value={selectedElement.backgroundColor} onChange={e => updateElement(selectedElement.id, {backgroundColor: e.target.value})} className="bg-transparent rounded p-0 w-full h-7"/>
                        </>}
                    </div>
                </div>
            )}
        </div>
    );
};

const PresetsPanel = ({ selectedElement, onApplyPreset, isScrollPreview, onScrollPreviewToggle }) => {
    if (!selectedElement) return null;

    const textPresets = [
        { name: 'Typewriter', step: { target: `#${selectedElement.id}`, vars: { text: { value: selectedElement.text }, duration: 2, ease: 'none' } } },
        { name: 'Stagger Fade In', step: { target: `#${selectedElement.id}`, vars: { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.5 }, position: '+=0.5' } }
    ];

    const scrollPresets = [
        { name: 'Fade In on Scroll', step: { target: `#${selectedElement.id}`, vars: { autoAlpha: 1, y: 0, scrollTrigger: { trigger: `#${selectedElement.id}`, start: 'top 80%', toggleActions: 'play none none none' } } } },
        { name: 'Slide In on Scroll', step: { target: `#${selectedElement.id}`, vars: { x: 0, autoAlpha: 1, scrollTrigger: { trigger: `#${selectedElement.id}`, start: 'top 80%', toggleActions: 'play none none none' } } } }
    ];
    
    return (
        <div className="flex flex-col gap-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-md">
            <h3 className="font-bold text-black dark:text-white">Presets</h3>
            <div className="text-sm space-y-2">
                {selectedElement.type === 'text' && (
                    <div>
                        <h4 className="text-xs font-semibold mb-1">Text Animations</h4>
                        {textPresets.map(p => <button key={p.name} onClick={() => onApplyPreset(p.step)} className="w-full text-left p-2 bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors mb-1">{p.name}</button>)}
                    </div>
                )}
                 <div>
                    <h4 className="text-xs font-semibold mb-1">Scroll Animations</h4>
                     <div className="flex items-center justify-between p-2 bg-gray-300/50 dark:bg-gray-700/50 rounded-md mb-2">
                         <span>Scroll Preview</span>
                         <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isScrollPreview} onChange={e => onScrollPreviewToggle(e.target.checked)} className="sr-only peer" />
                            <div className="relative w-11 h-6 bg-gray-400 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                        </label>
                     </div>
                    {scrollPresets.map(p => <button key={p.name} onClick={() => onApplyPreset(p.step)} className="w-full text-left p-2 bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors mb-1">{p.name}</button>)}
                </div>
            </div>
        </div>
    );
};

const Stage = ({ elements, selectedElementId, onSelectElement, onUpdateElement, settings, isScrollPreview }) => {
    const stageContainerRef = useRef<HTMLDivElement>(null);
    const draggableInstances = useRef<{ [id: string]: Draggable }>({});
    const [scale, setScale] = useState(1);
    
    useEffect(() => {
        const stageParent = stageContainerRef.current;
        if (!stageParent) return;
        
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                const scaleX = width / settings.width;
                const scaleY = height / settings.height;
                setScale(Math.min(scaleX, scaleY));
            }
        });
        
        resizeObserver.observe(stageParent);
        
        return () => resizeObserver.disconnect();
    }, [settings.width, settings.height]);
    
    useEffect(() => {
        elements.forEach(el => {
            const target = document.getElementById(el.id);
            if (target && !draggableInstances.current[el.id]) {
                draggableInstances.current[el.id] = new Draggable(target, {
                    bounds: "#stage-parent",
                    onPress() {
                        onSelectElement(el.id);
                        gsap.set(target, { zIndex: 1 + elements.length });
                    },
                    onDragEnd() {
                        onUpdateElement(el.id, { x: Math.round(this.x), y: Math.round(this.y) });
                        gsap.set(target, { zIndex: elements.findIndex(e => e.id === el.id) });
                    },
                });
            }
        });

        Object.keys(draggableInstances.current).forEach(id => {
            if (!elements.find(el => el.id === id)) {
                draggableInstances.current[id].kill();
                delete draggableInstances.current[id];
            }
        });

    }, [elements, onSelectElement, onUpdateElement]);

    return (
        <div ref={stageContainerRef} className={`w-full h-full rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center p-4 ${isScrollPreview ? 'bg-gray-300 dark:bg-gray-900' : 'bg-gray-200 dark:bg-gray-800'}`}>
            <div className={`relative ${isScrollPreview ? 'overflow-y-auto w-full h-full' : ''}`}>
                <div
                    id="stage-parent"
                    className="relative shadow-lg"
                    style={{ 
                        width: `${settings.width}px`, 
                        height: `${isScrollPreview ? settings.height * 2 : settings.height}px`,
                        backgroundColor: settings.backgroundColor, 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'top center',
                        transition: 'background-color 0.3s ease, height 0.3s ease',
                    }}
                    onClick={(e) => { e.stopPropagation(); onSelectElement(null);}}
                >
                    {elements.map((el, index) => {
                        const style: React.CSSProperties = {
                            position: 'absolute', left: `${el.x}px`, top: `${el.y}px`, width: el.width, height: el.height,
                            opacity: el.opacity, transform: `rotate(${el.rotation}deg)`,
                            outline: `2px solid ${selectedElementId === el.id ? (localStorage.getItem('theme') === 'dark' ? '#FFFFFF' : '#000000') : 'transparent'}`,
                            outlineOffset: '2px',
                            transition: 'outline-color 0.2s', cursor: 'grab', userSelect: 'none',
                            zIndex: index
                        };

                        const sharedProps = {
                            id: el.id,
                            className: `element ${el.type}`,
                            style: style,
                            onClick: (e) => { e.stopPropagation(); onSelectElement(el.id); },
                            onMouseDown: (e) => e.stopPropagation(),
                        };

                        switch (el.type) {
                            case 'box': return <div {...sharedProps} style={{ ...style, backgroundColor: el.backgroundColor }} />;
                            case 'circle': return <div {...sharedProps} style={{ ...style, backgroundColor: el.backgroundColor, borderRadius: '50%' }} />;
                            case 'text': return <div {...sharedProps} style={{ ...style, color: el.color, fontSize: `${el.fontSize}px`, fontWeight: el.fontWeight as any, background: 'transparent' }}>{el.text}</div>;
                            case 'image':
                                return el.src ? <img {...sharedProps} src={el.src} style={{ ...style, objectFit: 'cover' }} alt={el.id} /> : 
                                <div {...sharedProps} style={{ ...style, backgroundColor: el.backgroundColor, color: el.color }} className="flex items-center justify-center"><PhotoIcon/></div>;
                            case 'video':
                                return el.src ? <video {...sharedProps} src={el.src} style={{ ...style, objectFit: 'cover' }} autoPlay={el.autoplay} loop={el.loop} muted={el.muted} /> :
                                <div {...sharedProps} style={{ ...style, backgroundColor: el.backgroundColor, color: el.color }} className="flex items-center justify-center"><VideoCameraIcon/></div>;
                            default: return null;
                        }
                    })}
                </div>
            </div>
        </div>
    );
};

const RightPanel = ({ isCollapsed, chatHistory, onSendMessage, isLoading, animationSteps, elements, canvasSettings }) => {
    const [activeTab, setActiveTab] = useState('chat');
    return (
        <div className={`bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16 p-2' : 'w-96 p-1'}`}>
            {isCollapsed ? (
                <div className="flex flex-col items-center gap-4">
                    <button onClick={() => setActiveTab('chat')} className={`p-2 rounded-md ${activeTab === 'chat' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-200 dark:bg-gray-700'}`}><ChatBubbleIcon className="w-6 h-6"/></button>
                    <button onClick={() => setActiveTab('export')} className={`p-2 rounded-md ${activeTab === 'export' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-200 dark:bg-gray-700'}`}><CodeBracketIcon className="w-6 h-6"/></button>
                </div>
            ) : (
                <>
                    <div className="flex border-b border-gray-300 dark:border-gray-700">
                        <button onClick={() => setActiveTab('chat')} className={`flex-1 p-3 font-bold transition-colors ${activeTab === 'chat' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-700/50'}`}>Chat</button>
                        <button onClick={() => setActiveTab('export')} className={`flex-1 p-3 font-bold transition-colors ${activeTab === 'export' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-700/50'}`}>Export</button>
                    </div>
                    <div className="flex-grow p-3 min-h-0">
                        {activeTab === 'chat' && <ChatInterface history={chatHistory} onSendMessage={onSendMessage} isLoading={isLoading} />}
                        {activeTab === 'export' && <ExportPanel animationSteps={animationSteps} elements={elements} canvasSettings={canvasSettings} />}
                    </div>
                </>
            )}
        </div>
    );
};

const ChatInterface = ({ history, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);
    
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
                        <div className={`max-w-xs lg:max-w-sm p-3 rounded-lg ${msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-300 dark:bg-gray-700'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-300 dark:bg-gray-700"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800 dark:border-white"></div></div></div>}
            </div>
            <div className="mt-4 flex items-center gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="e.g., Make the blue box spin" className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none" disabled={isLoading} />
                <button onClick={handleSend} disabled={isLoading} className="p-2 bg-black dark:bg-white rounded-md hover:opacity-80 disabled:opacity-50"><SendIcon className="w-5 h-5 rotate-90 text-white dark:text-black"/></button>
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
            const classAttr = `class="element ${el.type}"`;
            switch(el.type) {
                case 'box': return `    <div id="${el.id}" ${classAttr} style="${baseStyle} background-color: ${el.backgroundColor};"></div>`;
                case 'circle': return `    <div id="${el.id}" ${classAttr} style="${baseStyle} background-color: ${el.backgroundColor}; border-radius: 50%;"></div>`;
                case 'text': return `    <div id="${el.id}" ${classAttr} style="${baseStyle} color: ${el.color}; font-size: ${el.fontSize}px; font-weight: ${el.fontWeight};">${el.text}</div>`;
                case 'image': return `    <img id="${el.id}" ${classAttr} src="${el.src}" style="${baseStyle} object-fit: cover;" alt="${el.id}">`;
                case 'video': return `    <video id="${el.id}" ${classAttr} src="${el.src}" style="${baseStyle} object-fit: cover;" ${el.autoplay ? 'autoplay' : ''} ${el.loop ? 'loop' : ''} ${el.muted ? 'muted' : ''}></video>`;
                default: return '';
            }
        }).join('\n');

        const hasScrollTrigger = animationSteps.some(step => step.vars.scrollTrigger);
        const hasTextPlugin = animationSteps.some(step => step.vars.text);

        const scripts = [
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>',
            hasScrollTrigger && '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>',
            hasTextPlugin && '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/TextPlugin.min.js"></script>'
        ].filter(Boolean).join('\n  ');

        const containerHeight = hasScrollTrigger ? canvasSettings.height * 2 : canvasSettings.height;

        return `<!DOCTYPE html><html><head><title>GSAP Animation</title><style>body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #111827; } #animation-container { position: relative; width: ${canvasSettings.width}px; height: ${containerHeight}px; background-color: ${canvasSettings.backgroundColor}; overflow: ${hasScrollTrigger ? 'visible' : 'hidden'}; }</style></head><body><div id="animation-container">\n${elementHTML}\n  </div>\n  ${scripts}\n  <script>\n    document.addEventListener('DOMContentLoaded', () => {\n${gsapCode.split('\n').map(line => '      ' + line).join('\n')}\n    });\n  </script>\n</body></html>`;
    }, [elements, canvasSettings, gsapCode, animationSteps]);
    
    const exportCode = generateExportCode();
    const instructions = `1. In Webflow or Framer, add an "Embed" or "Custom Code" component.\n2. Set its dimensions to match your canvas (${canvasSettings.width}px x ${canvasSettings.height}px).\n3. Copy the full code from the "HTML Export" tab.\n4. Paste it into the embed component's code editor.\n5. Publish your site. The animation should now be live!`;

    const handleCopy = (code) => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    return (
        <div className="flex flex-col h-full">
            <div className="flex border-b border-gray-400 dark:border-gray-600 text-sm">
                <button onClick={() => setActiveTab('gsap')} className={`px-4 py-2 ${activeTab === 'gsap' ? 'border-b-2 border-black dark:border-white text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>GSAP Code</button>
                <button onClick={() => setActiveTab('html')} className={`px-4 py-2 ${activeTab === 'html' ? 'border-b-2 border-black dark:border-white text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>HTML Export</button>
                <button onClick={() => setActiveTab('instructions')} className={`px-4 py-2 ${activeTab === 'instructions' ? 'border-b-2 border-black dark:border-white text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Instructions</button>
            </div>
            <div className="relative flex-grow mt-2 min-h-0">
                <pre className="h-full bg-gray-50 dark:bg-gray-900 p-3 rounded-md overflow-auto text-xs font-mono"><code>
                    {activeTab === 'gsap' && gsapCode}
                    {activeTab === 'html' && exportCode}
                    {activeTab === 'instructions' && instructions}
                </code></pre>
                <button onClick={() => handleCopy(activeTab === 'gsap' ? gsapCode : activeTab === 'html' ? exportCode : instructions)} className="absolute top-2 right-2 p-2 rounded-md bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" title="Copy Code"><CopyIcon className="w-4 h-4"/></button>
                {copied && <span className="absolute bottom-2 right-2 text-xs bg-green-500 text-white px-2 py-1 rounded">Copied!</span>}
            </div>
        </div>
    );
};

const TimelinePanel = ({ steps, onPlayPause, onRestart, onClear, isPlaying }) => (
    <div className="bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg flex flex-col p-3 gap-2">
        <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Animation Timeline</h3>
            <div className="flex items-center space-x-2">
                <button onClick={onPlayPause} className="p-2 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
                <button onClick={onRestart} className="p-2 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" title="Restart"><ReplayIcon /></button>
                <button onClick={onClear} className="p-2 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" title="Clear Animation"><ClearIcon /></button>
            </div>
        </div>
        <div className="flex-grow bg-white/50 dark:bg-gray-900/50 p-2 rounded-md min-h-[60px] max-h-[120px] overflow-y-auto">
            {steps.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">Timeline is empty. Ask the AI to create an animation!</p>
            ) : (
                <ol className="text-xs font-mono space-y-1">
                    {steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="text-gray-500">{i + 1}.</span>
                            <div className="flex-grow">
                                <span className="text-purple-600 dark:text-purple-400">to</span>(
                                <span className="text-red-600 dark:text-red-400">"{step.target}"</span>, 
                                <span className="text-blue-600 dark:text-blue-400">{JSON.stringify(step.vars)}</span>
                                {step.position && <span className="text-green-600 dark:text-green-400">, "{step.position}"</span>}
                                )
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    </div>
);


// == Main App Component ==

export default function App() {
  const [elements, setElements] = useState<StageElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([{ role: 'model', text: "Ready to animate? Tell me what to add or change. Try 'add a blue circle'." }]);
  const [canvasSettings, setCanvasSettings] = useState({ width: 1920, height: 1080, backgroundColor: '#ffffff' });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isLeftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isScrollPreview, setIsScrollPreview] = useState(false);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  const resetElementsToInitialState = useCallback(() => {
    elements.forEach(el => {
        gsap.set(`#${el.id}`, {
            x: el.x, y: el.y, width: el.width, height: el.height,
            rotation: el.rotation, opacity: el.opacity
        });
    });
    ScrollTrigger.getAll().forEach(st => st.kill());
  }, [elements]);

  const handleSendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', text: message }]);
    resetElementsToInitialState();
    const aiResponse: AIResponse = await sendMessageToAI(message, elements, selectedElementId, animationSteps);

    try {
        if (aiResponse.explanation) {
            setChatHistory(prev => [...prev, { role: 'model', text: aiResponse.explanation }]);
        }

        if (aiResponse.response_type === 'element_creation' && Array.isArray(aiResponse.new_elements)) {
            setElements(prev => [...prev, ...aiResponse.new_elements!]);
        }
        
        if (aiResponse.response_type === 'element_modification' && Array.isArray(aiResponse.modified_elements)) {
            setElements(prev => {
                const newElements = [...prev];
                aiResponse.modified_elements!.forEach(mod => {
                    const elementIndex = newElements.findIndex(e => e.id === mod.id);
                    if (elementIndex > -1) {
                        newElements[elementIndex] = { ...newElements[elementIndex], ...mod.props };
                    }
                });
                return newElements;
            });
        }
        
        if (aiResponse.response_type === 'animation' && Array.isArray(aiResponse.animation_steps) && aiResponse.animation_steps.length > 0) {
            setAnimationSteps(prev => [...prev, ...aiResponse.animation_steps!]);
        }
    } catch (error) {
        console.error("Error processing AI response:", error);
        setChatHistory(prev => [...prev, { role: 'model', text: "I'm sorry, something went wrong while applying the changes. This is likely due to a malformed response from the AI. Please check the console for details and try again." }]);
    } finally {
        setIsLoading(false);
    }
  }, [elements, resetElementsToInitialState, selectedElementId, animationSteps]);
  
  useEffect(() => {
    // Kill previous instances
    timelineRef.current?.kill();
    ScrollTrigger.getAll().forEach(st => st.kill());

    const timelineAnims = animationSteps.filter(step => !step.vars.scrollTrigger);
    const scrollAnims = animationSteps.filter(step => step.vars.scrollTrigger);

    // Create main timeline
    const tl = gsap.timeline({
        paused: true,
        onStart: () => setIsPlaying(true),
        onComplete: () => setIsPlaying(false),
        onUpdate: () => { if (!tl.isActive()) setIsPlaying(false); }
    });
    if (timelineAnims.length > 0) {
        timelineAnims.forEach(step => tl.to(step.target, step.vars, step.position));
    }
    timelineRef.current = tl;
    
    // Create ScrollTrigger instances
    if (scrollAnims.length > 0) {
        scrollAnims.forEach(step => {
            gsap.to(step.target, {
                ...step.vars,
                scrollTrigger: {
                    ...step.vars.scrollTrigger,
                    scroller: isScrollPreview ? "#stage-parent" : undefined
                }
            });
        });
    }

    return () => {
        timelineRef.current?.kill();
        ScrollTrigger.getAll().forEach(st => st.kill());
    };
}, [animationSteps, elements, isScrollPreview]);


  const updateElementPosition = useCallback((id: string, newProps: Partial<StageElement>) => {
      setElements(prev => prev.map(el => el.id === id ? { ...el, ...newProps } : el));
  }, []);

  const handleIdChange = (oldId: string, newId: string) => {
    if (oldId === newId || !newId) return;
    if (elements.some(el => el.id === newId)) return;
    
    setElements(prev => prev.map(el => el.id === oldId ? { ...el, id: newId } : el));
    if (selectedElementId === oldId) setSelectedElementId(newId);
    setAnimationSteps(prev => prev.map(step => ({
        ...step,
        target: step.target === `#${oldId}` ? `#${newId}` : step.target
    })));
  };

  const handlePlayPause = () => {
    if (!timelineRef.current) return;
    if (timelineRef.current.isActive()) timelineRef.current.pause();
    else if (timelineRef.current.progress() === 1) timelineRef.current.restart();
    else timelineRef.current.play();
  };
  const handleRestart = () => { timelineRef.current?.restart(); };
  const handleClearAnimation = () => {
    resetElementsToInitialState();
    setAnimationSteps([]);
  }

  const handleApplyPreset = (step: AnimationStep) => {
    resetElementsToInitialState();
    setAnimationSteps(prev => [...prev, step]);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col p-4 font-sans">
        <header className="flex items-center justify-between pb-4 border-b border-gray-300 dark:border-gray-700">
            <div>
                <h1 className="text-2xl font-bold tracking-wider">GSAP-GPT</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">An AI-powered playground to generate GSAP animations from natural language.</p>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Toggle Theme">
                {theme === 'dark' ? <SunIcon/> : <MoonIcon/>}
            </button>
        </header>

        <main className="flex-grow flex gap-4 mt-4 min-h-0">
            <div className="relative h-full flex items-stretch">
                <LeftPanel isCollapsed={isLeftPanelCollapsed} elements={elements} setElements={setElements} selectedElementId={selectedElementId} setSelectedElementId={setSelectedElementId} canvasSettings={canvasSettings} setCanvasSettings={setCanvasSettings} onIdChange={handleIdChange} onApplyPreset={handleApplyPreset} isScrollPreview={isScrollPreview} onScrollPreviewToggle={setIsScrollPreview} />
                <button onClick={() => setLeftPanelCollapsed(c => !c)} className="absolute top-1/2 -translate-y-1/2 z-10 bg-gray-300 dark:bg-gray-700 h-10 w-6 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" style={{right: '-1.5rem', borderRadius: '0 0.5rem 0.5rem 0'}}>
                    <ChevronRightIcon className={`w-5 h-5 transition-transform ${isLeftPanelCollapsed ? '' : 'rotate-180'}`} />
                </button>
            </div>

            <div className="flex-grow flex flex-col gap-4 min-w-0">
              <Stage elements={elements} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} onUpdateElement={updateElementPosition} settings={canvasSettings} isScrollPreview={isScrollPreview} />
              <TimelinePanel steps={animationSteps} onPlayPause={handlePlayPause} onRestart={handleRestart} onClear={handleClearAnimation} isPlaying={isPlaying}/>
            </div>

            <div className="relative h-full flex items-stretch">
                <RightPanel isCollapsed={isRightPanelCollapsed} chatHistory={chatHistory} onSendMessage={handleSendMessage} isLoading={isLoading} animationSteps={animationSteps} elements={elements} canvasSettings={canvasSettings} />
                <button onClick={() => setRightPanelCollapsed(c => !c)} className="absolute top-1/2 -translate-y-1/2 z-10 bg-gray-300 dark:bg-gray-700 h-10 w-6 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" style={{left: '-1.5rem', borderRadius: '0.5rem 0 0 0.5rem'}}>
                    <ChevronLeftIcon className={`w-5 h-5 transition-transform ${isRightPanelCollapsed ? '' : 'rotate-180'}`} />
                </button>
            </div>
        </main>
        <footer className="text-center pt-4 mt-4 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            Made with ♡ by <a href="https://cokeroluwafemi.com" target="_blank" rel="noopener noreferrer" className="text-black dark:text-white hover:underline">Coker Oluwafemi</a>
        </footer>
    </div>
  );
}