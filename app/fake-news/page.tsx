'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface NeuralConnection {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
}

export default function FakeNewsDetector() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mouse tracking states
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const delayedPositionRef = useRef({ x: 0, y: 0 });
  const [delayedPos, setDelayedPos] = useState({ x: 0, y: 0 });
  const neuronsRef = useRef<NeuralConnection[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const neuralCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const nodeHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
const delayedRafRef = useRef<number | null>(null);
  const lastUpdateTime = useRef(0);

  // Neural network background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const nodes: Array<{ x: number; y: number; vx: number; vy: number }> = [];
    const nodeCount = 50;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3
      });
    }

    let animationId: number;

    function animate() {
      if (!ctx || !canvas) return;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        nodes.forEach((otherNode, j) => {
          if (i === j) return;
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 - distance / 600})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Continuous delayed cursor
  useEffect(() => {
    const updateDelayedCursor = () => {
      const dx = mousePositionRef.current.x - delayedPositionRef.current.x;
      const dy = mousePositionRef.current.y - delayedPositionRef.current.y;
      
      delayedPositionRef.current.x += dx * 0.08;
      delayedPositionRef.current.y += dy * 0.08;
      
      setDelayedPos({ x: delayedPositionRef.current.x, y: delayedPositionRef.current.y });
      
      delayedRafRef.current = requestAnimationFrame(updateDelayedCursor);
    };
    
    delayedRafRef.current = requestAnimationFrame(updateDelayedCursor);
    
    return () => {
      if (delayedRafRef.current) {
        cancelAnimationFrame(delayedRafRef.current);
      }
    };
  }, []);

  // Mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX;
      const newY = e.clientY;
      
      const dx = newX - lastMouseRef.current.x;
      const dy = newY - lastMouseRef.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      
      lastMouseRef.current = { x: newX, y: newY };
      mousePositionRef.current = { x: newX, y: newY };
      
      const now = performance.now();
      if (now - lastUpdateTime.current > 16) {
        setMousePosition({ x: newX, y: newY });
        lastUpdateTime.current = now;
      }
      
      const timestamp = Date.now();
      nodeHistoryRef.current.push({ x: newX, y: newY, time: timestamp });
      
      nodeHistoryRef.current = nodeHistoryRef.current
        .filter(node => timestamp - node.time < 2000)
        .slice(-10);
      
      if (speed > 2 && nodeHistoryRef.current.length > 1) {
        const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
        const prevNode = nodeHistoryRef.current[nodeHistoryRef.current.length - 2];
        
        for (let i = 0; i < Math.min(2, Math.floor(speed / 20)); i++) {
          neuronsRef.current.push({
            x: prevNode.x,
            y: prevNode.y,
            targetX: newX + (Math.random() - 0.5) * 40,
            targetY: newY + (Math.random() - 0.5) * 40,
            progress: 0,
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }
        
        if (neuronsRef.current.length > 30) {
          neuronsRef.current = neuronsRef.current.slice(-30);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Neural animation
  useEffect(() => {
    const canvas = neuralCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;

    const animateNeurons = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      neuronsRef.current = neuronsRef.current
        .map(neuron => ({
          ...neuron,
          progress: neuron.progress + 0.05
        }))
        .filter(neuron => neuron.progress < 1);
      
      neuronsRef.current.forEach(neuron => {
        const currentX = neuron.x + (neuron.targetX - neuron.x) * neuron.progress;
        const currentY = neuron.y + (neuron.targetY - neuron.y) * neuron.progress;
        
        ctx.strokeStyle = neuron.color;
        ctx.globalAlpha = (1 - neuron.progress) * 0.4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(neuron.x, neuron.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        ctx.fillStyle = neuron.color;
        ctx.globalAlpha = 1 - neuron.progress;
        ctx.shadowBlur = 15;
        ctx.shadowColor = neuron.color;
        
        ctx.beginPath();
        ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = (1 - neuron.progress) * 0.6;
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
      });
      
      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animateNeurons);
    };

    animateNeurons();

    return () => cancelAnimationFrame(animationId);
  }, []);

  const handlePredict = async () => {
    if (text.trim().length < 10) {
      setError('Please enter at least 10 characters');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('https://ooommmggg-mlbackk.hf.space/api/news/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to get prediction');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'API connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setError('');
  };

  const sampleArticles = [
    {
      label: 'Fake News Example',
      text: 'Hillary Clinton sold weapons to ISIS according to leaked emails. FBI sources confirm secret investigation into arms deals with terrorist organizations. Anonymous whistleblowers reveal the mainstream media is covering up this massive scandal to protect political elites.'
    },
    {
      label: 'Real News Example',
      text: 'WASHINGTON (Reuters) - The U.S. economy added 250,000 jobs in November according to the Bureau of Labor Statistics report released Friday. The unemployment rate held steady at 3.7 percent. Federal Reserve officials said they are closely monitoring inflation data and employment trends.'
    }
  ];

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 opacity-30" />
      <canvas ref={neuralCanvasRef} className="fixed inset-0 z-10 pointer-events-none" />

      {/* Custom Cursor */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          className="absolute"
          style={{
            left: mousePositionRef.current.x,
            top: mousePositionRef.current.y,
            transform: 'translate(-50%, -50%)',
            transition: 'none'
          }}
        >
          <div className="relative">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="absolute inset-0 w-2 h-2 bg-white/50 rounded-full blur-[2px] -translate-x-0.5 -translate-y-0.5"></div>
          </div>
        </div>
        
        <div
          className="absolute"
          style={{
            left: delayedPos.x,
            top: delayedPos.y,
            transform: `translate(-50%, -50%) scale(${isHovering ? 1.8 : 1})`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <div 
            className="w-8 h-8 rounded-full border-2"
            style={{
              borderColor: isHovering ? '#ec4899' : '#3b82f6',
              transition: 'border-color 0.3s'
            }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link 
            href="/"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <GlitchText text="Back to Home" mouseX={mousePosition.x} mouseY={mousePosition.y} />
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-black mb-4">
              <GlitchText text="Fake News Detector" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              <GlitchText 
                text="AI-powered detection using Natural Language Processing" 
                mouseX={mousePosition.x} 
                mouseY={mousePosition.y} 
              />
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6">
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 px-6 py-3 rounded-xl">
                <p className="text-sm text-gray-500">Accuracy</p>
                <p className="text-2xl font-bold text-blue-400">94%</p>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 px-6 py-3 rounded-xl">
                <p className="text-sm text-gray-500">Dataset</p>
                <p className="text-2xl font-bold text-blue-400">44K</p>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 px-6 py-3 rounded-xl">
                <p className="text-sm text-gray-500">Type</p>
                <p className="text-2xl font-bold text-blue-400">NLP</p>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Samples Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  <GlitchText text="Quick Test Samples" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                </h3>
                
                <div className="space-y-3">
                  {sampleArticles.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => setText(sample.text)}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      disabled={loading}
                      className="w-full text-left p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-all group disabled:opacity-50"
                    >
                      <p className="text-sm font-semibold text-blue-400 mb-1">{sample.label}</p>
                      <p className="text-xs text-gray-400 line-clamp-3">{sample.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Input Card */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8">
                <label className="block text-sm font-bold text-white mb-3">
                  <GlitchText text="Enter News Article" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                </label>
                
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your news article here..."
                  className="w-full h-56 p-4 bg-black/50 border-2 border-gray-700 focus:border-blue-500 rounded-xl outline-none transition-all resize-none text-white placeholder-gray-500"
                  disabled={loading}
                />
                
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm text-gray-400">
                    <span className={text.length < 10 ? 'text-red-500' : 'text-green-400'}>
                      {text.length}
                    </span> characters {text.length < 10 && '(minimum 10)'}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handlePredict}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    disabled={loading || text.trim().length < 10}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Analyzing...' : 'Analyze Article'}
                  </button>
                  
                  <button
                    onClick={handleClear}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    disabled={loading}
                    className="px-6 py-4 bg-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-900/20 border-l-4 border-red-500 p-5 rounded-xl">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8">
                  <h2 className="text-3xl font-bold text-white mb-6">
                    <GlitchText text="Analysis Results" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                  </h2>

                  {/* Prediction Badge */}
                  <div className="mb-8 text-center">
                    <div
                      className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-2xl font-bold ${
                        result.label === 0
                          ? 'bg-gradient-to-r from-red-600 to-pink-600'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600'
                      }`}
                    >
                      {result.label === 0 ? '⚠️ Fake News Detected' : '✓ Likely Real News'}
                    </div>
                  </div>

                  {/* Confidence Scores */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-red-900/20 border-2 border-red-800 p-6 rounded-2xl">
                      <p className="text-sm font-bold text-gray-400 uppercase mb-2">Fake Confidence</p>
                      <p className="text-5xl font-black text-red-400 mb-3">{result.confidence.fake}%</p>
                      <div className="w-full bg-red-900/40 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-red-500 to-pink-500 h-4 rounded-full transition-all duration-1000"
                          style={{ width: `${result.confidence.fake}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-green-900/20 border-2 border-green-800 p-6 rounded-2xl">
                      <p className="text-sm font-bold text-gray-400 uppercase mb-2">Real Confidence</p>
                      <p className="text-5xl font-black text-green-400 mb-3">{result.confidence.real}%</p>
                      <div className="w-full bg-green-900/40 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-1000"
                          style={{ width: `${result.confidence.real}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        * {
          cursor: none !important;
        }
      `}</style>
    </div>
  );
}

// Glitch Text Component
function GlitchText({ 
  text, 
  mouseX,
  mouseY,
  large = false
}: { 
  text: string;
  mouseX: number;
  mouseY: number;
  large?: boolean;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [charEffects, setCharEffects] = useState<Array<{ offset: number; opacity: number }>>([]);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const chars = text.split('');
    const charWidth = rect.width / chars.length;
    
    const effects = chars.map((_, index) => {
      const charLeft = rect.left + (index * charWidth);
      const charCenter = charLeft + charWidth / 2;
      const charTop = rect.top + rect.height / 2;
      
      const dx = mouseX - charCenter;
      const dy = mouseY - charTop;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const maxDistance = 60;
      
      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        return {
          offset: force * (Math.random() - 0.5) * 4,
          opacity: 1 - (force * 0.5)
        };
      }
      
      return { offset: 0, opacity: 1 };
    });
    
    setCharEffects(effects);
  }, [mouseX, mouseY, text]);

  return (
    <span ref={textRef} className="inline-block">
      {text.split('').map((char, index) => {
        const effect = charEffects[index] || { offset: 0, opacity: 1 };
        
        return (
          <span
            key={index}
            className="inline-block transition-all duration-75"
            style={{
              transform: effect.offset !== 0 ? `translateY(${effect.offset}px)` : 'none',
              opacity: effect.opacity
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </span>
  );
}
