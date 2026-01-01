'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Github, Linkedin } from 'lucide-react';

interface NeuralConnection {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
}

export default function Home() {
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
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.2 - distance / 600})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        });

        ctx.fillStyle = '#8b5cf6';
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

  // Mouse movement - Throttled updates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX;
      const newY = e.clientY;

      const dx = newX - lastMouseRef.current.x;
      const dy = newY - lastMouseRef.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy);

      lastMouseRef.current = { x: newX, y: newY };
      mousePositionRef.current = { x: newX, y: newY };

      // Throttle state updates to 60fps
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
        const colors = ['#a855f7', '#ec4899', '#3b82f6', '#8b5cf6', '#f59e0b'];
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
  const handleDownloadResume = () => {
    // Create a link element
    const link = document.createElement('a');

    // Set the href to your resume file path (place your resume in the public folder)
    link.href = '/tempresume.pdf';

    // Set the download attribute with desired filename
    link.download = 'Om_Gosavi_Resume.pdf';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const projects = [
    {
      id: 1,
      title: 'Fake News Detector',
      subtitle: 'Logistic Regression • TF-IDF',
      description: 'Binary classification system analyzing 44K news articles using natural language processing',
      link: '/fake-news',
      color: '#3b82f6',
      stats: { accuracy: '73.7%', data: '44K', type: 'NLP' }
    },
    {
      id: 2,
      title: 'Mental Health Chatbot',
      subtitle: 'Random Forest • 6-Class',
      description: 'Real-time emotion detection and conversational AI for mental health support',
      link: '/mental-health',
      color: '#a855f7',
      stats: { accuracy: '73.7%', data: '6 Classes', type: 'Classification' }
    },
    {
      id: 3,
      title: 'Resume Screener',
      subtitle: 'Cosine Similarity • NLP',
      description: 'Intelligent ATS matching system with PDF parsing and skill extraction',
      link: '/resume-screener',
      color: '#10b981',
      stats: { accuracy: '74%', data: 'PDF', type: 'Matching' }
    },
    {
      id: 4,
      title: 'Traffic Predictor',
      subtitle: 'LSTM • Time-Series',
      description: 'Deep learning forecasting model predicting congestion across 4 junctions',
      link: '/traffic-predictor',
      color: '#f59e0b',
      stats: { accuracy: '96-98%', data: '48K', type: 'Forecasting' }
    },
    {
      id: 5,
      title: 'Sign Language AI',
      subtitle: 'CNN • Computer Vision',
      description: 'Real-time ASL recognition with webcam processing for accessibility',
      link: '/sign-language',
      color: '#ec4899',
      stats: { accuracy: '98.93%', data: '27K', type: 'Vision' },
      featured: true
    }
  ];

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 opacity-30" />
      <canvas ref={neuralCanvasRef} className="fixed inset-0 z-10 pointer-events-none" />

      {/* Custom Cursor */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Main Cursor - Tiny Glowing Point */}
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

        {/* Delayed Following Ring */}
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
      <div className="relative z-20">
        {/* Navigation */}
        <nav className="fixed top-0 w-full backdrop-blur-md bg-black/30 border-b border-white/10 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"></div>
              <span className="font-bold text-lg">
                <GlitchText text="ML Portfolio" mouseX={mousePosition.x} mouseY={mousePosition.y} />
              </span>
            </div>
            <div className="flex gap-4">
              <a
                href="https://github.com/OMG2Git"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/om-gosavi-2a8025316/"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-6 pt-20">
          <div className="max-w-6xl w-full">
            <h1 className="text-7xl md:text-8xl font-black mb-6 leading-none">
              <div className="block text-gray-700">
                <GlitchText text="Building" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
              </div>
              <div className="block text-purple-400">
                <GlitchText text="Intelligent" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
              </div>
              <div className="block text-gray-600">
                <GlitchText text="Systems" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
              </div>
            </h1>

            <div className="text-xl text-gray-300 max-w-2xl mb-12 leading-relaxed">
              <GlitchText
                text="5 production-ready machine learning projects. From NLP to Computer        Vision. From classical algorithms to deep neural networks."
                mouseX={mousePosition.x}
                mouseY={mousePosition.y}
              />
            </div>

            <div className="flex gap-4">
              <a
                href="#projects"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="group relative px-8 py-4 bg-white text-black font-semibold rounded-lg overflow-hidden transition-all flex items-center gap-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 group-hover:text-white transition-colors">View Projects</span>
                <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 group-hover:text-white transition-all" />
              </a>

              <button
                onClick={handleDownloadResume}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="group relative px-8 py-4 font-semibold rounded-lg overflow-hidden transition-all text-gray-300"
              >
                <div className="absolute inset-0 border-2 border-gray-600 rounded-lg group-hover:border-purple-500 transition-colors duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 group-hover:text-white transition-colors">Download Resume</span>
              </button>

            </div>

            {/* Tech Stack Ticker */}
            <div className="mt-16 overflow-hidden">
              <div className="flex gap-6 animate-scroll">
                {['TensorFlow', 'Scikit-learn', 'Keras', 'OpenCV', 'NLTK', 'Flask', 'Next.js', 'Python', 'CNN', 'LSTM', 'NLP', 'Computer Vision'].map((tech, i) => (
                  <span key={i} className="text-gray-600 text-sm whitespace-nowrap">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20">
              <h2 className="text-5xl md:text-6xl font-black mb-4">
                <GlitchText text="Projects_" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
              </h2>
              <div className="text-gray-300 text-lg">
                <GlitchText
                  text="Each project solves a real problem using different ML approaches"
                  mouseX={mousePosition.x}
                  mouseY={mousePosition.y}
                />
              </div>
            </div>

            <div className="space-y-4">
              {projects.map((project, index) => (
                <SpotlightProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  mouseX={mousePosition.x}
                  mouseY={mousePosition.y}
                  setIsHovering={setIsHovering}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Skills Marquee */}
        <section className="py-20 border-y border-gray-800">
          <div className="overflow-hidden">
            <div className="flex gap-12 animate-scroll-slow">
              {[
                'Machine Learning',
                'Deep Learning',
                'Neural Networks',
                'Computer Vision',
                'Natural Language Processing',
                'Time-Series Analysis',
                'Classification',
                'CNNs',
                'LSTMs',
                'Random Forest'
              ].map((skill, i) => (
                <span key={i} className="text-4xl font-black text-gray-800 whitespace-nowrap">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 px-6 border-t border-gray-800">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-400">
              <GlitchText
                text="© 2026 Built with Next.js, TensorFlow & Scikit-learn"
                mouseX={mousePosition.x}
                mouseY={mousePosition.y}
              />
            </div>
            <div className="flex gap-4">
              <a
                href="https://github.com/OMG2Git"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/om-gosavi-2a8025316/"
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Animations */}
      <style jsx global>{`
        * {
          cursor: none !important;
        }

        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-scroll {
          animation: scroll 20s linear infinite;
          display: flex;
          width: max-content;
        }

        .animate-scroll-slow {
          animation: scroll 40s linear infinite;
          display: flex;
          width: max-content;
        }
      `}</style>
    </div>
  );
}

// Glitch Text Component - Properly optimized with separate x/y props
function GlitchText({
  text,
  mouseX,
  mouseY,
  large = false,
  gradient = false
}: {
  text: string;
  mouseX: number;
  mouseY: number;
  large?: boolean;
  gradient?: boolean;
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
            className={`inline-block transition-all duration-75 ${gradient
                ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent'
                : ''
              }`}
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

// Spotlight Project Card
function SpotlightProjectCard({
  project,
  index,
  mouseX,
  mouseY,
  setIsHovering
}: {
  project: any;
  index: number;
  mouseX: number;
  mouseY: number;
  setIsHovering: (value: boolean) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, opacity: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;

    const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

    if (isInside) {
      setSpotlight({ x, y, opacity: 1 });
    } else {
      setSpotlight(prev => ({ ...prev, opacity: 0 }));
    }
  }, [mouseX, mouseY]);

  return (
    <Link href={project.link} className="block">
      <div
        ref={cardRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900/80 to-black/80 hover:border-gray-600 transition-all duration-500 group"
      >
        <div
          className="absolute pointer-events-none transition-opacity duration-200"
          style={{
            left: spotlight.x,
            top: spotlight.y,
            opacity: spotlight.opacity,
            width: '500px',
            height: '500px',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${project.color}50 0%, ${project.color}20 30%, transparent 70%)`,
            filter: 'blur(60px)'
          }}
        />

        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="text-6xl font-black text-gray-700 min-w-[80px] group-hover:text-gray-600 transition-colors">
            {String(index + 1).padStart(2, '0')}
          </div>

          <div
            className="w-1 h-16 rounded-full transition-all duration-300 group-hover:h-20"
            style={{
              backgroundColor: project.color,
              boxShadow: `0 0 20px ${project.color}80`
            }}
          />

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-bold">
                <GlitchText text={project.title} mouseX={mouseX} mouseY={mouseY} />
              </h3>
              {project.featured && (
                <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 font-semibold">
                  FEATURED
                </span>
              )}
            </div>
            <div className="text-sm text-gray-400 mb-3 group-hover:text-gray-300 transition-colors">
              <GlitchText text={project.subtitle} mouseX={mouseX} mouseY={mouseY} />
            </div>
            <div className="text-gray-300 mb-4 group-hover:text-white transition-colors">
              <GlitchText text={project.description} mouseX={mouseX} mouseY={mouseY} />
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-400">Accuracy: </span>
                <span className="text-white font-semibold">{project.stats.accuracy}</span>
              </div>
              <div>
                <span className="text-gray-400">Dataset: </span>
                <span className="text-white font-semibold">{project.stats.data}</span>
              </div>
              <div>
                <span className="text-gray-400">Type: </span>
                <span className="text-white font-semibold">{project.stats.type}</span>
              </div>
            </div>
          </div>

          <ArrowRight className="w-6 h-6 text-gray-500 group-hover:text-white group-hover:translate-x-2 transition-all" />
        </div>

        <div
          className="h-1 transition-all duration-500 group-hover:h-2"
          style={{
            background: `linear-gradient(90deg, ${project.color} 0%, transparent 100%)`,
            boxShadow: `0 0 15px ${project.color}90`
          }}
        />
      </div>
    </Link>
  );
}
