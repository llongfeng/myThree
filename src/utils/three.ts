import * as THREE from 'three'
import { loadManager } from '../model/loadManager'
import { initThreeScene, addStandardLights, startAnimationLoop } from './three-setup'
import type { ThreeContext } from './three-setup'
import type { LoadedModel } from '../types'

export class ThreeBase {
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public controls: ThreeContext['controls']
  public mesh?: THREE.Mesh

  private ctx: ThreeContext

  constructor(container: HTMLElement) {
    this.ctx = initThreeScene(
      container,
      {
        fov: 75,
        near: 0.1,
        far: 1000,
        cameraPosition: [0, 0, 12],
        background: 0x808080,
        toneMapping: THREE.CineonToneMapping,
        toneMappingExposure: 2,
      },
      {
        enableDamping: true,
        dampingFactor: 0.5,
        autoRotate: false,
      }
    )

    this.scene = this.ctx.scene
    this.camera = this.ctx.camera
    this.renderer = this.ctx.renderer
    this.controls = this.ctx.controls
    this.controls.target.set(0, 0, 0)

    addStandardLights(this.scene, {
      ambientIntensity: 0.6,
      directionalIntensity: 0.8,
      directionalPosition: [5, 10, 7],
    })

    // Also add hemisphere light (unique to ThreeBase)
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
    this.scene.add(hemisphereLight)

    startAnimationLoop(this.ctx, () => {
      if (this.mesh) {
        this.mesh.rotation.x += 0.01
        this.mesh.rotation.y += 0.01
      }
    })
  }

  addEdges(mesh: THREE.Mesh, color: THREE.Color) {
    const edges = new THREE.EdgesGeometry(mesh.geometry)
    const material = new THREE.LineBasicMaterial({ color })
    const line = new THREE.LineSegments(edges, material)

    line.position.set(0, 0, 0)
    line.rotation.set(0, 0, 0)
    line.scale.set(1, 1, 1)
    mesh.add(line)
  }

  addCube() {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.scene.add(this.mesh)
  }

  addModel(path: string, onLoad?: (model: LoadedModel) => void) {
    loadManager([path], (models) => {
      if (models.length > 0) {
        const loadModel = models[0]
        console.log('加载完成', loadModel)
        this.scene.add(loadModel.model)
        this.centerObject(loadModel.model)
        this.initHouse(loadModel.model)

        onLoad?.(loadModel)
      }
    })
  }

  private centerObject(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    object.position.sub(center)
  }

  initHouse(model: THREE.Object3D) {
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x409eff })
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'mesh_4') {
        console.log('找到目标模型，修改材质')
        child.material = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          roughness: 0.5,
          metalness: 0.5
        })
      }

      if (child instanceof THREE.Mesh && child.name === 'mesh_33') {
        console.log('找到目标模型，修改材质')
        child.material = wallMaterial
        this.addEdges(child, new THREE.Color(0xaaf000))
      }
    })
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
