"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useState } from "react";

export function ModelFallback({ src, opacity }: { src: string; opacity: number }) {
  const [webgl] = useState(() => {
    if (typeof document === "undefined") return true;
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  });
  if (!webgl) return <p className="flex h-full items-center justify-center text-center text-[15px] text-text-2">3D unavailable</p>;
  return (
    <Canvas camera={{ position: [1.6, 1.2, 1.8], fov: 40 }} gl={{ alpha: true }}>
      <ambientLight intensity={0.8} />
      <Suspense fallback={null}>
        <Glb src={src} opacity={opacity} />
      </Suspense>
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}

function Glb({ src, opacity }: { src: string; opacity: number }) {
  const gltf = useGLTF(src);
  gltf.scene.traverse((node) => {
    const mesh = node as { material?: { opacity?: number; transparent?: boolean } };
    if (mesh.material && "opacity" in mesh.material) {
      mesh.material.transparent = true;
      mesh.material.opacity = opacity;
    }
  });
  return <primitive object={gltf.scene} scale={0.8} />;
}
