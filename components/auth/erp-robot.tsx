"use client";

import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LERP_FACTOR = 0.08;
const MAX_HEAD_ROTATION = 0.4;
const MAX_BODY_TILT = 0.09;
const BOB_AMPLITUDE = 0.15;
const BOB_SPEED = 1.2;
const SWAY_AMPLITUDE = 0.05;
const SWAY_SPEED = 0.8;

/* ------------------------------------------------------------------ */
/*  Color palette (matching design tokens)                             */
/* ------------------------------------------------------------------ */

const COLORS = {
  body: "#4338ca",
  bodyDark: "#3730a3",
  accent: "#6d28d9",
  eye: "#01AF7B",
  led1: "#01AF7B",
  led2: "#f59e0b",
  led3: "#3b82f6",
  antenna: "#7c3aed",
};

/* ------------------------------------------------------------------ */
/*  Robot sub-components                                               */
/* ------------------------------------------------------------------ */

function RobotEye({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.5);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color={COLORS.eye}
        emissive={COLORS.eye}
        emissiveIntensity={0.8}
      />
    </mesh>
  );
}

function ChestLed({
  position,
  color,
  delay,
}: {
  position: [number, number, number];
  color: string;
  delay: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity =
      0.3 + 0.7 * Math.sin(clock.elapsedTime * 2.0 + delay);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
    </mesh>
  );
}

function Antenna() {
  const tipRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!tipRef.current) return;
    tipRef.current.position.x = Math.sin(clock.elapsedTime * 3) * 0.05;
    tipRef.current.position.z = Math.cos(clock.elapsedTime * 2.5) * 0.03;
  });

  return (
    <group position={[0, 0.65, 0]}>
      <mesh>
        <cylinderGeometry args={[0.025, 0.03, 0.3, 8]} />
        <meshStandardMaterial color={COLORS.antenna} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={tipRef} position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          color={COLORS.eye}
          emissive={COLORS.eye}
          emissiveIntensity={0.6}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function RobotArm({
  side,
  waveOffset,
}: {
  side: "left" | "right";
  waveOffset: number;
}) {
  const xSign = side === "left" ? -1 : 1;
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z =
      xSign * 0.3 + Math.sin(clock.elapsedTime * 1.5 + waveOffset) * 0.1;
  });

  return (
    <group ref={ref} position={[xSign * 0.55, 0.1, 0]}>
      <mesh>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color={COLORS.bodyDark} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[xSign * 0.15, -0.15, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.3, 8]} />
        <meshStandardMaterial color={COLORS.body} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Main robot group — handles cursor tracking                         */
/* ------------------------------------------------------------------ */

function RobotModel({
  mouseTarget,
}: {
  mouseTarget: React.RefObject<{ x: number; y: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const currentLook = useRef({ x: 0, y: 0 });

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const target = mouseTarget.current ?? { x: 0, y: 0 };

    currentLook.current.x += (target.x - currentLook.current.x) * LERP_FACTOR;
    currentLook.current.y += (target.y - currentLook.current.y) * LERP_FACTOR;

    if (groupRef.current) {
      groupRef.current.position.y =
        Math.sin(t * BOB_SPEED) * BOB_AMPLITUDE;
      groupRef.current.rotation.z =
        Math.sin(t * SWAY_SPEED) * SWAY_AMPLITUDE +
        currentLook.current.x * MAX_BODY_TILT;
    }

    if (headRef.current) {
      headRef.current.rotation.y = currentLook.current.x * MAX_HEAD_ROTATION;
      headRef.current.rotation.x = -currentLook.current.y * MAX_HEAD_ROTATION * 0.6;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={headRef} position={[0, 0.85, 0]}>
        <mesh>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshStandardMaterial
            color={COLORS.body}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        <RobotEye position={[-0.15, 0.05, 0.38]} />
        <RobotEye position={[0.15, 0.05, 0.38]} />
        <Antenna />
      </group>

      <group position={[0, -0.05, 0]}>
        <mesh>
          <capsuleGeometry args={[0.35, 0.5, 8, 16]} />
          <meshStandardMaterial
            color={COLORS.body}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        <ChestLed position={[-0.12, 0.1, 0.34]} color={COLORS.led1} delay={0} />
        <ChestLed position={[0, 0.1, 0.35]} color={COLORS.led2} delay={2.0} />
        <ChestLed position={[0.12, 0.1, 0.34]} color={COLORS.led3} delay={4.0} />
      </group>

      <RobotArm side="left" waveOffset={0} />
      <RobotArm side="right" waveOffset={Math.PI} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene wrapper with lighting                                        */
/* ------------------------------------------------------------------ */

function RobotScene({
  mouseTarget,
}: {
  mouseTarget: React.RefObject<{ x: number; y: number }>;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />

      <RobotModel mouseTarget={mouseTarget} />

      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.4}
        scale={4}
        blur={2.5}
      />
      <Environment preset="city" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                   */
/* ------------------------------------------------------------------ */

interface ErpRobotProps {
  className?: string;
}

function ErpRobot({ className = "" }: ErpRobotProps) {
  const mouseTarget = useRef({ x: 0, y: 0 });

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseTarget.current = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
      };
    },
    [],
  );

  const handlePointerLeave = useCallback(() => {
    mouseTarget.current = { x: 0, y: 0 };
  }, []);

  return (
    <div
      data-testid="erp-robot-container"
      aria-hidden="true"
      className={`h-full w-full ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <RobotScene mouseTarget={mouseTarget} />
      </Canvas>
    </div>
  );
}

export { ErpRobot, type ErpRobotProps };
