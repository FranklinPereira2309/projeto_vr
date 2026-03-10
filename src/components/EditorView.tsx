import React, { useState, useRef, Suspense, useEffect } from 'react';
import { PCFShadowMap } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stage, Float, Html } from '@react-three/drei';
import { Avatar } from './Avatar';
import { generateSpeech } from '../services/tts';
import { motion, AnimatePresence } from 'motion/react';
import { XR, createXRStore } from '@react-three/xr';
import {
  Upload,
  Type,
  QrCode as QrIcon,
  Play,
  Download,
  Settings,
  User,
  MessageSquare,
  ChevronRight,
  Save,
  Trash2,
  Volume2,
  Eye,
  Box,
  Sparkles
} from 'lucide-react';

const store = createXRStore();
import { QRCodeSVG } from 'qrcode.react';
import { ErrorBoundary } from './ErrorBoundary';

export function EditorView({ onPreviewAR }: { onPreviewAR: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>('/models/franklin_animado.glb');
  const [avatarName, setAvatarName] = useState('Franklin Animado');
  const [script, setScript] = useState('Olá! Eu sou o seu novo avatar fotorrealista. Como posso ajudar você hoje?');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      setIsLoading(true);
    }
  };

  const handleTestSpeech = async () => {
    if (isSpeaking) return;

    setIsLoading(true);
    const base64Audio = await generateSpeech(script);
    setIsLoading(false);

    if (base64Audio) {
      const audioBlob = await fetch(`data:audio/wav;base64,${base64Audio}`).then(r => r.blob());
      const audioUrl = URL.createObjectURL(audioBlob);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioUrl;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createMediaElementSource(audioRef.current);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      setIsSpeaking(true);
      audioRef.current.play();

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!audioRef.current || audioRef.current.paused) {
          setIsSpeaking(false);
          setAudioLevel(0);
          return;
        }
        analyserRef.current!.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(average / 128);
        requestAnimationFrame(updateLevel);
      };

      updateLevel();

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        setAudioLevel(0);
      };
    }
  };

  // The QR code will encode a JSON string with the config
  const qrData = JSON.stringify({
    n: avatarName,
    t: script,
    u: avatarUrl?.startsWith('blob') ? 'LOCAL_MODEL' : avatarUrl,
    vr: true // Future-ready VR flag
  });

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* Sidebar Controls */}
      <div className="w-[400px] border-r border-white/10 bg-[#0a0a0a] flex flex-col z-20 shadow-2xl">
        <div className="p-6 border-bottom border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Settings className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Avatar Editor</h1>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">Configuração Profissional</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Section: Avatar Identity */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <User className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Identidade</h2>
              <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 ml-1">Templates</label>
              <select
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    // Do nothing, wait for upload
                  } else if (e.target.value === 'franklin_animado') {
                    setAvatarUrl('/models/franklin_animado.glb');
                    setAvatarName('Franklin Animado');
                  } else if (e.target.value === 'franklin_normal') {
                    setAvatarUrl('/models/franklin_normal.glb');
                    setAvatarName('Franklin Normal');
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="franklin_animado" className="bg-zinc-900 text-white">Franklin Animado (Recomendado)</option>
                <option value="franklin_normal" className="bg-zinc-900 text-white">Franklin Normal</option>
                <option value="custom" className="bg-zinc-900 text-white">Upload Customizado (.glb)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 ml-1">Nome do Avatar</label>
              <input
                type="text"
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="Ex: Alex Assistente"
              />
            </div>          </section>

          {/* Section: 3D Model */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Upload className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Modelo 3D (.glb)</h2>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer relative w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-emerald-500/50 bg-white/[0.02] hover:bg-emerald-500/[0.02] transition-all flex flex-col items-center justify-center gap-3"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".glb"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">Clique para Upload</p>
                <p className="text-[10px] text-zinc-500 mt-1">Arraste seu arquivo GLB aqui</p>
              </div>
            </div>
            {avatarUrl && (
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium truncate max-w-[200px]">Modelo Carregado</span>
                </div>
                <button onClick={() => setAvatarUrl(null)} className="text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>

          {/* Section: Script */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Type className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Configuração de Fala</h2>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 ml-1">Script do Avatar</label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none leading-relaxed"
                placeholder="O que o avatar deve dizer?"
              />
            </div>
            <button
              onClick={handleTestSpeech}
              disabled={isSpeaking || isLoading}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSpeaking ? (
                <>
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-emerald-500 animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-1 h-3 bg-emerald-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1 h-3 bg-emerald-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  Testando Voz...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Testar Lip-Sync
                </>
              )}
            </button>
          </section>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20 space-y-3">
          <button
            onClick={() => setShowQR(true)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <QrIcon className="w-5 h-5" />
            Gerar Gatilho QR Code
          </button>
          <button
            onClick={onPreviewAR}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Eye className="w-4 h-4" />
            Visualizar em AR
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 relative bg-[#050505]">
        <div className="absolute top-8 left-8 z-10 flex gap-3">
          <div className="px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Preview em Tempo Real</span>
          </div>
          <button
            onClick={() => store.enterVR()}
            className="px-4 py-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-full flex items-center gap-2 hover:bg-emerald-500/30 transition-colors"
          >
            <Box className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Testar VR</span>
          </button>
        </div>

        <div className="absolute inset-0">
          <ErrorBoundary>
            <Canvas shadows={{ type: PCFShadowMap }} camera={{ position: [0, 1.5, 3], fov: 45 }}>
              <Suspense fallback={
                <Html center>
                  <div className="w-full flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-emerald-500 font-medium whitespace-nowrap bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md">Renderizando Preview...</p>
                    </div>
                  </div>
                </Html>
              }>
                <XR store={store}>
                  <color attach="background" args={['#050505']} />
                  <Stage environment="studio" intensity={0.5} shadows="contact">
                    {avatarUrl ? (
                      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                        <Avatar
                          url={avatarUrl}
                          isSpeaking={isSpeaking}
                          audioLevel={audioLevel}
                        />
                      </Float>
                    ) : (
                      <mesh position={[0, 0, 0]}>
                        <sphereGeometry args={[0.5, 32, 32]} />
                        <meshStandardMaterial color="#222" wireframe />
                      </mesh>
                    )}
                  </Stage>

                  <OrbitControls
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 1.8}
                    enableZoom={true}
                    makeDefault
                  />
                </XR>
              </Suspense>
            </Canvas>
          </ErrorBoundary>
        </div>

        {/* QR Code Modal Overlay */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-white/10 p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl"
              >
                <div className="bg-white p-6 rounded-3xl mb-6 inline-block shadow-inner">
                  <QRCodeSVG value={qrData} size={200} level="H" />
                </div>
                <h3 className="text-xl font-bold mb-2">Gatilho Gerado!</h3>
                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                  Escaneie este código com o aplicativo de visualização para ativar o avatar <strong>{avatarName}</strong>.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowQR(false)}
                    className="py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-bold transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    className="py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Salvar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
