<template>
    <!-- 渲染容器：全屏的div，用于挂载Three.js的渲染画布 -->
    <div ref="container" style="width:100vw; height:100vh;"></div>
</template>

<script setup>
// 导入Vue3组合式API：ref创建响应式引用，onMounted生命周期钩子
import { ref, onMounted } from 'vue'
// 导入Three.js核心库
import * as THREE from 'three'
// 导入gltf模型加载器（用于加载.glb/.gltf格式模型）
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
// 导入轨道控制器（实现鼠标旋转、缩放、平移相机）
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// 导入FPS帧率插件
import Stats from 'three/addons/libs/stats.module.js'

// ======================================
// 全局变量定义区
// ======================================

// 获取DOM容器引用（Three.js画布会挂载到这里）
const container = ref(null)

// Three.js核心三大件 + 控制器
let scene, camera, renderer, controls

// 可点击的物体数组（存储城市模型里所有网格）
let clickableObjects = []

// 无人机与城市模型相关变量
let drone = null            // 无人机模型对象
let cityModel = null        // 城市模型对象
let cityCenter = new THREE.Vector3()  // 城市模型中心点
let cityBox = null          // 城市模型包围盒（用于计算边界）

// 无人机自动飞行进度（0~1循环）
let droneProgress = 0
// 无人机配置参数（高度、速度、缩放比例）
const DroneConfig = {
    height: 10,
    speed: 0.005,
    scale: 0.03
}

// 无人机轨迹线
let dronePathLine = null

// 是否处于【物体内部】模式（W/S移动生效）
let isInsideObject = false
// 记录当前进入的物体中心点（用于计算相机距离）
let currentTargetCenter = null

// ======================================
// 单击/拖动 区分逻辑变量（核心修复）
// 作用：只有单击才进入物体，拖动视角不触发
// ======================================
let mouseDownPos = { x: 0, y: 0 }  // 鼠标按下时的坐标
let isDragging = false             // 是否正在拖动
const dragThreshold = 5            // 拖动阈值：移动超过5像素判定为拖动

// 键盘控制相关
const keys = {}                    // 存储按键状态（true=按下）
const moveSpeed = 0.06             // 相机移动速度
const worldDir = new THREE.Vector3() // 相机朝向向量

// 新增：高亮与选中
let selectedObject = null
let hoveredObject = null
const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 })
const hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 })

// FPS面板
let stats = null

// ======================================
// 1. 初始化Three.js场景、相机、渲染器、灯光、控制器
// ======================================
function init() {
    // 创建场景（所有物体、灯光都放在场景里）
    scene = new THREE.Scene()

    // 增强功能：天空盒背景（提升画面质感）
    const cubeLoader = new THREE.CubeTextureLoader()
    cubeLoader.setPath('https://threejs.org/examples/textures/cube/skybox/')
    const skyTexture = cubeLoader.load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
    ])
    scene.background = skyTexture

    // 创建透视相机（人眼视角，最常用）
    // 参数：视野角度60°、窗口宽高比、近裁剪面0.001、远裁剪面2000
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.001,
        2000
    )
    // 设置相机初始位置
    camera.position.set(100, 20, 3)

    // 创建渲染器（抗锯齿开启）
    renderer = new THREE.WebGLRenderer({ antialias: true })
    // 设置渲染画布大小为全屏
    renderer.setSize(window.innerWidth, window.innerHeight)
    // 开启阴影渲染
    renderer.shadowMap.enabled = true
    // 将渲染画布添加到DOM容器
    container.value.appendChild(renderer.domElement)

    // 创建平行光（模拟太阳光，可产生阴影）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight.position.set(50, 100, 20)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // 创建环境光（均匀照亮整个场景，无阴影）
    scene.add(new THREE.AmbientLight(0xffffff, 1))

    // 初始化轨道控制器（绑定相机和画布）
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true        // 开启阻尼（平滑效果）
    controls.dampingFactor = 0.5         // 阻尼系数
    controls.rotateSpeed = 0.8           // 旋转速度
    controls.zoomSpeed = 1.2             // 缩放速度
    controls.panSpeed = 0.8              // 平移速度
    controls.minDistance = 1             // 最小缩放距离（防止贴脸穿透）
    controls.maxDistance = 200           // 最大缩放距离
    controls.enablePan = true            // 允许平移

    // ======================
    // 核心：限制相机俯仰角度（和Y轴夹角，范围0~π）
    // 0 = 正上方，π/2 = 水平，π = 正下方
    // 最大俯角：水平向下10度（不能再低了）
    // 最小仰角：向上10度（防止看天过头）
    // ======================
    controls.maxPolarAngle = Math.PI / 2 - Math.PI / 180 * 10
    controls.minPolarAngle = Math.PI / 180 * 10

    // 增强功能：初始化FPS面板
    stats = new Stats()
    stats.showPanel(0)
    document.body.appendChild(stats.dom)
}

// ======================================
// 2. 加载城市模型（glb格式）
// ======================================
function loadModel() {
    const loader = new GLTFLoader()
    // 加载模型文件
    loader.load('/gltf/city2.glb', gltf => {
        // 获取模型根对象
        cityModel = gltf.scene
        // 将模型添加到场景
        scene.add(cityModel)

        // 计算模型的包围盒（用于获取中心点、边界）
        cityBox = new THREE.Box3().setFromObject(cityModel)
        // 获取模型中心点
        cityBox.getCenter(cityCenter)

        // 遍历模型所有子物体
        cityModel.traverse(child => {
            // 如果是网格物体（可渲染、可点击）
            if (child.isMesh) {
                // 保存原始材质（备用）
                child.userData.originalMaterial = child.material.clone()

                // 计算物体高度：用于判断是否可进入
                const box = new THREE.Box3().setFromObject(child)
                const height = box.max.y - box.min.y
                child.userData.height = height // 保存高度
                child.userData.canEnter = height > 3 // 高度>3米才能进入

                // 加入可点击数组
                clickableObjects.push(child)
            }
        })

        // 控制器目标点指向城市中心
        controls.target.copy(cityCenter)
        controls.update()

        // 增强功能：创建无人机轨迹
        createDronePath()

        // 城市加载完成后，加载无人机
        loadDroneModel()
    })
}

// ======================================
// 增强功能：创建无人机环绕轨迹
// ======================================
function createDronePath() {
    if (!cityBox) return
    const min = cityBox.min
    const max = cityBox.max
    const y = cityBox.max.y + DroneConfig.height

    const points = [
        new THREE.Vector3(min.x, y, min.z),
        new THREE.Vector3(max.x, y, min.z),
        new THREE.Vector3(max.x, y, max.z),
        new THREE.Vector3(min.x, y, max.z),
        new THREE.Vector3(min.x, y, min.z)
    ]

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineDashedMaterial({
        color: 0x0099ff,
        dashSize: 3,
        gapSize: 1.5,
    })

    dronePathLine = new THREE.Line(geometry, material)
    dronePathLine.computeLineDistances()
    scene.add(dronePathLine)
}

// ======================================
// 3. 加载无人机模型
// ======================================
function loadDroneModel() {
    const loader = new GLTFLoader()
    loader.load('/models/drone.glb', gltf => {
        drone = gltf.scene
        // 设置无人机缩放
        drone.scale.set(DroneConfig.scale, DroneConfig.scale, DroneConfig.scale)
        scene.add(drone)
    })
}

// ======================================
// 4. 无人机自动绕城市飞行逻辑
// ======================================
function updateDrone() {
    // 模型未加载完成则不执行
    if (!drone || !cityBox) return

    // 进度累加
    droneProgress += DroneConfig.speed
    // 循环（0~1）
    if (droneProgress > 1) droneProgress = 0

    // 获取城市边界
    const min = cityBox.min
    const max = cityBox.max
    const width = max.x - min.x
    const depth = max.z - min.z

    let x, z
    const p = droneProgress

    // 四段路径：右 → 前 → 左 → 后 绕城市一圈
    if (p < 0.25) {
        const t = p / 0.25
        x = min.x + width * t
        z = min.z
    } else if (p < 0.5) {
        const t = (p - 0.25) / 0.25
        x = max.x
        z = min.z + depth * t
    } else if (p < 0.75) {
        const t = 1 - (p - 0.5) / 0.25
        x = min.x + width * t
        z = max.z
    } else {
        const t = 1 - (p - 0.75) / 0.25
        x = min.x
        z = min.z + depth * t
    }

    // 高度 = 城市最高点 + 配置高度
    const y = cityBox.max.y + DroneConfig.height
    // 设置无人机位置
    drone.position.set(x, y, z)
    // 无人机朝向
    drone.lookAt(x, y, z + 1)
}

// ======================================
// 5. 鼠标点击事件（单击进入物体，拖动不触发）
// 功能：点击高亮 + 高度>3米可进入内部
// ======================================
function initClickEvent() {
    const raycaster = new THREE.Raycaster()  // 射线投射器（用于点击检测）
    const mouse = new THREE.Vector2()        // 鼠标坐标

    // 鼠标按下：记录起始位置
    window.addEventListener('mousedown', e => {
        mouseDownPos.x = e.clientX
        mouseDownPos.y = e.clientY
        isDragging = false  // 重置拖动状态
    })

    // 鼠标移动：判断是否超过阈值 → 标记为拖动
    window.addEventListener('mousemove', e => {
        const dx = e.clientX - mouseDownPos.x
        const dy = e.clientY - mouseDownPos.y
        if (Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
            isDragging = true
        }
    })

    // 鼠标抬起：只有【非拖动】才执行点击逻辑
    window.addEventListener('mouseup', e => {
        if (isDragging) return

        mouse.x = (e.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(clickableObjects, true)

        if (intersects.length > 0) {
            const obj = intersects[0].object

            // 清除上一个选中状态
            if (selectedObject) {
                selectedObject.material = selectedObject.userData.originalMaterial
            }
            // 设置当前选中高亮
            selectedObject = obj
            selectedObject.material = highlightMaterial

            // ======================================
            // 核心判断：只有高度>3米才允许进入内部
            // ======================================
            console.log('当前物体是否可进入：', obj.userData.canEnter)
            if (!obj.userData.canEnter) {
                console.log('ℹ️ 该物体高度不足3米，无法进入')
                return
            }

            const box = new THREE.Box3().setFromObject(obj)
            const targetCenter = new THREE.Vector3()
            box.getCenter(targetCenter)
            currentTargetCenter = targetCenter

            const cameraDistance = camera.position.distanceTo(targetCenter)

            if (!isInsideObject || cameraDistance > 5) {
                isInsideObject = true
                const cameraOffset = new THREE.Vector3(1, 0, 0)
                camera.position.copy(targetCenter.clone().add(cameraOffset.multiplyScalar(0.5)))
                controls.target.copy(targetCenter)
                console.log('✅ 单击进入物体内部')
            }
        }
    })
}

// ======================================
// 增强功能：鼠标悬浮高亮
// ======================================
function initMouseHover() {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    window.addEventListener('mousemove', e => {
        if (isDragging || isInsideObject) return

        mouse.x = (e.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(clickableObjects, true)

        // 清除上一个悬浮
        if (hoveredObject && hoveredObject !== selectedObject) {
            hoveredObject.material = hoveredObject.userData.originalMaterial
        }

        // 设置新悬浮
        if (intersects.length > 0) {
            hoveredObject = intersects[0].object
            if (hoveredObject !== selectedObject) {
                hoveredObject.material = hoverMaterial
            }
        }
    })
}

// ======================================
// 6. 键盘监听（W/S 前进后退 + ESC退出内部）
// ======================================
function initKeyboard() {
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true

        // ESC 退出内部漫游
        if (e.key === 'Escape' && isInsideObject) {
            isInsideObject = false
            if (selectedObject) {
                selectedObject.material = selectedObject.userData.originalMaterial
                selectedObject = null
            }
            console.log('📤 ESC 退出物体内部')
        }
    })

    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false
    })
}

// ======================================
// 7. 相机移动更新（仅内部模式生效，纯水平移动）
// ======================================
function updateMove() {
    if (!isInsideObject) return

    // 远离物体超过5米，自动退出内部
    if (currentTargetCenter && camera.position.distanceTo(currentTargetCenter) > 5) {
        isInsideObject = false
        // 退出时恢复材质
        if (selectedObject) {
            selectedObject.material = selectedObject.userData.originalMaterial
            selectedObject = null
        }
        console.log('📤 已离开物体（距离>5米）')
        return
    }

    // 获取相机朝向，只保留水平方向
    camera.getWorldDirection(worldDir)
    worldDir.y = 0
    worldDir.normalize()

    // W前进 S后退
    if (keys['w']) {
        camera.position.addScaledVector(worldDir, moveSpeed)
    }
    if (keys['s']) {
        camera.position.addScaledVector(worldDir, -moveSpeed)
    }
}

// ======================================
// 8. 动画循环（每一帧执行）
// ======================================
function animate() {
    requestAnimationFrame(animate)

    // ========== 相机角度安全锁（强制限制俯角，防止穿透到模型底部） ==========
    const angle = Math.atan2(
        Math.sqrt(
            (camera.position.x - controls.target.x) ** 2 +
            (camera.position.z - controls.target.z) ** 2
        ),
        camera.position.y - controls.target.y
    )
    // 限制最小俯角（和水平方向夹角≥15度，即不能低于目标点太多）
    if (angle < Math.PI / 180 * 15) {
        camera.position.y = controls.target.y +
            Math.sqrt(
                (camera.position.x - controls.target.x) ** 2 +
                (camera.position.z - controls.target.z) ** 2
            ) / Math.tan(Math.PI / 180 * 15)
    }

    stats.update()          // FPS更新
    updateMove()            // 相机移动
    updateDrone()           // 无人机
    controls.update()       // 控制器
    renderer.render(scene, camera)
}

// ======================================
// 9. 窗口大小自适应
// ======================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

// ======================================
// 10. 生命周期：页面挂载完成后启动程序
// ======================================
onMounted(() => {
    init()
    loadModel()
    initClickEvent()
    initMouseHover()
    initKeyboard()
    animate()
})
</script>

<style>
/* 全局样式清除默认边距，实现全屏 */
* {
    margin: 0;
    padding: 0;
}
</style>