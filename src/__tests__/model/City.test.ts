import { describe, it, expect, vi } from 'vitest'
import { City } from '../../model/City'
import type { Object3D, Camera, Scene } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

describe('City', () => {
  it('should add model to scene on init', () => {
    const model = {} as Object3D
    const scene = { add: vi.fn() } as unknown as Scene
    const camera = {} as Camera
    const controls = {} as OrbitControls

    new City(model, scene, camera, controls)

    expect(scene.add).toHaveBeenCalledWith(model)
  })
})
