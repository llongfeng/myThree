import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export interface ThreeSceneOptions {
  fov?: number
  near?: number
  far?: number
  cameraPosition?: [number, number, number]
  background?: THREE.ColorRepresentation
  antialias?: boolean
  shadowMap?: boolean
  toneMapping?: THREE.ToneMapping
  toneMappingExposure?: number
  outputColorSpace?: THREE.ColorSpace
  pixelRatio?: number
}

export interface OrbitControlsOptions {
  enableDamping?: boolean
  dampingFactor?: number
  enableZoom?: boolean
  enableRotate?: boolean
  enablePan?: boolean
  rotateSpeed?: number
  zoomSpeed?: number
  panSpeed?: number
  minDistance?: number
  maxDistance?: number
  maxPolarAngle?: number
  minPolarAngle?: number
  autoRotate?: boolean
}

export interface ThreeContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
}

/**
 * Initialize a standard Three.js scene with camera, renderer, and orbit controls.
 */
export function initThreeScene(
  container: HTMLElement,
  sceneOpts: ThreeSceneOptions = {},
  controlsOpts: OrbitControlsOptions = {}
): ThreeContext {
  const {
    fov = 75,
    near = 0.1,
    far = 1000,
    cameraPosition = [5, 5, 5],
    background,
    antialias = true,
    shadowMap = false,
    toneMapping,
    toneMappingExposure,
    outputColorSpace,
    pixelRatio,
  } = sceneOpts

  const scene = new THREE.Scene()
  if (background !== undefined) {
    scene.background = new THREE.Color(background)
  }

  const width = container.clientWidth || window.innerWidth
  const height = container.clientHeight || window.innerHeight

  const camera = new THREE.PerspectiveCamera(fov, width / height, near, far)
  camera.position.set(...cameraPosition)

  const renderer = new THREE.WebGLRenderer({ antialias })
  renderer.setSize(width, height)
  renderer.setPixelRatio(pixelRatio ?? Math.min(window.devicePixelRatio, 2))
  if (shadowMap) renderer.shadowMap.enabled = true
  if (toneMapping !== undefined) renderer.toneMapping = toneMapping
  if (toneMappingExposure !== undefined) renderer.toneMappingExposure = toneMappingExposure
  if (outputColorSpace !== undefined) renderer.outputColorSpace = outputColorSpace

  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = controlsOpts.enableDamping ?? true
  controls.dampingFactor = controlsOpts.dampingFactor ?? 0.5
  if (controlsOpts.enableZoom !== undefined) controls.enableZoom = controlsOpts.enableZoom
  if (controlsOpts.enableRotate !== undefined) controls.enableRotate = controlsOpts.enableRotate
  if (controlsOpts.enablePan !== undefined) controls.enablePan = controlsOpts.enablePan
  if (controlsOpts.rotateSpeed !== undefined) controls.rotateSpeed = controlsOpts.rotateSpeed
  if (controlsOpts.zoomSpeed !== undefined) controls.zoomSpeed = controlsOpts.zoomSpeed
  if (controlsOpts.panSpeed !== undefined) controls.panSpeed = controlsOpts.panSpeed
  if (controlsOpts.minDistance !== undefined) controls.minDistance = controlsOpts.minDistance
  if (controlsOpts.maxDistance !== undefined) controls.maxDistance = controlsOpts.maxDistance
  if (controlsOpts.maxPolarAngle !== undefined) controls.maxPolarAngle = controlsOpts.maxPolarAngle
  if (controlsOpts.minPolarAngle !== undefined) controls.minPolarAngle = controlsOpts.minPolarAngle
  if (controlsOpts.autoRotate !== undefined) controls.autoRotate = controlsOpts.autoRotate

  return { scene, camera, renderer, controls }
}

/**
 * Add standard lights (ambient + directional) to the scene.
 */
export function addStandardLights(
  scene: THREE.Scene,
  opts: {
    ambientIntensity?: number
    directionalIntensity?: number
    directionalPosition?: [number, number, number]
    castShadow?: boolean
  } = {}
): void {
  const {
    ambientIntensity = 0.5,
    directionalIntensity = 1,
    directionalPosition = [5, 10, 5],
    castShadow = false,
  } = opts

  scene.add(new THREE.AmbientLight(0xffffff, ambientIntensity))

  const dirLight = new THREE.DirectionalLight(0xffffff, directionalIntensity)
  dirLight.position.set(...directionalPosition)
  if (castShadow) dirLight.castShadow = true
  scene.add(dirLight)
}

/**
 * Create a resize handler that updates camera aspect and renderer size.
 * Returns a cleanup function to remove the listener.
 */
export function setupResizeHandler(ctx: ThreeContext): () => void {
  const handler = () => {
    ctx.camera.aspect = window.innerWidth / window.innerHeight
    ctx.camera.updateProjectionMatrix()
    ctx.renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}

/**
 * Start the animation loop. Returns a stop function.
 */
export function startAnimationLoop(
  ctx: ThreeContext,
  onUpdate?: () => void
): { stop: () => void } {
  let animId = 0
  const animate = () => {
    animId = requestAnimationFrame(animate)
    onUpdate?.()
    ctx.controls.update()
    ctx.renderer.render(ctx.scene, ctx.camera)
  }
  animate()
  return { stop: () => cancelAnimationFrame(animId) }
}

/**
 * Convert a mouse/pointer event to normalized device coordinates (-1 to +1).
 */
export function screenToNDC(event: MouseEvent): THREE.Vector2 {
  return new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  )
}

/**
 * Perform a raycast from the camera through NDC coordinates against a set of objects.
 */
export function raycastFromCamera(
  camera: THREE.Camera,
  ndc: THREE.Vector2,
  objects: THREE.Object3D[],
  recursive = true
): THREE.Intersection[] {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(ndc, camera)
  return raycaster.intersectObjects(objects, recursive)
}

/**
 * Load a GLTF/GLB model and add it to the scene. Returns a promise.
 */
export function loadGLTFModel(
  path: string,
  scene?: THREE.Scene
): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      path,
      (gltf) => {
        if (scene) scene.add(gltf.scene)
        resolve(gltf.scene)
      },
      undefined,
      reject
    )
  })
}
