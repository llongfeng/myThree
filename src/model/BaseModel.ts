import type { Object3D, Camera, Scene } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class BaseModel {
  protected model: Object3D
  protected scene: Scene
  protected camera: Camera
  protected controls: OrbitControls

  constructor(model: Object3D, scene: Scene, camera: Camera, controls: OrbitControls) {
    this.model = model
    this.scene = scene
    this.camera = camera
    this.controls = controls

    this.init()
  }

  protected init(): void {
    // 子类可重写此方法来初始化模型
  }
}
