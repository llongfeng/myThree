import { loadManager } from '../model/loadManager'
import { City } from '../model/City'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { LoadedModel } from '@/types'

console.log('entry index')
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded')

  // 创建 Three.js 场景、相机和控制器
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 2, 18)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // 添加基础光照
  const ambient = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambient)
  const directional = new THREE.DirectionalLight(0xffffff, 0.6)
  directional.position.set(5, 10, 7.5)
  scene.add(directional)

  const animate = () => {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  const modelList = ['/fbx/plant.fbx', '/gltf/city.glb']
  loadManager(modelList, (models: LoadedModel[]) => {
    console.log('models===', models)
    models.forEach((obj) => {
      if (obj.url.endsWith('/city.glb') || obj.url.endsWith('city.glb')) {
        new City(obj.model, scene, camera, controls)
      }
      if (obj.url.endsWith('/plant.fbx') || obj.url.endsWith('plant.fbx')) {
        new City(obj.model, scene, camera, controls)
      }
    })
  })
})
