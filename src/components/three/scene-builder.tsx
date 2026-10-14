"use client";

import { useProgress } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { Skeleton } from "@/components/ui/skeleton";
import type { SceneElement, SceneTransform } from "@/server/reconstruct-data";
import { Suspense, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

const tintHex = { high: "#149020", medium: "#c8981b", low: "#e22442" };

export function SceneBuilder({
  elements,
  selectedId,
  onSelect,
  mode,
  colours,
  thenNow,
  onTransform,
}: {
  elements: SceneElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  mode: "translate" | "rotate" | "scale" | "orbit";
  colours: boolean;
  thenNow: "then" | "now" | "compare";
  onTransform: (id: string, transform: SceneTransform) => void;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const opacityRef = useRef(1);
  const { active } = useProgress();
  const parts = elements.filter((element) => element.kind !== "group" && element.visible);
  const remains = elements.find((element) => element.kind === "group" && element.modelUrl);

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-card bg-[#ece9e3]">
      {active ? <Skeleton className="absolute inset-4 z-10" /> : null}
      <Canvas
        camera={{ position: [5, 3.2, 6.5], fov: 40 }}
        onCreated={({ camera }) => {
          cameraRef.current = camera as THREE.PerspectiveCamera;
        }}
      >
        <color attach="background" args={["#ece9e3"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 8, 3]} intensity={1.1} />
        <gridHelper args={[12, 24, "#d5d2cb", "#e4e0d8"]} />
        <Suspense fallback={null}>
          <OpacityDriver target={thenNow === "then" ? 0.12 : thenNow === "compare" ? 0.45 : 1} opacityRef={opacityRef} />
          {remains?.modelUrl ? (
            <Model url={remains.modelUrl} tint={null} opacity={0.85} selected={false} dashed={false} opacityRef={opacityRef} remains />
          ) : null}
          {parts.map((element, index) => (
            <ElementMesh
              key={element.id}
              element={element}
              index={index}
              count={parts.length}
              selected={element.id === selectedId}
              colours={colours}
              mode={mode}
              opacityRef={opacityRef}
              onSelect={() => onSelect(element.id)}
              onTransform={(transform) => onTransform(element.id, transform)}
            />
          ))}
        </Suspense>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
}

function OpacityDriver({
  target,
  opacityRef,
}: {
  target: number;
  opacityRef: MutableRefObject<number>;
}) {
  useFrame(() => {
    opacityRef.current += (target - opacityRef.current) * 0.08;
  });
  return null;
}

function ElementMesh({
  element,
  index,
  count,
  selected,
  colours,
  mode,
  opacityRef,
  onSelect,
  onTransform,
}: {
  element: SceneElement;
  index: number;
  count: number;
  selected: boolean;
  colours: boolean;
  mode: "translate" | "rotate" | "scale" | "orbit";
  opacityRef: MutableRefObject<number>;
  onSelect: () => void;
  onTransform: (transform: SceneTransform) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const fallback: [number, number, number] = [(index - (count - 1) / 2) * 1.6, 0.2, 0];
  const position = element.transform?.position ?? fallback;
  const rotation = element.transform?.rotation ?? [0, 0, 0];
  const scale = element.transform?.scale ?? [1, 1, 1];
  const tint = colours ? tintHex[element.confidence] : null;

  function release() {
    const current = group.current;
    if (!current) return;
    onTransform({
      position: [current.position.x, current.position.y, current.position.z],
      rotation: [current.rotation.x, current.rotation.y, current.rotation.z],
      scale: [current.scale.x, current.scale.y, current.scale.z],
    });
  }

  const body = (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {element.modelUrl ? (
        <Model url={element.modelUrl} tint={tint} opacity={selected ? 0.7 : 1} selected={selected} dashed={colours} opacityRef={opacityRef} />
      ) : (
        <mesh>
          <boxGeometry args={[0.7, 0.35, 0.7]} />
          <meshStandardMaterial
            color={tint ?? "#c8c2b4"}
            transparent
            opacity={selected ? 0.7 : 1}
            emissive={selected ? tint ?? "#111111" : "#000000"}
            emissiveIntensity={selected ? 0.35 : 0}
          />
        </mesh>
      )}
    </group>
  );

  if (!selected || mode === "orbit") return body;
  return (
    <TransformControls mode={mode} onMouseUp={release}>
      {body}
    </TransformControls>
  );
}

function Model({
  url,
  tint,
  opacity,
  selected,
  dashed,
  opacityRef,
  remains = false,
}: {
  url: string;
  tint: string | null;
  opacity: number;
  selected: boolean;
  dashed: boolean;
  opacityRef: MutableRefObject<number>;
  remains?: boolean;
}) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const source = child.material as THREE.MeshStandardMaterial;
      const material = source.clone();
      material.transparent = true;
      if (tint) material.color = new THREE.Color(tint);
      material.emissive = new THREE.Color(selected && tint ? tint : "#000000");
      material.emissiveIntensity = selected ? 0.35 : 0;
      child.material = material;
      child.children.filter((item) => item.userData.edge).forEach((item) => child.remove(item));
      if (dashed && child.geometry) {
        const line = new THREE.LineSegments(
          new THREE.EdgesGeometry(child.geometry, 20),
          new THREE.LineDashedMaterial({ color: tint ?? "#111111", dashSize: 0.06, gapSize: 0.04 }),
        );
        line.computeLineDistances();
        line.userData.edge = true;
        child.add(line);
      }
    });
  }, [clone, dashed, selected, tint]);

  useFrame(() => {
    const amount = remains ? 0.9 : opacity * opacityRef.current;
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        material.opacity = amount;
      }
    });
  });

  return <primitive object={clone} />;
}
