'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  emotion?: string;
  confidence?: number;
  timestamp: Date;
}

interface EmotionData {
  emotion: string;
  confidence: Record<string, number>;
  top_confidence: number;
  response: string;
  resources?: {
    tips?: string[];
    helpline?: string;
  };
  show_helpline?: boolean;
  note?: string;
}

interface NeuralConnection {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
}

export default function MentalHealthChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: "Hello! I'm here to listen and support you. This is a safe space where you can share your feelings. How are you doing today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check API health on mount
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch('https://ooommmggg-mlbackk.hf.space/api/mental/health', {
          method: 'GET',
        });
        if (response.ok) {
          const data = await response.json();
          setApiStatus(data.status === 'healthy' ? 'online' : 'offline');
        } else {
          setApiStatus('offline');
        }
      } catch (error) {
        console.log('API health check failed, assuming offline/cold start');
        setApiStatus('offline');
      }
    };

    checkApiHealth();
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
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.2 - distance / 600})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });

        ctx.fillStyle = '#a855f7';
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
        const colors = ['#a855f7', '#ec4899', '#8b5cf6', '#c084fc', '#e879f9'];
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

  const emotionConfig: Record<string, { emoji: string; color: string; bg: string }> = {
    joy: { emoji: '😊', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
    sadness: { emoji: '😢', color: 'text-blue-400', bg: 'bg-blue-900/20' },
    anger: { emoji: '😠', color: 'text-red-400', bg: 'bg-red-900/20' },
    fear: { emoji: '😰', color: 'text-purple-400', bg: 'bg-purple-900/20' },
    love: { emoji: '💖', color: 'text-pink-400', bg: 'bg-pink-900/20' },
    surprise: { emoji: '😲', color: 'text-orange-400', bg: 'bg-orange-900/20' },
    neutral: { emoji: '😐', color: 'text-gray-400', bg: 'bg-gray-900/20' },
  };

  const getEmotionStats = () => {
    const emotions = messages
      .filter((m) => m.emotion && m.sender === 'user')
      .map((m) => m.emotion!);
    
    const counts: Record<string, number> = {};
    emotions.forEach((emotion) => {
      counts[emotion] = (counts[emotion] || 0) + 1;
    });
    
    return counts;
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const generateId = () => Date.now() + Math.random();

    const userMessage: Message = {
      id: generateId(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText;
    setInputText('');
    setLoading(true);

    // Helper function for fetch with retry and timeout
    const fetchWithRetry = async (
      url: string,
      options: RequestInit,
      maxRetries: number = 3,
      timeoutMs: number = 45000
    ): Promise<Response> => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok || (response.status >= 400 && response.status < 500)) {
            return response;
          }

          if (attempt < maxRetries - 1) {
            const delayMs = Math.min(2000 * Math.pow(2, attempt), 10000);
            console.log(`Attempt ${attempt + 1} failed with status ${response.status}. Retrying in ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }

          return response;
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              console.error(`Request timeout (attempt ${attempt + 1}/${maxRetries})`);
              
              if (attempt < maxRetries - 1) {
                const delayMs = Math.min(2000 * Math.pow(2, attempt), 10000);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
              }
              
              throw new Error('Request timeout - the API took too long to respond (45+ seconds). The service may be starting up.');
            }
          }

          if (attempt < maxRetries - 1) {
            const delayMs = Math.min(2000 * Math.pow(2, attempt), 10000);
            console.error(`Network error (attempt ${attempt + 1}/${maxRetries}):`, error);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }

          throw error;
        }
      }

      throw new Error('Max retries reached');
    };

    try {
      console.log('Sending request to API with text:', messageText);

      const response = await fetchWithRetry(
        'https://ooommmggg-mlbackk.hf.space/api/mental/predict',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: messageText }),
        },
        3,
        45000
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = 'Failed to detect emotion';
        let errorDetails = '';
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.log('Error data:', errorData);
            errorMessage = errorData.error || errorData.message || errorMessage;
            errorDetails = errorData.details || '';
          } else {
            const errorText = await response.text();
            console.log('Error text:', errorText);
            if (errorText) errorMessage = errorText;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }

        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          details: errorDetails,
        });

        throw new Error(errorMessage);
      }

      const data: EmotionData = await response.json();
      console.log('Success response:', data);

      if (!data.emotion || !data.response) {
        throw new Error('Invalid response format from emotion detection service');
      }

      setCurrentEmotion(data.emotion);
      setApiStatus('online');

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? { 
                ...msg, 
                emotion: data.emotion, 
                confidence: data.top_confidence || 0 
              }
            : msg
        )
      );

      const botMessage: Message = {
        id: generateId(),
        text: data.response,
        sender: 'bot',
        emotion: data.emotion,
        confidence: data.top_confidence,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // Add note if present (for low confidence predictions) - COMMENTED OUT
      // if (data.note) {
      //   setTimeout(() => {
      //     const noteMessage: Message = {
      //       id: generateId(),
      //       text: `ℹ️ ${data.note}`,
      //       sender: 'bot',
      //       timestamp: new Date(),
      //     };
      //     setMessages((prev) => [...prev, noteMessage]);
      //   }, 500);
      // }

      if (data.resources?.tips && data.resources.tips.length > 0) {
        setTimeout(() => {
          const tipsMessage: Message = {
            id: generateId(),
            text: `Here are some helpful tips:\n\n${data.resources!.tips!.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}`,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, tipsMessage]);
        }, 1000);
      }

      if (data.show_helpline && data.resources?.helpline) {
        setTimeout(() => {
          const helplineMessage: Message = {
            id: generateId(),
            text: `If you need immediate support:\n${data.resources!.helpline}`,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, helplineMessage]);
        }, 1500);
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      setApiStatus('offline');

      let userFriendlyMessage = "I'm having trouble connecting right now. ";

      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('45+ seconds')) {
          userFriendlyMessage = "⏱️ The API is taking longer than expected (possibly cold starting). This usually takes 30-60 seconds on first request. Please try again.";
        } else if (error.message.includes('500')) {
          userFriendlyMessage = "🔧 The emotion detection service encountered an error. This might be a model loading issue. Please try again.";
        } else if (error.message.includes('503') || error.message.includes('unavailable')) {
          userFriendlyMessage = "😴 The service is starting up (cold start). Please wait 30 seconds and try again.";
        } else if (error.message.includes('404')) {
          userFriendlyMessage = "❌ The API endpoint was not found. Please check the URL: /api/mental/predict";
        } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
          userFriendlyMessage = "🌐 Network error. Please check your internet connection.";
        } else if (error.message.toLowerCase().includes('cors')) {
          userFriendlyMessage = "🔒 CORS error - the API is blocking requests. Contact the administrator.";
        } else if (error.message.includes('text')) {
          userFriendlyMessage = "⚠️ Request format error - make sure the API expects {'text': 'message'}";
        } else {
          userFriendlyMessage += error.message;
        }
      }

      const errorMessage: Message = {
        id: generateId(),
        text: userFriendlyMessage,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const emotionStats = getEmotionStats();
  const totalEmotions = Object.values(emotionStats).reduce((a, b) => a + b, 0);

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
              borderColor: isHovering ? '#ec4899' : '#a855f7',
              transition: 'border-color 0.3s'
            }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link 
            href="/"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <GlitchText text="Back to Home" mouseX={mousePosition.x} mouseY={mousePosition.y} />
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-black mb-4">
              <GlitchText text="Mental Health Support" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-6">
              <GlitchText 
                text="AI-Powered Emotion Detection | Random Forest Model" 
                mouseX={mousePosition.x} 
                mouseY={mousePosition.y} 
              />
            </p>

            {/* API Status Badge */}
            <div className="flex justify-center mb-4">
              <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                apiStatus === 'online' 
                  ? 'bg-green-900/30 text-green-400 border border-green-700' 
                  : apiStatus === 'offline'
                  ? 'bg-red-900/30 text-red-400 border border-red-700'
                  : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  apiStatus === 'online' ? 'bg-green-400 animate-pulse' : 
                  apiStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
                }`}></div>
                {apiStatus === 'online' ? 'API Online' : apiStatus === 'offline' ? 'API Offline' : 'Checking...'}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6">
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 px-6 py-3 rounded-xl">
                <p className="text-sm text-gray-500">Model</p>
                <p className="text-2xl font-bold text-purple-400">Random Forest</p>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 px-6 py-3 rounded-xl">
                <p className="text-sm text-gray-500">Emotions</p>
                <p className="text-2xl font-bold text-purple-400">6 Classes</p>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 px-6 py-3 rounded-xl">
                <p className="text-sm text-gray-500">Messages</p>
                <p className="text-2xl font-bold text-purple-400">{messages.length - 1}</p>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar - Emotion Stats */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  <GlitchText text="Emotion Tracker" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                </h3>
                
                {totalEmotions > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(emotionStats)
                      .sort(([, a], [, b]) => b - a)
                      .map(([emotion, count]) => {
                        const config = emotionConfig[emotion] || emotionConfig.neutral;
                        const percentage = ((count / totalEmotions) * 100).toFixed(1);
                        return (
                          <div key={emotion} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="text-xl">{config.emoji}</span>
                                <span className="capitalize text-gray-300">{emotion}</span>
                              </span>
                              <span className="font-semibold text-white">{percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${config.bg.replace('/20', '/40')}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Start chatting to see emotion patterns
                  </p>
                )}
              </div>

              {/* Current Emotion */}
              {currentEmotion && (
                <div className={`rounded-2xl p-6 border-2 ${emotionConfig[currentEmotion]?.bg || emotionConfig.neutral.bg} border-purple-800`}>
                  <p className="text-sm font-semibold text-gray-400 mb-2">Current Emotion</p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{emotionConfig[currentEmotion]?.emoji || emotionConfig.neutral.emoji}</span>
                    <p className={`text-xl font-bold capitalize ${emotionConfig[currentEmotion]?.color || emotionConfig.neutral.color}`}>
                      {currentEmotion}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3">
              <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl flex flex-col h-[600px]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-gray-800 text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.text}</p>
                        {message.emotion && message.sender === 'user' && (
                          <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-2 text-xs">
                            <span>{emotionConfig[message.emotion]?.emoji || '😐'}</span>
                            <span className="capitalize">{message.emotion}</span>
                            {message.confidence && <span>• {message.confidence.toFixed(1)}%</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 rounded-2xl px-4 py-3">
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-800">
                  <div className="flex gap-3">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Share your feelings... (Press Enter to send)"
                      className="flex-1 resize-none p-3 bg-black/50 border-2 border-gray-700 focus:border-purple-500 rounded-xl outline-none text-white placeholder-gray-500"
                      rows={2}
                      disabled={loading}
                    />
                    <button
                      onClick={handleSend}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      disabled={loading || !inputText.trim()}
                      className="px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
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