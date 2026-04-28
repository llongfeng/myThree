import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { loadManager } from '../model/loadManager'
import type { LoadedModel } from '../types'

export class ThreeBase {
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public controls: OrbitControls
  public mesh?: THREE.Mesh

  constructor(container: HTMLElement) {
    //创建场景
    this.scene = new THREE.Scene()
    //给场景添加背景色
    this.scene.background = new THREE.Color(0x808080)
    //创建相机
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
    this.camera.position.z = 12

    // 创建渲染器之前先创建 canvas，并尝试获取 WebGL 上下文
    const canvas = document.createElement('canvas')
    const context =
      canvas.getContext('webgl2', { antialias: true }) ||
      canvas.getContext('webgl', { antialias: true }) ||
      canvas.getContext('experimental-webgl', { antialias: true })

    if (!context) {
      throw new Error('当前浏览器或设备不支持 WebGL，请检查硬件或使用支持 WebGL 的浏览器。')
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true })
    this.renderer.domElement.style.display = 'block'
    //渲染颜色空间
    this.renderer.toneMapping = THREE.CineonToneMapping
    //曝光度
    this.renderer.toneMappingExposure = 2

    const width = Math.max(container.clientWidth, window.innerWidth, 1)
    const height = Math.max(container.clientHeight, window.innerHeight, 1)
    //设置渲染大小
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    //添加至页面
    container.appendChild(this.renderer.domElement)

    //添加光亮效果
    //环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    //平行光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 7)
    //半球光
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
    this.scene.add(ambientLight, directionalLight, hemisphereLight)

    //添加轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    //平滑拖动
    this.controls.enableDamping = true
    //阻尼器系数
    this.controls.dampingFactor = 0.5
    //自动旋转
    this.controls.autoRotate = false
    this.controls.target.set(0, 0, 0)

    this.animate()
  }

  //给所有的小物体添加边框线
  //修复原因：模型可能存在父节点变换，不能直接用复制 position/rotation/scale
  addEdges(mesh: THREE.Mesh, color: THREE.Color) {
    const edges = new THREE.EdgesGeometry(mesh.geometry)
    const material = new THREE.LineBasicMaterial({ color })
    const line = new THREE.LineSegments(edges, material)

    // 直接将线框添加为 mesh 的子对象，让它继承 mesh 的完整变换
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

  //添加外部模型
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

  //初始化房间效果
  initHouse(model: THREE.Object3D) {
    //修改外墙的材质
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
      // this.addEdges(child, new THREE.Color(0xaaf000))
    })
  }

  animate = () => {
    requestAnimationFrame(this.animate)
    this.mesh && (this.mesh.rotation.x += 0.01)
    this.mesh && (this.mesh.rotation.y += 0.01)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
