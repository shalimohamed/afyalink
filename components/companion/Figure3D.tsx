"use client";

// A cartoon 3D figure (doctor or patient) built from simple shapes with
// Three.js, through React Three Fiber (which lets us write the 3D scene as
// React components). No downloaded 3D models, so no licences and a small file.
//
// It breathes, blinks, turns its head towards the mouse/finger, and waves when
// `waveKey` changes (e.g. when tapped).

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type FigureVariant = "doctor" | "patient";

type Palette = { skin: string; hair: string; top: string; inner: string; trousers: string };

const PALETTES: Record<FigureVariant, Palette> = {
  doctor: { skin: "#8D5A3B", hair: "#1E1410", top: "#F7F9F8", inner: "#1F8F72", trousers: "#1F6E5A" },
  patient: { skin: "#6B4329", hair: "#18110D", top: "#F4C542", inner: "#F4C542", trousers: "#2F4858" },
};

// Mouse/finger position over the whole window, from -1 to 1 on each axis.
const pointer = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );
}

function Toon({ color }: { color: string }) {
  return <meshToonMaterial color={color} />;
}

function Character({ variant, waveKey, calm }: { variant: FigureVariant; waveKey: number; calm: boolean }) {
  const c = PALETTES[variant];
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const waveArm = useRef<THREE.Group>(null);
  const waveStart = useRef(-10);
  const nextBlink = useRef(2);

  // Start a wave whenever waveKey changes (first render included).
  useEffect(() => {
    waveStart.current = -1; // set to the clock time on the next frame
  }, [waveKey]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (waveStart.current === -1) waveStart.current = t;

    // Breathing: a gentle bob and squash.
    if (root.current && !calm) {
      root.current.position.y = Math.sin(t * 2) * 0.03;
      root.current.scale.y = 1 + Math.sin(t * 2) * 0.008;
    }

    // Head follows the pointer, smoothly.
    if (head.current) {
      const targetY = calm ? 0 : pointer.x * 0.55;
      const targetX = calm ? 0 : pointer.y * 0.3;
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, targetY, 6, delta);
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, targetX, 6, delta);
    }

    // Blink: every 2.5–5.5 s the eyes close for 0.15 s.
    if (eyes.current) {
      if (t > nextBlink.current + 0.15) nextBlink.current = t + 2.5 + Math.random() * 3;
      const blinking = !calm && t >= nextBlink.current && t <= nextBlink.current + 0.15;
      eyes.current.scale.y = blinking ? 0.1 : 1;
    }

    // Wave: raise the arm and swing it for ~1.8 s.
    if (waveArm.current) {
      const w = t - waveStart.current;
      const waving = w >= 0 && w < 1.8 && !calm;
      const raise = waving ? Math.min(1, w * 5, (1.8 - w) * 5) : 0;
      const swing = waving ? Math.sin(w * 14) * 0.35 * raise : 0;
      waveArm.current.rotation.z = THREE.MathUtils.lerp(0.25, 2.5, raise) + swing;
    }
  });

  return (
    <group ref={root}>
      {/* Legs */}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, -1.05, 0]}>
          <capsuleGeometry args={[0.13, 0.45, 6, 16]} />
          <Toon color={c.trousers} />
        </mesh>
      ))}
      {/* Shoes */}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, -1.38, 0.06]} scale={[1, 0.6, 1.4]}>
          <sphereGeometry args={[0.15, 16, 12]} />
          <Toon color="#2B2B2B" />
        </mesh>
      ))}

      {/* Body: coat (doctor) or T-shirt (patient) */}
      <mesh position={[0, -0.35, 0]}>
        <capsuleGeometry args={[0.42, 0.55, 8, 24]} />
        <Toon color={c.top} />
      </mesh>
      {/* Scrubs showing at the neck (doctor) */}
      {variant === "doctor" && (
        <mesh position={[0, -0.05, 0.36]} rotation={[0.25, 0, Math.PI / 4]}>
          <boxGeometry args={[0.26, 0.26, 0.04]} />
          <Toon color={c.inner} />
        </mesh>
      )}
      {/* Stethoscope (doctor) */}
      {variant === "doctor" && (
        <group>
          <mesh position={[0, -0.12, 0.08]} rotation={[Math.PI / 2 - 0.35, 0, 0]}>
            <torusGeometry args={[0.36, 0.025, 8, 32, Math.PI]} />
            <Toon color="#2C3E50" />
          </mesh>
          <mesh position={[0.22, -0.48, 0.4]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 20]} />
            <meshStandardMaterial color="#B0BEC5" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0.2, -0.3, 0.38]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.32, 8]} />
            <Toon color="#2C3E50" />
          </mesh>
        </group>
      )}
      {/* Coat pocket with a pen (doctor) / heart print (patient) */}
      {variant === "doctor" ? (
        <mesh position={[-0.2, -0.4, 0.39]} rotation={[0, -0.2, 0]}>
          <boxGeometry args={[0.16, 0.12, 0.02]} />
          <Toon color="#E3E9E7" />
        </mesh>
      ) : (
        <mesh position={[0, -0.3, 0.41]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.12, 0.12, 0.02]} />
          <Toon color="#E5506A" />
        </mesh>
      )}

      {/* Left arm (resting; the patient holds a phone) */}
      <group position={[-0.47, -0.12, 0]} rotation={[0, 0, -0.25]}>
        <mesh position={[0, -0.32, 0]}>
          <capsuleGeometry args={[0.11, 0.42, 6, 16]} />
          <Toon color={c.top} />
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <Toon color={c.skin} />
        </mesh>
        {variant === "patient" && (
          <mesh position={[0.06, -0.66, 0.1]} rotation={[0.3, 0, 0.25]}>
            <boxGeometry args={[0.12, 0.22, 0.03]} />
            <meshStandardMaterial color="#1D1D1F" metalness={0.4} roughness={0.3} />
          </mesh>
        )}
      </group>

      {/* Right arm: the waving one. The group is the shoulder joint. */}
      <group ref={waveArm} position={[0.47, -0.12, 0]} rotation={[0, 0, 0.25]}>
        <mesh position={[0, -0.32, 0]}>
          <capsuleGeometry args={[0.11, 0.42, 6, 16]} />
          <Toon color={c.top} />
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <Toon color={c.skin} />
        </mesh>
      </group>

      {/* Head */}
      <group ref={head} position={[0, 0.48, 0]}>
        <mesh>
          <sphereGeometry args={[0.46, 32, 24]} />
          <Toon color={c.skin} />
        </mesh>
        {/* Ears */}
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, -0.02, 0]} scale={[0.5, 1, 0.8]}>
            <sphereGeometry args={[0.1, 12, 10]} />
            <Toon color={c.skin} />
          </mesh>
        ))}
        {/* Hair: a cap on top, plus a bun (doctor) or short curls (patient) */}
        <mesh position={[0, 0.1, -0.03]} scale={[1.04, 0.85, 1.02]}>
          <sphereGeometry args={[0.46, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
          <Toon color={c.hair} />
        </mesh>
        {variant === "doctor" ? (
          <mesh position={[0, 0.42, -0.22]}>
            <sphereGeometry args={[0.17, 20, 16]} />
            <Toon color={c.hair} />
          </mesh>
        ) : (
          [-0.25, 0, 0.25].map((x) => (
            <mesh key={x} position={[x, 0.38, 0.05]}>
              <sphereGeometry args={[0.12, 14, 12]} />
              <Toon color={c.hair} />
            </mesh>
          ))
        )}
        {/* Eyes (this group squashes when blinking) */}
        <group ref={eyes} position={[0, 0.02, 0.4]}>
          {[-0.15, 0.15].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh scale={[1, 1.25, 0.6]}>
                <sphereGeometry args={[0.065, 16, 12]} />
                <meshBasicMaterial color="#141414" />
              </mesh>
              <mesh position={[0.02, 0.03, 0.04]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            </group>
          ))}
        </group>
        {/* Smile */}
        <mesh position={[0, -0.13, 0.41]} rotation={[0.2, 0, Math.PI]}>
          <torusGeometry args={[0.1, 0.022, 8, 24, Math.PI]} />
          <meshBasicMaterial color="#3A1F14" />
        </mesh>
        {/* Rosy cheeks */}
        {[-0.27, 0.27].map((x) => (
          <mesh key={x} position={[x, -0.08, 0.36]}>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshBasicMaterial color="#E5506A" transparent opacity={0.35} />
          </mesh>
        ))}
      </group>

      {/* Soft shadow on the floor */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

export default function Figure3D({ variant, waveKey, calm }: { variant: FigureVariant; waveKey: number; calm: boolean }) {
  // Sharper on high-resolution screens, but capped so phones stay smooth.
  const dpr = useMemo<[number, number]>(() => [1, 2], []);
  return (
    <Canvas
      dpr={dpr}
      // Aimed at the middle of the figure (shoes at y≈-1.5, hair at y≈1) with a little margin.
      camera={{ position: [0, -0.22, 4.7], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden="true"
      fallback={<div className="figure-fallback">{variant === "doctor" ? "👩🏾‍⚕️" : "🧑🏾"}</div>}
    >
      <hemisphereLight args={["#ffffff", "#b9d6cc", 1.6]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.8} />
      <Character variant={variant} waveKey={waveKey} calm={calm} />
    </Canvas>
  );
}
