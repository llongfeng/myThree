import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as THREE from 'three'

const mockRendererInstance = {
  domElement: document.createElement('canvas'),
  toneMapping: 0,
  toneMappingExposure: 1,
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  render: vi.fn()
}
mockRendererInstance.domElement.style.display = ''

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>()
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = mockRendererInstance.domElement
      toneMapping = mockRendererInstance.toneMapping
      toneMappingExposure = mockRendererInstance.toneMappingExposure
      setSize = mockRendererInstance.setSize
      setPixelRatio = mockRendererInstance.setPixelRatio
      render = mockRendererInstance.render
    }
  }
})

vi.mock('three/examples/jsm/controls/OrbitControls', () => {
  return {
    OrbitControls: class {
      enableDamping = false
      dampingFactor = 0
      autoRotate = false
      target = { set: vi.fn() }
      update = vi.fn()
    }
  }
})

vi.mock('../../model/loadManager', () => ({
  loadManager: vi.fn()
}))

import { ThreeBase } from '../../utils/three'
import { loadManager } from '../../model/loadManager'

function createContainer(): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: 800 })
  Object.defineProperty(el, 'clientHeight', { value: 600 })
  return el
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('requestAnimationFrame', vi.fn())

  // ThreeBase constructor calls canvas.getContext('webgl2'|'webgl') before creating WebGLRenderer;
  // jsdom doesn't support WebGL, so stub it to return a truthy object.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as any)
})

describe('ThreeBase', () => {
  it('should create scene, camera, renderer, and controls', () => {
    const container = createContainer()
    const base = new ThreeBase(container)

    expect(base.scene).toBeInstanceOf(THREE.Scene)
    expect(base.camera).toBeInstanceOf(THREE.PerspectiveCamera)
    expect(base.renderer).toBeDefined()
    expect(base.controls).toBeDefined()
  })

  it('should set scene background to grey', () => {
    const container = createContainer()
    const base = new ThreeBase(container)

    expect(base.scene.background).toBeInstanceOf(THREE.Color)
    const bg = base.scene.background as THREE.Color
    expect(bg.getHex()).toBe(0x808080)
  })

  it('should position camera at z=12', () => {
    const container = createContainer()
    const base = new ThreeBase(container)
    expect(base.camera.position.z).toBe(12)
  })

  it('should append renderer domElement to container', () => {
    const container = createContainer()
    new ThreeBase(container)
    expect(container.children.length).toBeGreaterThan(0)
  })

  it('should add lights to scene (AmbientLight, DirectionalLight, HemisphereLight)', () => {
    const container = createContainer()
    const base = new ThreeBase(container)
    const children = base.scene.children

    const hasAmbient = children.some((c) => c instanceof THREE.AmbientLight)
    const hasDirectional = children.some((c) => c instanceof THREE.DirectionalLight)
    const hasHemisphere = children.some((c) => c instanceof THREE.HemisphereLight)

    expect(hasAmbient).toBe(true)
    expect(hasDirectional).toBe(true)
    expect(hasHemisphere).toBe(true)
  })

  it('addCube should add a mesh to the scene', () => {
    const container = createContainer()
    const base = new ThreeBase(container)
    const countBefore = base.scene.children.length

    base.addCube()

    expect(base.mesh).toBeInstanceOf(THREE.Mesh)
    expect(base.scene.children.length).toBe(countBefore + 1)
  })

  it('addEdges should add a LineSegments child to the mesh', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshBasicMaterial()
    const mesh = new THREE.Mesh(geo, mat)

    const container = createContainer()
    const base = new ThreeBase(container)
    base.addEdges(mesh, new THREE.Color(0xff0000))

    const lineChild = mesh.children.find((c) => c instanceof THREE.LineSegments)
    expect(lineChild).toBeDefined()
  })

  it('addModel should call loadManager with the given path', () => {
    const container = createContainer()
    const base = new ThreeBase(container)

    base.addModel('/test.glb')

    expect(loadManager).toHaveBeenCalledWith(['/test.glb'], expect.any(Function))
  })

  it('addModel callback should add model to scene and invoke onLoad', () => {
    const container = createContainer()
    const base = new ThreeBase(container)
    const onLoad = vi.fn()

    base.addModel('/test.glb', onLoad)

    const loadCb = vi.mocked(loadManager).mock.calls[0][1]
    const fakeModel = new THREE.Group()
    const loadedModel = { model: fakeModel, url: '/test.glb' }
    loadCb([loadedModel])

    expect(onLoad).toHaveBeenCalledWith(loadedModel)
  })

  it('addModel callback with empty models should not invoke onLoad', () => {
    const container = createContainer()
    const base = new ThreeBase(container)
    const onLoad = vi.fn()

    base.addModel('/test.glb', onLoad)

    const loadCb = vi.mocked(loadManager).mock.calls[0][1]
    loadCb([])

    expect(onLoad).not.toHaveBeenCalled()
  })

  it('resize should update camera aspect and renderer size', () => {
    const container = createContainer()
    const base = new ThreeBase(container)

    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true })

    const updateProjSpy = vi.spyOn(base.camera, 'updateProjectionMatrix')

    base.resize()

    expect(base.camera.aspect).toBeCloseTo(1024 / 768)
    expect(updateProjSpy).toHaveBeenCalled()
    expect(mockRendererInstance.setSize).toHaveBeenCalledWith(1024, 768)
  })

  it('animate should call requestAnimationFrame', () => {
    const container = createContainer()
    const base = new ThreeBase(container)

    vi.mocked(requestAnimationFrame).mockClear()
    base.animate()

    expect(requestAnimationFrame).toHaveBeenCalledWith(base.animate)
  })
})
