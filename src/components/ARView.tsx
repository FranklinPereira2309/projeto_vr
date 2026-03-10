import React, { useState, useEffect, useRef, Suspense } from 'react';
import { PCFShadowMap } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Loader, Float, Html } from '@react-three/drei';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';
import { generateSpeech } from '../services/tts';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { XR, createXRStore } from '@react-three/xr';
import { Camera, QrCode, MessageSquare, User, Volume2, VolumeX, AlertTriangle, Settings, Box } from 'lucide-react';

const store = createXRStore();

const AVATAR_CONFIGS: Record<string, { name: string; modelUrl: string; text: string }> = {
  "avatar-1": {
    name: "Franklin Animado",
    modelUrl: "/models/franklin_animado.glb",
    text: "Olá! Eu sou o Gabriel. Como os serviços de avatares humanos estão instáveis, estou utilizando este modelo técnico para demonstrar a sincronia labial e a interação em tempo real."
  },
  "avatar-2": {
    name: "Franklin Normal",
    modelUrl: "/models/franklin_normal.glb",
    text: "Oi! Eu sou a Sofia. Este modelo possui os controles faciais necessários para mostrar como a inteligência artificial pode dar vida a personagens virtuais."
  }
};

export function ARView({ onBackToEditor }: { onBackToEditor: () => void }) {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // If decodedText is a valid key in our config, or a URL that contains the key
          const key = Object.keys(AVATAR_CONFIGS).find(k => decodedText.includes(k));
          if (key) {
            setScannedData(key);
            setIsScanning(false);
            scanner.clear();
          } else {
            // Fallback for any QR code just to show it works
            setScannedData("avatar-1");
            setIsScanning(false);
            scanner.clear();
          }
        },
        (errorMessage) => {
          // console.log(errorMessage);
        }
      );

      return () => {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      };
    }
  }, [isScanning]);

  const handleSpeak = async () => {
    if (!scannedData || isSpeaking) return;

    const config = AVATAR_CONFIGS[scannedData];
    const base64Audio = await generateSpeech(config.text);

    if (base64Audio) {
      const audioBlob = await fetch(`data:audio/wav;base64,${base64Audio}`).then(r => r.blob());
      const audioUrl = URL.createObjectURL(audioBlob);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioUrl;

      // Setup Audio Analysis for Lip Sync
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

      // Analysis loop
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!isSpeaking) return;
        analyserRef.current!.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(average / 128); // Normalize to 0-1
        requestAnimationFrame(updateLevel);
      };

      updateLevel();

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        setAudioLevel(0);
      };
    } else {
      setError("Falha ao gerar áudio. Verifique sua chave de API.");
    }
  };

  const currentConfig = scannedData ? AVATAR_CONFIGS[scannedData] : null;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      {/* Background Camera Simulation / Real Camera for QR */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black"
          >
            <div className="text-center mb-8">
              <QrCode className="w-16 h-16 mx-auto mb-4 text-emerald-400 animate-pulse" />
              <h2 className="text-2xl font-bold tracking-tight">Escaneie o QR Code</h2>
              <p className="text-zinc-400 mt-2">Aponte a câmera para o gatilho do avatar</p>
            </div>
            <div id="reader" className="w-full max-w-md rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/10"></div>
            <button
              onClick={() => { setScannedData("avatar-1"); setIsScanning(false); }}
              className="mt-8 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-medium transition-colors"
            >
              Pular para Demo (Sem QR)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR Scene Rendering */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-6">
            <div className="text-center max-w-sm">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Erro ao Carregar Avatar</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Não foi possível carregar o modelo 3D. Isso pode ser um problema temporário com o servidor de avatares.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-medium transition-colors"
              >
                Recarregar Aplicativo
              </button>
            </div>
          </div>
        }>
          <Canvas shadows={{ type: PCFShadowMap }} camera={{ position: [0, 1.5, 4], fov: 45 }}>
            <Suspense fallback={
              <Html center>
                <div className="text-center w-full min-w-[200px] pointer-events-none">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-emerald-500 font-medium bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md whitespace-nowrap">Carregando Avatar 3D...</p>
                </div>
              </Html>
            }>
              <XR store={store}>
                <ambientLight intensity={0.2} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />
                <Environment preset="city" blur={0.8} />

                {currentConfig && (
                  <Float
                    speed={1.5}
                    rotationIntensity={0.5}
                    floatIntensity={0.5}
                    floatingRange={[0, 0.2]}
                  >
                    <Avatar
                      url={currentConfig.modelUrl}
                      isSpeaking={isSpeaking}
                      audioLevel={audioLevel}
                    />
                  </Float>
                )}

                <ContactShadows
                  position={[0, -1, 0]}
                  opacity={0.5}
                  scale={10}
                  blur={2.5}
                  far={4}
                  resolution={256}
                  color="#000000"
                />
                <OrbitControls minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} enableZoom={true} />
              </XR>
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </div>

      {/* UI Overlay */}
      <AnimatePresence>
        {!isScanning && currentConfig && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-0 left-0 right-0 p-6 z-10"
          >
            <div className="max-w-xl mx-auto bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <User className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{currentConfig.name}</h3>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest">Avatar Ativo</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsScanning(true)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-black/40 rounded-2xl p-4 mb-6 border border-white/5">
                <div className="flex gap-3">
                  <MessageSquare className="w-5 h-5 text-zinc-500 shrink-0 mt-1" />
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {currentConfig.text}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSpeak}
                disabled={isSpeaking}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${isSpeaking
                  ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed border border-emerald-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                  }`}
              >
                {isSpeaking ? (
                  <>
                    <Volume2 className="w-5 h-5 animate-bounce" />
                    Falando...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    Iniciar Fala
                  </>
                )}
              </button>

              {error && (
                <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicators */}
      <div className="absolute top-6 left-6 z-10 flex gap-4">
        <button
          onClick={onBackToEditor}
          className="px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <Settings className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium uppercase tracking-widest">Editor</span>
        </button>
        <button
          onClick={() => store.enterVR()}
          className="px-4 py-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-full flex items-center gap-2 hover:bg-emerald-500/30 transition-colors"
        >
          <Box className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Entrar em VR</span>
        </button>
        {!isScanning && (
          <div className="px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-widest">AR Ativo</span>
          </div>
        )}
      </div>
    </div>
  );
}
