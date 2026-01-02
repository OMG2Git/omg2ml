'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';

interface Scores {
    keyword_match: number;
    skills_match: number;
    format_score: number;
    overall: number;
}

interface AnalysisResult {
    scores: Scores;
    resume_keywords: string[];
    jd_keywords: string[];
    matching_keywords: string[];
    resume_skills: Record<string, string[]>;
    jd_skills: Record<string, string[]>;
    missing_skills: Record<string, string[]>;
    suggestions: string[];
    verdict: string;
}

interface NeuralConnection {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    progress: number;
    color: string;
}

const EXAMPLE_JDS = {
    ml: `Machine Learning Intern - AI/ML Team

We are looking for a passionate Machine Learning intern to join our AI team. The ideal candidate should have strong Python programming skills and experience with NLP, deep learning frameworks, and building end-to-end ML systems.

Responsibilities:
- Develop and deploy machine learning models for text classification and NLP tasks
- Build REST APIs using Flask/FastAPI for model deployment
- Work with TensorFlow, PyTorch, and Scikit-learn for model development
- Implement data preprocessing pipelines and feature engineering
- Deploy models on cloud platforms (AWS, Hugging Face, Render)

Requirements:
- Strong Python programming (NumPy, Pandas, Scikit-learn)
- Experience with NLP (NLTK, TF-IDF, text classification)
- Knowledge of deep learning frameworks (TensorFlow, Keras, PyTorch)
- Familiarity with React, Node.js, and API development
- Experience with MongoDB or SQL databases
- Git/GitHub proficiency

Education: MCA or relevant computer science degree`,

    cybersecurity: `Cybersecurity Analyst - Security Operations Center

We are seeking a skilled Cybersecurity Analyst to join our Security Operations Center (SOC) team.

Responsibilities:
- Monitor security events and alerts using SIEM tools (Splunk, QRadar)
- Conduct vulnerability assessments and penetration testing
- Analyze malware and conduct forensic investigations
- Implement security controls and firewall configurations
- Respond to security incidents and coordinate breach response

Requirements:
- Strong knowledge of network protocols (TCP/IP, DNS, HTTP, SSL/TLS)
- Experience with security tools (Wireshark, Nmap, Metasploit, Burp Suite)
- Understanding of OWASP Top 10 and common vulnerabilities
- Knowledge of firewall management and VPN technologies
- Experience with SIEM platforms and log analysis

Certifications: CEH, CISSP or Security+, CompTIA CySA+`
};

export default function ResumeScreener() {
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [jobDescription, setJobDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
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
                        ctx.strokeStyle = `rgba(16, 185, 129, ${0.2 - distance / 600})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(otherNode.x, otherNode.y);
                        ctx.stroke();
                    }
                });

                ctx.fillStyle = '#10b981';
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
                const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload a PDF, DOCX, or TXT file');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setError('File size should be less than 5MB');
                return;
            }

            setResumeFile(file);
            setError('');
        }
    };

    const loadExampleJD = (type: 'ml' | 'cybersecurity') => {
        setJobDescription(EXAMPLE_JDS[type]);
        setResult(null);
    };



    const handleAnalyze = async () => {
        if (!resumeFile || !jobDescription.trim()) {
            setError('Please upload a resume and enter a job description');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            console.log('📱 Step 1: Waking up server...');

            // CRITICAL FIX: Wake up the Hugging Face Space first
            try {
                const healthCheck = await Promise.race([
                    fetch('https://ooommmggg-mlbackk.hf.space/api/resume/health', {
                        method: 'GET',
                        mode: 'cors',
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')), 90000) // 90 seconds for wake-up
                    )
                ]);
                console.log('✅ Server is awake!');
            } catch (err) {
                console.log('⚠️ Server might be starting, continuing anyway...');
            }

            console.log('📱 Step 2: Uploading file:', resumeFile.name);

            // Create FormData
            const formData = new FormData();
            formData.append('resume_file', resumeFile);
            formData.append('job_description', jobDescription);

            // CRITICAL FIX: Add longer timeout for mobile + cold start
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

            const response = await fetch('https://ooommmggg-mlbackk.hf.space/api/resume/analyze', {
                method: 'POST',
                body: formData,
                mode: 'cors',
                credentials: 'omit',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Analysis complete!');
            setResult(data.result);

        } catch (err: any) {
            console.error('❌ Error:', err);

            if (err.name === 'AbortError') {
                setError('Request timed out. The server might be starting up. Please try again in 30 seconds.');
            } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                setError('Server is starting up. Please wait 30 seconds and try again.');
            } else {
                setError(err.message || 'An error occurred while analyzing the resume');
            }
        } finally {
            setLoading(false);
        }
    };




    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 80) return 'bg-green-900/30';
        if (score >= 60) return 'bg-yellow-900/30';
        if (score >= 40) return 'bg-orange-900/30';
        return 'bg-red-900/30';
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
                            borderColor: isHovering ? '#ec4899' : '#10b981',
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
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors mb-8"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <GlitchText text="Back to Home" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                    </Link>

                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl md:text-6xl font-black mb-4">
                            <GlitchText text="AI Resume Screener" mouseX={mousePosition.x} mouseY={mousePosition.y} large />
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            <GlitchText
                                text="Optimize your resume for ATS systems"
                                mouseX={mousePosition.x}
                                mouseY={mousePosition.y}
                            />
                        </p>
                    </div>

                    {/* Input Section */}
                    <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8 mb-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* File Upload */}
                            <div>
                                <label className="block text-lg font-semibold text-white mb-3">
                                    <GlitchText text="Upload Resume" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                                </label>
                                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-green-500 transition-colors bg-gray-800/50">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="resume-upload"
                                    />
                                    <label
                                        htmlFor="resume-upload"
                                        className="cursor-pointer"
                                        onMouseEnter={() => setIsHovering(true)}
                                        onMouseLeave={() => setIsHovering(false)}
                                    >
                                        <Upload className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                                        <p className="text-gray-300 mb-2">
                                            {resumeFile ? resumeFile.name : 'Click to upload or drag and drop'}
                                        </p>
                                        <p className="text-sm text-gray-500">PDF, DOCX, or TXT (max 5MB)</p>
                                    </label>
                                </div>
                                {resumeFile && (
                                    <div className="mt-3 flex items-center text-green-400">
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        <span>File uploaded successfully</span>
                                    </div>
                                )}
                            </div>

                            {/* Job Description */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-lg font-semibold text-white">
                                        <GlitchText text="Job Description" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => loadExampleJD('ml')}
                                            onMouseEnter={() => setIsHovering(true)}
                                            onMouseLeave={() => setIsHovering(false)}
                                            className="text-xs px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            ML Intern
                                        </button>
                                        <button
                                            onClick={() => loadExampleJD('cybersecurity')}
                                            onMouseEnter={() => setIsHovering(true)}
                                            onMouseLeave={() => setIsHovering(false)}
                                            className="text-xs px-3 py-1 bg-red-900/30 text-red-300 rounded-full hover:bg-red-900/50 transition-colors flex items-center gap-1"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Cybersecurity
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the job description here or try an example..."
                                    className="w-full h-48 p-4 border-2 border-gray-700 focus:border-green-500 rounded-lg outline-none resize-none bg-gray-800/50 text-white placeholder-gray-500"
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    {jobDescription.length} characters
                                </p>
                            </div>
                        </div>

                        {/* Analyze Button */}
                        {/* Analyze Button - Update the button text */}
                        <button
                            onClick={handleAnalyze}
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                            disabled={loading || !resumeFile || !jobDescription.trim()}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-12 py-4 rounded-lg text-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Analyzing... (may take 1-2 min on first use)' : 'Analyze Resume'}
                        </button>


                        {/* Error */}
                        {error && (
                            <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start">
                                <XCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                                <p className="text-red-300">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    {result && (
                        <div className="space-y-6">
                            {/* Overall Score */}
                            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8">
                                <div className="text-center">
                                    <div className={`inline-block ${getScoreBgColor(result.scores.overall)} rounded-full px-8 py-4 mb-4`}>
                                        <p className={`text-6xl font-bold ${getScoreColor(result.scores.overall)}`}>
                                            {result.scores.overall}%
                                        </p>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        <GlitchText text="ATS Score" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                                    </h2>
                                    <p className="text-lg text-gray-300">{result.verdict}</p>
                                </div>

                                {/* Detailed Scores */}
                                <div className="grid md:grid-cols-3 gap-6 mt-8">
                                    <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                        <p className="text-3xl font-bold text-green-400 mb-2">
                                            {result.scores.keyword_match}%
                                        </p>
                                        <p className="text-gray-300">Keyword Match</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                        <p className="text-3xl font-bold text-blue-400 mb-2">
                                            {result.scores.skills_match}%
                                        </p>
                                        <p className="text-gray-300">Skills Match</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                        <p className="text-3xl font-bold text-yellow-400 mb-2">
                                            {result.scores.format_score}%
                                        </p>
                                        <p className="text-gray-300">Format Score</p>
                                    </div>
                                </div>
                            </div>

                            {/* Keywords Analysis */}
                            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8">
                                <h3 className="text-2xl font-bold text-white mb-6">
                                    <GlitchText text="Keywords Analysis" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-200 mb-3">Resume Keywords</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.resume_keywords.map((keyword, index) => (
                                                <span key={index} className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm">
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-200 mb-3">Job Keywords</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.jd_keywords.map((keyword, index) => (
                                                <span key={index} className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm">
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-200 mb-3">Matching</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.matching_keywords.length > 0 ? (
                                                result.matching_keywords.map((keyword, index) => (
                                                    <span key={index} className="px-3 py-1 bg-green-900/30 text-green-300 rounded-full text-sm">
                                                        {keyword}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 text-sm">No matches found</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Skills Analysis */}
                            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8">
                                <h3 className="text-2xl font-bold text-white mb-6">
                                    <GlitchText text="Skills Analysis" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                                </h3>

                                {/* Missing Skills */}
                                {Object.keys(result.missing_skills).length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-semibold text-red-400 mb-3 flex items-center">
                                            <AlertCircle className="w-5 h-5 mr-2" />
                                            Missing Skills (Add These!)
                                        </h4>
                                        <div className="space-y-3">
                                            {Object.entries(result.missing_skills).map(([category, skills]) => (
                                                <div key={category} className="bg-red-900/20 p-4 rounded-lg border border-red-800">
                                                    <p className="font-medium text-gray-200 mb-2 capitalize">{category}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {skills.map((skill, index) => (
                                                            <span key={index} className="px-3 py-1 bg-red-900/40 text-red-300 rounded-full text-sm">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Matched Skills */}
                                {Object.keys(result.resume_skills).length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-green-400 mb-3 flex items-center">
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                            Your Skills Found
                                        </h4>
                                        <div className="space-y-3">
                                            {Object.entries(result.resume_skills).map(([category, skills]) => (
                                                <div key={category} className="bg-green-900/20 p-4 rounded-lg border border-green-800">
                                                    <p className="font-medium text-gray-200 mb-2 capitalize">{category}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {skills.map((skill, index) => (
                                                            <span key={index} className="px-3 py-1 bg-green-900/40 text-green-300 rounded-full text-sm">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Suggestions */}
                            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8">
                                <h3 className="text-2xl font-bold text-white mb-6">
                                    <GlitchText text="Improvement Suggestions" mouseX={mousePosition.x} mouseY={mousePosition.y} />
                                </h3>
                                <div className="space-y-3">
                                    {result.suggestions.map((suggestion, index) => (
                                        <div key={index} className="flex items-start p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                                            <AlertCircle className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                                            <p className="text-gray-200">{suggestion}</p>
                                        </div>
                                    ))}
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
