import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFBXLoad = vi.fn()
const mockGLTFLoad = vi.fn()

vi.mock('three/examples/jsm/loaders/FBXLoader.js', () => {
  return {
    FBXLoader: class {
      load = mockFBXLoad
    }
  }
})

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  return {
    GLTFLoader: class {
      load = mockGLTFLoad
    }
  }
})

import { loadManager } from '../../model/loadManager'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadManager', () => {
  it('should load a single .fbx file and invoke callback', () => {
    const callback = vi.fn()
    const fakeObj = { name: 'fbxModel' }

    loadManager(['/model.fbx'], callback)

    expect(mockFBXLoad).toHaveBeenCalledOnce()
    const [path, onSuccess] = mockFBXLoad.mock.calls[0]
    expect(path).toBe('/model.fbx')

    onSuccess(fakeObj)
    expect(callback).toHaveBeenCalledWith([{ model: fakeObj, url: '/model.fbx' }])
  })

  it('should load a single .glb file and invoke callback', () => {
    const callback = vi.fn()
    const fakeScene = { name: 'gltfScene' }

    loadManager(['/model.glb'], callback)

    expect(mockGLTFLoad).toHaveBeenCalledOnce()
    const [path, onSuccess] = mockGLTFLoad.mock.calls[0]
    expect(path).toBe('/model.glb')

    onSuccess({ scene: fakeScene })
    expect(callback).toHaveBeenCalledWith([{ model: fakeScene, url: '/model.glb' }])
  })

  it('should load a .gltf file via GLTFLoader', () => {
    const callback = vi.fn()
    const fakeScene = { name: 'gltfScene' }

    loadManager(['/model.gltf'], callback)

    expect(mockGLTFLoad).toHaveBeenCalledOnce()
    const [path, onSuccess] = mockGLTFLoad.mock.calls[0]
    expect(path).toBe('/model.gltf')

    onSuccess({ scene: fakeScene })
    expect(callback).toHaveBeenCalledWith([{ model: fakeScene, url: '/model.gltf' }])
  })

  it('should handle case-insensitive file extensions', () => {
    const callback = vi.fn()
    loadManager(['/Model.FBX'], callback)
    expect(mockFBXLoad).toHaveBeenCalledOnce()
  })

  it('should warn and skip unsupported model types', () => {
    const callback = vi.fn()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    loadManager(['/model.obj'], callback)

    expect(warnSpy).toHaveBeenCalledWith('Unsupported model type:', '/model.obj')
    expect(callback).toHaveBeenCalledWith([])
    warnSpy.mockRestore()
  })

  it('should load multiple files and call callback once all are loaded', () => {
    const callback = vi.fn()
    const fbxObj = { name: 'fbx' }
    const gltfScene = { name: 'gltf' }

    loadManager(['/a.fbx', '/b.glb'], callback)

    expect(mockFBXLoad).toHaveBeenCalledOnce()
    expect(mockGLTFLoad).toHaveBeenCalledOnce()

    // Load first file
    mockFBXLoad.mock.calls[0][1](fbxObj)
    expect(callback).not.toHaveBeenCalled()

    // Load second file
    mockGLTFLoad.mock.calls[0][1]({ scene: gltfScene })
    expect(callback).toHaveBeenCalledOnce()
    expect(callback.mock.calls[0][0]).toHaveLength(2)
  })

  it('should handle FBX load error and still invoke callback', () => {
    const callback = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    loadManager(['/bad.fbx'], callback)

    const onError = mockFBXLoad.mock.calls[0][3]
    onError(new Error('load fail'))

    expect(errorSpy).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith([])
    errorSpy.mockRestore()
  })

  it('should handle GLTF load error and still invoke callback', () => {
    const callback = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    loadManager(['/bad.glb'], callback)

    const onError = mockGLTFLoad.mock.calls[0][3]
    onError(new Error('load fail'))

    expect(errorSpy).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledWith([])
    errorSpy.mockRestore()
  })

  it('should invoke callback when mixed load results include errors', () => {
    const callback = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fakeScene = { name: 'ok' }

    loadManager(['/fail.fbx', '/ok.glb'], callback)

    // FBX fails
    mockFBXLoad.mock.calls[0][3](new Error('fail'))
    expect(callback).not.toHaveBeenCalled()

    // GLTF succeeds
    mockGLTFLoad.mock.calls[0][1]({ scene: fakeScene })
    expect(callback).toHaveBeenCalledOnce()
    expect(callback.mock.calls[0][0]).toHaveLength(1)
    expect(callback.mock.calls[0][0][0].url).toBe('/ok.glb')

    errorSpy.mockRestore()
  })
})
