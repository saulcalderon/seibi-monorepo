import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import type { VehicleProfile } from '../lib/vehicleProfile'

const BRAND_PAINT: Record<string, string> = {
  toyota: '#c40000',
  honda: '#f2f0ea',
  nissan: '#1a1a1a',
  volkswagen: '#2b4a7c',
  ford: '#1e3a5f',
  chevrolet: '#c8ccd2',
}

const FALLBACK_PAINTS = ['#c40000', '#111111', '#f2f0ea', '#2b4a7c', '#5c1a1a', '#3d3d3d'] as const

function paintForVehicle(vehicle: VehicleProfile | null): string {
  if (!vehicle) return BRAND_PAINT.toyota
  const brand = vehicle.brand.trim().toLowerCase()
  if (BRAND_PAINT[brand]) return BRAND_PAINT[brand]
  let hash = 0
  const key = `${vehicle.brand}|${vehicle.model}|${vehicle.id}`
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return FALLBACK_PAINTS[hash % FALLBACK_PAINTS.length]
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.48, 0.48, 0.32, 32]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.26, 0.26, 0.34, 20]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.18} metalness={0.95} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.36, 12]} />
        <meshStandardMaterial color="#222" roughness={0.4} metalness={0.7} />
      </mesh>
    </group>
  )
}

function Body({ color }: { color: string }) {
  const mat = useMemo(
    () => ({ color, metalness: 0.78, roughness: 0.18, envMapIntensity: 1.2 }),
    [color],
  )

  return (
    <group>
      {/* Chassis */}
      <mesh position={[0.08, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.55, 0.62, 1.62]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      {/* Hood */}
      <mesh position={[1.15, 0.28, 0]} castShadow>
        <boxGeometry args={[1.15, 0.28, 1.48]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      {/* Trunk */}
      <mesh position={[-1.25, 0.3, 0]} castShadow>
        <boxGeometry args={[0.95, 0.32, 1.5]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      {/* Cabin sides */}
      <mesh position={[-0.15, 0.62, 0]} castShadow>
        <boxGeometry args={[1.7, 0.62, 1.35]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      {/* Roof */}
      <mesh position={[-0.22, 0.95, 0]} castShadow>
        <boxGeometry args={[1.35, 0.12, 1.2]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0.62, 0.72, 0]} rotation={[0, 0, -0.42]} castShadow>
        <boxGeometry args={[0.72, 0.55, 1.22]} />
        <meshStandardMaterial
          color="#b9dff7"
          metalness={0.25}
          roughness={0.06}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Rear glass */}
      <mesh position={[-0.95, 0.72, 0]} rotation={[0, 0, 0.38]}>
        <boxGeometry args={[0.55, 0.5, 1.18]} />
        <meshStandardMaterial
          color="#9eccec"
          metalness={0.25}
          roughness={0.08}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Side windows */}
      <mesh position={[-0.12, 0.7, 0.68]}>
        <boxGeometry args={[1.25, 0.4, 0.05]} />
        <meshStandardMaterial color="#8ebfe0" metalness={0.25} roughness={0.08} transparent opacity={0.55} />
      </mesh>
      <mesh position={[-0.12, 0.7, -0.68]}>
        <boxGeometry args={[1.25, 0.4, 0.05]} />
        <meshStandardMaterial color="#8ebfe0" metalness={0.25} roughness={0.08} transparent opacity={0.55} />
      </mesh>

      {/* Lower skirt */}
      <mesh position={[0.05, -0.22, 0]} castShadow>
        <boxGeometry args={[3.5, 0.22, 1.58]} />
        <meshStandardMaterial color="#0c0c0c" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Front bumper */}
      <mesh position={[1.85, -0.08, 0]} castShadow>
        <boxGeometry args={[0.35, 0.32, 1.48]} />
        <meshStandardMaterial color="#101010" metalness={0.45} roughness={0.4} />
      </mesh>

      {/* Rear bumper */}
      <mesh position={[-1.8, -0.08, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, 1.48]} />
        <meshStandardMaterial color="#101010" metalness={0.45} roughness={0.4} />
      </mesh>

      {/* Headlights */}
      <mesh position={[1.78, 0.18, 0.55]}>
        <boxGeometry args={[0.14, 0.18, 0.36]} />
        <meshStandardMaterial color="#fff8e8" emissive="#ffe9a8" emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[1.78, 0.18, -0.55]}>
        <boxGeometry args={[0.14, 0.18, 0.36]} />
        <meshStandardMaterial color="#fff8e8" emissive="#ffe9a8" emissiveIntensity={2.4} />
      </mesh>

      {/* Taillights */}
      <mesh position={[-1.78, 0.18, 0.55]}>
        <boxGeometry args={[0.12, 0.16, 0.34]} />
        <meshStandardMaterial color="#ff2020" emissive="#c40000" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-1.78, 0.18, -0.55]}>
        <boxGeometry args={[0.12, 0.16, 0.34]} />
        <meshStandardMaterial color="#ff2020" emissive="#c40000" emissiveIntensity={2} />
      </mesh>

      {/* Mirrors */}
      <mesh position={[0.45, 0.55, 0.82]} castShadow>
        <boxGeometry args={[0.22, 0.12, 0.14]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0.45, 0.55, -0.82]} castShadow>
        <boxGeometry args={[0.22, 0.12, 0.14]} />
        <meshStandardMaterial {...mat} />
      </mesh>

      <Wheel position={[1.1, -0.18, 0.82]} />
      <Wheel position={[1.1, -0.18, -0.82]} />
      <Wheel position={[-1.1, -0.18, 0.82]} />
      <Wheel position={[-1.1, -0.18, -0.82]} />
    </group>
  )
}

function StylizedCar({ color }: { color: string }) {
  const group = useRef<Group>(null)

  useFrame(() => {
    if (!group.current) return
    const t = performance.now() * 0.0014
    group.current.position.y = 0.48 + Math.sin(t) * 0.03
    group.current.rotation.z = Math.sin(t * 0.65) * 0.018
  })

  return (
    <group ref={group} position={[0, 0.48, 0]} rotation={[0, -Math.PI * 0.32, 0]}>
      <Body color={color} />
    </group>
  )
}

function GarageScene({ color }: { color: string }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#fff8e0', '#cbb87a', 0.65]} />
      <directionalLight
        position={[4.5, 6.5, 3.5]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00025}
      />
      <directionalLight position={[-3.8, 2.4, -2.8]} intensity={0.95} color="#ffcfa0" />
      <spotLight
        position={[0.2, 5.8, 2]}
        angle={0.5}
        penumbra={0.8}
        intensity={1.5}
        color="#ffffff"
      />
      <pointLight position={[2.6, 0.9, 2]} intensity={0.8} color="#FF4F18" distance={9} />

      <StylizedCar color={color} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[3.8, 64]} />
        <meshStandardMaterial color="#F2F4F7" metalness={0.12} roughness={0.42} />
      </mesh>
      <ContactShadows
        position={[0, 0.015, 0]}
        opacity={0.58}
        scale={10}
        blur={2.8}
        far={4.5}
        color="#2a1808"
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.15}
        minPolarAngle={Math.PI / 2.35}
        maxPolarAngle={Math.PI / 2.02}
        target={[0, 0.55, 0]}
      />
    </>
  )
}

export function GarageCarStage({ vehicle }: { vehicle: VehicleProfile | null }) {
  const color = useMemo(() => paintForVehicle(vehicle), [vehicle])

  if (!vehicle) {
    return <div className="garage-stage garage-stage--empty" aria-hidden="true" />
  }

  return (
    <div className="garage-stage" aria-hidden="true">
      <Canvas
        className="garage-stage-canvas"
        dpr={[1, 1.75]}
        camera={{ position: [4.6, 1.05, 4.0], fov: 26, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        shadows
      >
        <Suspense fallback={null}>
          <GarageScene color={color} />
        </Suspense>
      </Canvas>
    </div>
  )
}
