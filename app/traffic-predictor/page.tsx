'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Navigation, TrendingUp, Clock, Activity, BarChart3 } from 'lucide-react';

interface Prediction {
  datetime: string;
  vehicles: number;
  congestion_level: number;
}

interface PredictionResult {
  junction: number;
  predictions: Prediction[];
  historical_average: number;
  current_traffic: number;
}

interface Junction {
  id: number;
  name: string;
  avg_vehicles: number;
  max_vehicles: number;
  records: number;
}

interface NeuralConnection {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
}

export default function TrafficPredictor() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState(1);
  const [hoursAhead, setHoursAhead] = useState(6);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
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
  const delayedRafRef = useRef<number>();
  const lastUpdateTime = useRef(0);

  useEffect(() => {
    fetchJunctions();
  }, []);

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
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.2 - distance / 600})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });

        ctx.fillStyle = '#ef4444';
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
        const colors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#3b82f6'];
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

  const fetchJunctions = async () => {
    try {
      const response = await fetch('https://ooommmggg-mlbackk.hf.space/api/traffic/junctions');
      const data = await response.json();
      setJunctions(data.junctions);
    } catch (err) {
      console.error('Error fetching junctions:', err);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('https://ooommmggg-mlbackk.hf.space/api/traffic/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          junction: selectedJunction,
          hours_ahead: hoursAhead,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to predict traffic');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while predicting traffic');
    } finally {
      setLoading(false);
    }
  };

  const getCongestionColor = (level: number) => {
    if (level >= 80) return 'bg-red-500';
    if (level >= 60) return 'bg-orange-500';
    if (level >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCongestionText = (level: number) => {
    if (level >= 80) return 'Heavy';
    if (level >= 60) return 'Moderate';
    if (level >= 40) return 'Light';
    return 'Clear';
  };

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
              borderColor: isHovering ? '#ec4899' : '#ef4444',
              transition: 'border-color 0.3s'
            }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-screen py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link 
            href="/"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <GlitchText text="Back to Home" mouseX={mousePosition.x} mouseY={mousePosition.y} />
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Navigation className="w-12 h-12 text-red-400 mr-3" />
              <h1 className="text-5xl md:text-6xl font-black">
                <GlitchText text="Traffic Predictor" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
              </h1>
            </div>
            <p className="text-xl text-gray-400">
              <GlitchText 
                text="AI-powered traffic forecasting using LSTM" 
                mouseX={mousePosition.x} 
                mouseY={mousePosition.y} 
              />
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Junction Selection */}
              <div>
                <label className="block text-lg font-semibold text-white mb-3">
                  <GlitchText text="Select Junction" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                </label>
                <select
                  value={selectedJunction}
                  onChange={(e) => setSelectedJunction(Number(e.target.value))}
                  className="w-full p-4 border-2 border-gray-700 focus:border-red-500 rounded-lg outline-none bg-gray-800/50 text-white"
                >
                  {junctions.map((junction) => (
                    <option key={junction.id} value={junction.id}>
                      {junction.name} (Avg: {junction.avg_vehicles} vehicles)
                    </option>
                  ))}
                </select>
                
                {junctions.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                    <p className="text-sm text-gray-300">
                      <strong>Junction {selectedJunction} Stats:</strong>
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Max: {junctions.find(j => j.id === selectedJunction)?.max_vehicles} vehicles
                    </p>
                    <p className="text-sm text-gray-400">
                      Records: {junctions.find(j => j.id === selectedJunction)?.records.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Hours Ahead */}
              <div>
                <label className="block text-lg font-semibold text-white mb-3">
                  <GlitchText text="Predict Next Hours" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={hoursAhead}
                    onChange={(e) => setHoursAhead(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-3xl font-bold text-red-400 min-w-[60px]">
                    {hoursAhead}h
                  </span>
                </div>
                <div className="mt-4 flex justify-between text-sm text-gray-500">
                  <span>1 hour</span>
                  <span>12 hours</span>
                </div>
                
                <div className="mt-6 p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-purple-400 mr-2" />
                    <p className="text-sm text-gray-300">
                      <strong>Forecast:</strong> Next {hoursAhead} hour{hoursAhead > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Predict Button */}
            <div className="mt-8 text-center">
              <button
                onClick={handlePredict}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-12 py-4 rounded-lg text-lg font-semibold hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center mx-auto"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Predicting...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Predict Traffic
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">
                  <GlitchText text={`Current Status - Junction ${result.junction}`} mouseX={mousePosition.x} mouseY={mousePosition.y} />
                </h3>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-blue-900/20 rounded-lg border border-blue-800">
                    <Activity className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-blue-400 mb-2">
                      {result.current_traffic}
                    </p>
                    <p className="text-gray-300">Current Traffic</p>
                  </div>
                  
                  <div className="text-center p-6 bg-purple-900/20 rounded-lg border border-purple-800">
                    <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-purple-400 mb-2">
                      {result.historical_average}
                    </p>
                    <p className="text-gray-300">Historical Average</p>
                  </div>
                  
                  <div className="text-center p-6 bg-green-900/20 rounded-lg border border-green-800">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-green-400 mb-2">
                      {result.predictions.length}h
                    </p>
                    <p className="text-gray-300">Forecast Period</p>
                  </div>
                </div>
              </div>

              {/* Predictions */}
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">
                  <GlitchText text="Traffic Forecast" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                </h3>
                
                <div className="space-y-4">
                  {result.predictions.map((pred, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex-shrink-0 w-32">
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="text-lg font-semibold text-white">
                          {new Date(pred.datetime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-300">
                            {pred.vehicles} vehicles
                          </span>
                          <span className={`text-sm font-semibold ${
                            pred.congestion_level >= 80 ? 'text-red-400' :
                            pred.congestion_level >= 60 ? 'text-orange-400' :
                            pred.congestion_level >= 40 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {getCongestionText(pred.congestion_level)}
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${getCongestionColor(pred.congestion_level)} transition-all`}
                            style={{ width: `${pred.congestion_level}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 w-16 text-right">
                        <p className="text-2xl font-bold text-white">
                          {pred.congestion_level}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Info */}
              <div className="bg-blue-900/20 backdrop-blur-md border border-blue-800 rounded-2xl p-6">
                <div className="flex items-start">
                  <Activity className="w-6 h-6 text-blue-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-2">
                      Powered by LSTM Neural Networks
                    </h4>
                    <p className="text-sm text-gray-300">
                      This prediction uses a trained Long Short-Term Memory (LSTM) deep learning model that analyzes 
                      24 hours of historical traffic patterns to forecast future congestion levels. The model achieved 
                      {result.junction === 3 ? ' 1.81%' : result.junction === 1 ? ' 3.12%' : result.junction === 2 ? ' 5.62%' : ' 5.91%'} 
                      {' '}prediction error on real traffic data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
