import React, { useState } from 'react';
import { ARView } from './components/ARView';
import { EditorView } from './components/EditorView';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [mode, setMode] = useState<'editor' | 'viewer'>('editor');

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        {mode === 'editor' ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-screen"
          >
            <EditorView onPreviewAR={() => setMode('viewer')} />
          </motion.div>
        ) : (
          <motion.div
            key="viewer"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-screen relative"
          >
            <ARView onBackToEditor={() => setMode('editor')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
