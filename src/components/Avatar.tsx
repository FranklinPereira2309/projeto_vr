import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

interface AvatarProps {
  url: string;
  isSpeaking: boolean;
  audioLevel: number;
}

export function Avatar({ url, isSpeaking, audioLevel }: AvatarProps) {
  const { scene: originalScene, animations } = useGLTF(url);
  const scene = useMemo(() => SkeletonUtils.clone(originalScene), [originalScene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  const [mouthTarget, setMouthTarget] = useState<number | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Optimize materials for premium look
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.envMapIntensity = 1.2;
          if (mat.map) mat.map.anisotropy = 16;
        }

        if (mesh.morphTargetDictionary) {
          const dict = mesh.morphTargetDictionary;
          // Priority list of morph targets that can simulate speech
          const candidates = ['mouthOpen', 'jawOpen', 'mouth_open', 'Surprise', 'O', 'A'];
          const found = candidates.find(k => k in dict);
          if (found) setMouthTarget(dict[found]);
        }
      }
    });

    // Play initial appearance animation
    scene.scale.set(0, 0, 0);
    let scale = 0;
    let animationFrameId: number;
    const animateEntry = () => {
      if (scale < 1.5) {
        scale += 0.05;
        scene.scale.set(scale, scale, scale);
        animationFrameId = requestAnimationFrame(animateEntry);
      }
    };
    animateEntry();

    // Play idle animation if available
    if (actions && actions['Idle']) {
      actions['Idle'].reset().fadeIn(0.5).play();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [scene, actions]);

  useFrame((state, delta) => {
    if (isSpeaking && mouthTarget !== null) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetInfluences) {
          const mesh = child as THREE.Mesh;
          const dict = mesh.morphTargetDictionary;
          if (dict) {
            const candidates = ['mouthOpen', 'jawOpen', 'mouth_open', 'Surprise', 'O', 'A'];
            const targetKey = candidates.find(k => k in dict);
            if (targetKey) {
              const idx = dict[targetKey];
              const targetInfluence = audioLevel * 1.5 + Math.sin(performance.now() * 0.02) * 0.1;
              mesh.morphTargetInfluences![idx] = THREE.MathUtils.lerp(
                mesh.morphTargetInfluences![idx],
                Math.max(0, Math.min(1, targetInfluence)),
                0.3
              );
            }
          }
        }
      });
    } else {
      // Close mouth when not speaking
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetInfluences) {
          const mesh = child as THREE.Mesh;
          const dict = mesh.morphTargetDictionary;
          if (dict) {
            const candidates = ['mouthOpen', 'jawOpen', 'mouth_open', 'Surprise', 'O', 'A'];
            const targetKey = candidates.find(k => k in dict);
            if (targetKey) {
              const idx = dict[targetKey];
              mesh.morphTargetInfluences![idx] = THREE.MathUtils.lerp(
                mesh.morphTargetInfluences![idx],
                0,
                0.1
              );
            }
          }
        }
      });
    }
  });

  return <primitive ref={group} object={scene} scale={1.5} position={[0, -1, 0]} />;
}
