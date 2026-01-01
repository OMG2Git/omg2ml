'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Hand, Zap, Info, CheckCircle } from 'lucide-react';

interface Prediction {
  letter: string;
  confidence: number;
}

interface PredictionResult {
  success?: boolean;
  top_prediction: Prediction;
  predictions: Prediction[];
}

interface NeuralConnection {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
}

export default function SignLanguageTranslator() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const predictionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [capturedText, setCapturedText] = useState('');
  const [error, setError] = useState('');
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState('');

  // Mouse tracking states
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const delayedPositionRef = useRef({ x: 0, y: 0 });
  const [delayedPos, setDelayedPos] = useState({ x: 0, y: 0 });
  const neuronsRef = useRef<NeuralConnection[]>([]);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const neuralCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const nodeHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
const delayedRafRef = useRef<number | null>(null);
  const lastUpdateTime = useRef(0);

  useEffect(() => {
    fetchAvailableLetters();
    
    return () => {
      if (predictionIntervalRef.current) {
        clearInterval(predictionIntervalRef.current);
      }
    };
  }, []);

  // Neural network background
  useEffect(() => {
    const canvas = bgCanvasRef.current;
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
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.2 - distance / 600})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });

        ctx.fillStyle = '#f59e0b';
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
        const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981'];
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

  const fetchAvailableLetters = async () => {
    try {
      const response = await fetch('https://ooommmggg-mlbackk.hf.space/api/sign/letters');
      const data = await response.json();
      setAvailableLetters(data.letters);
      setDebugInfo('✅ API Connected');
    } catch (err) {
      console.error('Error fetching letters:', err);
      setDebugInfo('❌ API Connection Failed');
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setIsWebcamActive(true);
          setError('');
          setDebugInfo('📸 Webcam Active');
          startPredictionLoop();
        };
      }
    } catch (err) {
      setError('Failed to access webcam. Please allow camera permissions.');
      setDebugInfo('❌ Webcam Error');
      console.error('Webcam error:', err);
    }
  };

  const stopWebcam = () => {
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
      predictionIntervalRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsWebcamActive(false);
    setPrediction(null);
    setDebugInfo('⏸️ Stopped');
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return null;
    }

    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = 640;
    canvas.height = 480;
    context.drawImage(video, 0, 0, 640, 480);

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const makePrediction = async () => {
    const frame = captureFrame();
    if (!frame) {
      setDebugInfo('⏳ Waiting for video...');
      return;
    }

    try {
      setDebugInfo('🔄 Predicting...');
      
      const response = await fetch('https://ooommmggg-mlbackk.hf.space/api/sign/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: frame }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: PredictionResult = await response.json();

      if (data.success && data.top_prediction) {
        setPrediction(data.top_prediction);
        setAllPredictions(data.predictions);
        setDebugInfo(`✅ ${data.top_prediction.letter} (${data.top_prediction.confidence.toFixed(1)}%)`);
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setDebugInfo('❌ Prediction Failed');
    }
  };

  const startPredictionLoop = () => {
    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
    }
    
    makePrediction();
    
    predictionIntervalRef.current = setInterval(() => {
      makePrediction();
    }, 500);
  };

  const addLetter = () => {
    if (prediction && prediction.confidence > 60) {
      setCapturedText(prev => prev + prediction.letter);
    }
  };

  const addSpace = () => {
    setCapturedText(prev => prev + ' ');
  };

  const clearText = () => {
    setCapturedText('');
  };

  const deleteLast = () => {
    setCapturedText(prev => prev.slice(0, -1));
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <canvas ref={bgCanvasRef} className="fixed inset-0 z-0 opacity-30" />
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
              borderColor: isHovering ? '#ec4899' : '#f59e0b',
              transition: 'border-color 0.3s'
            }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-screen py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link 
            href="/"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-orange-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <GlitchText text="Back to Home" mouseX={mousePosition.x} mouseY={mousePosition.y} />
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Hand className="w-12 h-12 text-orange-400 mr-3" />
              <h1 className="text-5xl md:text-6xl font-black">
                <GlitchText text="Sign Language Translator" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
              </h1>
            </div>
            <p className="text-xl text-gray-400 mb-6">
              <GlitchText 
                text="Real-time ASL recognition powered by CNN" 
                mouseX={mousePosition.x} 
                mouseY={mousePosition.y} 
              />
            </p>

            {/* Debug Status */}
            <div className="inline-block px-4 py-2 bg-blue-900/30 backdrop-blur-md border border-blue-800 rounded-lg">
              <p className="text-sm font-mono text-blue-300">
                Status: {debugInfo || 'Ready'}
              </p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Webcam Section */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Camera className="w-6 h-6 mr-2 text-orange-400" />
                    <GlitchText text="Live Camera Feed" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                  </h2>
                  <button
                    onClick={isWebcamActive ? stopWebcam : startWebcam}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    className={`px-6 py-2 rounded-lg font-semibold ${
                      isWebcamActive
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    } transition-colors`}
                  >
                    {isWebcamActive ? 'Stop Camera' : 'Start Camera'}
                  </button>
                </div>

                {/* Video */}
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Overlay Prediction */}
                  {prediction && isWebcamActive && (
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-lg">
                      <p className="text-sm text-gray-300 mb-1">Detected Sign:</p>
                      <p className="text-6xl font-bold">{prediction.letter}</p>
                      <p className="text-sm text-gray-300 mt-2">
                        {prediction.confidence.toFixed(1)}% confidence
                      </p>
                    </div>
                  )}

                  {!isWebcamActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Camera className="w-16 h-16 mx-auto mb-4" />
                        <p>Click "Start Camera" to begin</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                {isWebcamActive && (
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    <button
                      onClick={addLetter}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      disabled={!prediction || prediction.confidence < 60}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                      Add Letter
                    </button>
                    <button
                      onClick={addSpace}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                      Space
                    </button>
                    <button
                      onClick={deleteLast}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      className="bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={clearText}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Captured Text */}
                <div className="mt-4 p-6 bg-gray-800/50 rounded-lg border-2 border-gray-700 min-h-[100px]">
                  <p className="text-sm text-gray-400 mb-2">Captured Text:</p>
                  <p className="text-2xl font-mono text-white break-words">
                    {capturedText || 'Start signing to capture text...'}
                  </p>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                    <p className="text-red-300">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Top Predictions */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                  <GlitchText text="Top Predictions" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                </h3>
                <div className="space-y-3">
                  {allPredictions.length > 0 ? (
                    allPredictions.map((pred, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                      >
                        <div className="flex items-center flex-1">
                          <span className="text-3xl font-bold text-orange-400 mr-3">
                            {pred.letter}
                          </span>
                          <div className="flex-1">
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${pred.confidence}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-300 ml-3">
                          {pred.confidence.toFixed(1)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Start camera to see predictions
                    </p>
                  )}
                </div>
              </div>

              {/* Available Letters */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                  Available Letters ({availableLetters.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableLetters.map((letter) => (
                    <span
                      key={letter}
                      className="px-3 py-2 bg-orange-900/30 text-orange-300 rounded-lg font-semibold text-sm"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Note: J excluded (requires motion)
                </p>
              </div>

              {/* Info */}
              <div className="bg-orange-900/20 backdrop-blur-md border border-orange-800 rounded-2xl p-6">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-orange-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-2">How to Use</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Show hand sign clearly</li>
                      <li>• Wait for &gt;60% confidence</li>
                      <li>• Click "Add Letter" to capture</li>
                      <li>• Use plain background</li>
                      <li>• Ensure good lighting</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Model Stats */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-6">
                <h4 className="font-semibold text-white mb-3">Model Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Architecture:</span>
                    <span className="font-semibold text-white">CNN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Test Accuracy:</span>
                    <span className="font-semibold text-green-400">98.93%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Parameters:</span>
                    <span className="font-semibold text-white">162K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Training Samples:</span>
                    <span className="font-semibold text-white">27,455</span>
                  </div>
                </div>
              </div>
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
