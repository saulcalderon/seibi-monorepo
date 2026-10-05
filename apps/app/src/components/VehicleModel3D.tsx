import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, OrbitControls, useGLTF } from '@react-three/drei'

// Live 3D Model render. Lazy-loaded chunk: three.js only ships to screens
// with a hero (ADR-0008).

function Model({ url, onReady, margin }: { url: string; onReady: () => void; margin: number }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => scene.clone(true), [scene])
  useEffect(() => {
    onReady()
  }, [clone, onReady])
  return (
    <Bounds fit clip observe margin={margin}>
      <Center>
        <primitive object={clone} />
      </Center>
    </Bounds>
  )
}

export default function VehicleModel3D({
  url,
  onReady,
  onError,
  margin = 0.78,
  cameraPosition = [2.4, 0.95, 3.8],
}: {
  url: string
  onReady: () => void
  onError: () => void
  /** Camera distance multiplier. Higher fits more of the model in frame. */
  margin?: number
  /** Starting viewpoint. Bounds keeps this angle and only adjusts distance. */
  cameraPosition?: [number, number, number]
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  // Stop rendering frames when the hero scrolls out of view.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={hostRef} className="absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: cameraPosition, fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', onError)
        }}
      >
        <hemisphereLight args={['#ffffff', '#6b6f78', 1.1]} />
        <directionalLight position={[-6, 8, -4]} intensity={1.7} />
        <directionalLight position={[5, 3, 6]} intensity={0.45} />
        <Suspense fallback={null}>
          <ErrorBoundary onError={onError}>
            <Model url={url} onReady={onReady} margin={margin} />
          </ErrorBoundary>
          <ContactShadows position={[0, -0.9, 0]} opacity={0.35} scale={8} blur={2.6} far={2} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI / 3.4}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
    </div>
  )
}


class ErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
