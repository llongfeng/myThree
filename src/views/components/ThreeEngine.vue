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
    scale: 0.05
}

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

// ======================================
// 1. 初始化Three.js场景、相机、渲染器、灯光、控制器
// ======================================
function init() {
    // 创建场景（所有物体、灯光都放在场景里）
    scene = new THREE.Scene()
    // 设置场景背景色（淡绿色）
    scene.background = new THREE.Color(0xccff99)

    // 创建透视相机（人眼视角，最常用）
    // 参数：视场角60°、宽高比、近裁剪面、远裁剪面
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
    controls.minDistance = 0.001          // 最小缩放距离
    controls.maxDistance = 200           // 最大缩放距离
    controls.enablePan = true            // 允许平移
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
                child.userData.originalMaterial = child.material
                // 加入可点击数组
                clickableObjects.push(child)
            }
        })

        // 控制器目标点指向城市中心
        controls.target.copy(cityCenter)
        controls.update()

        // 城市加载完成后，加载无人机
        loadDroneModel()
    })
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
    drone.lookAt(x, y - 1, z + 1)
}

// ======================================
// 5. 鼠标点击事件（单击进入物体，拖动不触发）
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
        // 移动距离 > 5像素 → 判定为拖动
        if (Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
            isDragging = true
        }
    })

    // 鼠标抬起：只有【非拖动】才执行点击逻辑
    window.addEventListener('mouseup', e => {
        // 如果是拖动 → 直接跳过，不执行进入逻辑
        if (isDragging) return

        // 计算鼠标标准化坐标（Three.js所需格式）
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

        // 从相机发射一条射线到鼠标位置
        raycaster.setFromCamera(mouse, camera)
        // 检测射线与可点击物体的交点
        const intersects = raycaster.intersectObjects(clickableObjects, true)

        // 如果点击到了物体
        if (intersects.length > 0) {
            const obj = intersects[0].object  // 获取点击的物体
            const box = new THREE.Box3().setFromObject(obj) // 计算包围盒
            const targetCenter = new THREE.Vector3()
            box.getCenter(targetCenter)      // 获取物体中心点
            currentTargetCenter = targetCenter // 保存当前目标中心

            // 计算相机到物体的距离
            const cameraDistance = camera.position.distanceTo(targetCenter)

            // 进入条件：不在内部 或 距离超过5米 → 允许重新进入
            if (!isInsideObject || cameraDistance > 5) {
                isInsideObject = true // 标记进入内部模式
                // 设置相机位置：物体中心 + 右侧偏移0.5米（水平视角）
                const cameraOffset = new THREE.Vector3(1, 0, 0)
                camera.position.copy(targetCenter.clone().add(cameraOffset.multiplyScalar(0.5)))
                // 相机看向物体中心
                controls.target.copy(targetCenter)
                console.log('✅ 单击进入物体内部')
            }
        }
    })
}

// ======================================
// 6. 键盘监听（W/S 前进后退）
// ======================================
function initKeyboard() {
    // 按键按下 → 记录为true
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true
    })
    // 按键抬起 → 记录为false
    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false
    })
}

// ======================================
// 7. 相机移动更新（仅内部模式生效，纯水平移动）
// ======================================
function updateMove() {
    // 不在内部模式 → 不执行
    if (!isInsideObject) return

    // 距离判断：相机离物体超过5米 → 自动退出内部模式
    if (currentTargetCenter && camera.position.distanceTo(currentTargetCenter) > 5) {
        isInsideObject = false
        console.log('📤 已离开物体（距离>5米）')
        return
    }

    // 获取相机世界朝向
    camera.getWorldDirection(worldDir)
    worldDir.y = 0         // 强制水平（去掉Y轴分量）
    worldDir.normalize()   // 归一化（保证方向正确，速度一致）

    // W键：前进
    if (keys['w']) {
        camera.position.addScaledVector(worldDir, moveSpeed)
    }
    // S键：后退
    if (keys['s']) {
        camera.position.addScaledVector(worldDir, -moveSpeed)
    }
}

// ======================================
// 8. 动画循环（每一帧执行）
// ======================================
function animate() {
    requestAnimationFrame(animate) // 循环调用

    updateMove()      // 更新相机移动
    updateDrone()     // 更新无人机位置
    controls.update() // 更新控制器（阻尼生效）
    renderer.render(scene, camera) // 渲染场景
}

// ======================================
// 9. 窗口大小自适应
// ======================================
window.addEventListener('resize', () => {
    // 更新相机宽高比
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    // 更新渲染画布大小
    renderer.setSize(window.innerWidth, window.innerHeight)
})

// ======================================
// 10. 生命周期：页面挂载完成后启动程序
// ======================================
onMounted(() => {
    init()              // 初始化Three.js
    loadModel()         // 加载模型
    initClickEvent()    // 初始化点击
    initKeyboard()      // 初始化键盘
    animate()           // 启动渲染循环
})
</script>

<style>
/* 全局样式清除默认边距，实现全屏 */
* {
    margin: 0;
    padding: 0;
}
</style>