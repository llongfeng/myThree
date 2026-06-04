import { describe, it, expect, vi } from 'vitest'
import { BaseModel } from '../../model/BaseModel'
import type { Object3D, Camera, Scene } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function makeMocks() {
  const model = {} as Object3D
  const scene = {} as Scene
  const camera = {} as Camera
  const controls = {} as OrbitControls
  return { model, scene, camera, controls }
}

describe('BaseModel', () => {
  it('should assign model, scene, camera, controls', () => {
    const { model, scene, camera, controls } = makeMocks()
    const base = new BaseModel(model, scene, camera, controls)

    // Access protected properties via cast
    expect((base as any).model).toBe(model)
    expect((base as any).scene).toBe(scene)
    expect((base as any).camera).toBe(camera)
    expect((base as any).controls).toBe(controls)
  })

  it('should call init() during construction', () => {
    const initSpy = vi.spyOn(BaseModel.prototype as any, 'init')
    const { model, scene, camera, controls } = makeMocks()
    new BaseModel(model, scene, camera, controls)

    expect(initSpy).toHaveBeenCalledOnce()
    initSpy.mockRestore()
  })
})
