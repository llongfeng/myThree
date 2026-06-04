import { loadManager } from '../model/loadManager'
import { City } from '../model/City'
import { initThreeScene, addStandardLights, startAnimationLoop } from '../utils/three-setup'
import type { LoadedModel } from '@/types'

console.log('entry index')
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded')

  const ctx = initThreeScene(
    document.body,
    { fov: 75, near: 0.1, far: 1000, cameraPosition: [0, 2, 18] },
    { enableDamping: true }
  )

  addStandardLights(ctx.scene, {
    ambientIntensity: 0.8,
    directionalIntensity: 0.6,
    directionalPosition: [5, 10, 7.5],
  })

  startAnimationLoop(ctx)

  const modelList = ['/fbx/plant.fbx', '/gltf/city.glb']
  loadManager(modelList, (models: LoadedModel[]) => {
    console.log('models===', models)
    models.forEach((obj) => {
      if (obj.url.endsWith('/city.glb') || obj.url.endsWith('city.glb')) {
        new City(obj.model, ctx.scene, ctx.camera, ctx.controls)
      }
      if (obj.url.endsWith('/plant.fbx') || obj.url.endsWith('plant.fbx')) {
        new City(obj.model, ctx.scene, ctx.camera, ctx.controls)
      }
    })
  })
})
