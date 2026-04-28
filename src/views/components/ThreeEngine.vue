<template>
    <!-- 渲染容器：全屏div，用于挂载Three.js渲染生成的canvas画布
         100vw = 视口宽度 100vh = 视口高度，实现全屏展示 -->
    <div ref="container" style="width:100vw; height:100vh;"></div>
</template>

<script setup>
// ==================== 依赖导入区 ====================
// Vue3组合式API：ref创建DOM引用，onMounted生命周期钩子（页面挂载完成后执行）
import { ref, onMounted } from 'vue'

// Three.js核心库：包含场景、相机、渲染器、几何体、材质、灯光等所有核心类
import * as THREE from 'three'

// GLTFLoader：.glb/.gltf模型加载器，Three.js官方推荐的模型格式加载器
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// OrbitControls：轨道控制器，实现鼠标旋转、缩放、平移相机
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Stats：FPS性能监控面板，显示每秒渲染帧数，用于性能优化
import Stats from 'three/addons/libs/stats.module.js'

// ==================== 全局变量定义区 ====================

// 获取DOM容器引用，用于挂载Three.js的canvas画布
const container = ref(null)

// Three.js 渲染核心四大件
let scene        // 场景（Scene）：所有物体、灯光、相机的容器
let camera       // 相机（Camera）：决定观察视角
let renderer     // 渲染器（Renderer）：将场景+相机渲染到屏幕
let controls     // 轨道控制器：控制相机交互

// 可交互物体数组：存储城市模型中所有可点击、可高亮的网格
let clickableObjects = []

// 无人机 & 城市模型相关
let drone = null            // 无人机模型对象
let cityModel = null        // 城市整体模型
let cityCenter = new THREE.Vector3()  // 城市模型中心点（三维向量）
let cityBox = null          // 城市模型包围盒（用于计算尺寸、边界、中心）

// 无人机自动飞行控制
let droneProgress = 0       // 飞行进度 0~1 循环
// 无人机配置（可直接修改调整效果）
const DroneConfig = {
    height: 10,      // 飞行高度（在城市最高点之上）
    speed: 0.002,    // 飞行速度
    scale: 0.03      // 模型缩放比例
}

let dronePathLine = null    // 无人机飞行轨迹线

// 物体内部漫游模式
let isInsideObject = false        // 是否进入物体内部
let currentTargetCenter = null    // 当前进入物体的中心点

// ==================== 鼠标交互：区分单击 / 拖动 ====================
// 作用：拖动视角时不触发点击进入，只有单击才触发
let mouseDownPos = { x: 0, y: 0 }  // 鼠标按下坐标
let isDragging = false             // 是否正在拖动
const dragThreshold = 5            // 拖动阈值（>5像素判定为拖动）

// ==================== 键盘控制相机移动 ====================
const keys = {}                    // 按键状态：true=按下
const moveSpeed = 0.06             // 相机移动速度
const worldDir = new THREE.Vector3() // 相机世界方向向量

// ==================== 鼠标高亮 / 选中 ====================
let selectedObject = null    // 当前选中物体
let hoveredObject = null     // 当前悬浮物体
// 高亮材质：自发光黄色（MeshBasicMaterial不受光照影响）
const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 })
// 悬浮材质：自发光绿色
const hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 })

// FPS性能面板
let stats = null

// ==================== 1. 初始化Three.js核心环境 ====================
function init() {
    // -------------------- 1.1 创建场景 --------------------
    // Scene：场景，是所有3D对象的容器，必须创建
    scene = new THREE.Scene()

    // -------------------- 天空盒背景 ✅ 修复：跨域天空盒 + 正确加载 --------------------
    const textureLoader = new THREE.TextureLoader();
    const equirectangularTexture = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/aerial_grass_rock_1k.hdr',
        () => {
            equirectangularTexture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = equirectangularTexture;
            scene.environment = equirectangularTexture;
            console.log('✅ HDR天空加载成功');
        },
        undefined,
        (err) => {
            console.error('HDR加载失败，使用纯色天空', err);
            scene.background = new THREE.Color(0x87ceeb);
        }
    );

    // -------------------- 1.2 创建透视相机 --------------------
    // PerspectiveCamera：透视相机（模拟人眼，近大远小）
    // 参数：fov视场角、宽高比、近裁剪面、远裁剪面
    camera = new THREE.PerspectiveCamera(
        60,                    // fov：视野角度，越大看到范围越广
        window.innerWidth / window.innerHeight, // 相机宽高比=画布宽高比
        0.001,                 // near：近裁剪面，小于该距离不渲染
        2000                   // far：远裁剪面，大于该距离不渲染
    )
    // 设置相机初始位置（x,y,z）
    camera.position.set(100, 20, 3)

    // -------------------- 1.3 创建渲染器 --------------------
    // WebGLRenderer：WebGL渲染器，真正把3D画面画出来
    // antialias: true 开启抗锯齿，画面更平滑
    renderer = new THREE.WebGLRenderer({ antialias: true })
    // 设置渲染画布尺寸（全屏）
    renderer.setSize(window.innerWidth, window.innerHeight)
    // 开启阴影渲染（让物体能投射和接收阴影）
    renderer.shadowMap.enabled = true

    // ✅ 必须加：HDR天空显示关键配置
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 将渲染的canvas画布挂载到Vue容器中
    container.value.appendChild(renderer.domElement)

    // -------------------- 1.4 添加灯光 --------------------
    // 平行光（DirectionalLight）：模拟太阳光，平行发射，可产生阴影
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight.position.set(50, 100, 20) // 光源位置
    directionalLight.castShadow = true           // 开启阴影投射
    scene.add(directionalLight)

    // 环境光（AmbientLight）：均匀照亮所有物体，无方向、无阴影
    scene.add(new THREE.AmbientLight(0xffffff, 1))

    // -------------------- 1.5 初始化轨道控制器 --------------------
    // 绑定相机与画布，实现鼠标交互
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true        // 开启阻尼（惯性平滑效果）
    controls.dampingFactor = 0.5         // 阻尼系数（越小越丝滑）
    controls.rotateSpeed = 0.8           // 鼠标旋转速度
    controls.zoomSpeed = 1.2             // 鼠标缩放速度
    controls.panSpeed = 0.8              // 鼠标平移速度
    controls.minDistance = 1             // 相机最近距离（防止贴地穿透）
    controls.maxDistance = 200           // 相机最远距离
    controls.enablePan = true            // 允许右键平移

    // ==================== 核心：限制相机俯仰角度 ====================
    // 极角限制：相机与Y轴的夹角，范围 0 ~ π
    // 0 = 俯视正下方，π/2=水平视角，π=仰视正上方
    controls.maxPolarAngle = Math.PI / 2 - Math.PI / 180 * 10  // 最大俯角：水平向下10°
    controls.minPolarAngle = Math.PI / 180 * 10                // 最大仰角：向上10°

    // -------------------- 1.6 初始化FPS面板 --------------------
    stats = new Stats()
    stats.showPanel(0) // 0：FPS面板，1：渲染时间，2：内存占用
    document.body.appendChild(stats.dom)
}

// ==================== 2. 加载城市模型 ====================
function loadModel() {
    // 创建GLTF模型加载器
    const loader = new GLTFLoader()

    // 加载模型：参数（模型路径，加载完成回调）
    loader.load('/gltf/city2.glb', gltf => {
        // gltf.scene：模型根对象
        cityModel = gltf.scene
        // 将模型添加到场景
        scene.add(cityModel)

        // Box3：三维包围盒，setFromObject：计算模型的最小包围盒
        cityBox = new THREE.Box3().setFromObject(cityModel)
        // getCenter：获取包围盒中心点，存入cityCenter
        cityBox.getCenter(cityCenter)

        // traverse：递归遍历模型所有子物体
        cityModel.traverse(child => {
            // 判断是否为网格（Mesh：几何体+材质，可渲染）
            if (child.isMesh) {
                // userData：Three.js自定义数据存储区，用于保存原始材质
                child.userData.originalMaterial = child.material.clone()

                // 计算物体高度
                const box = new THREE.Box3().setFromObject(child)
                const height = box.max.y - box.min.y
                child.userData.height = height
                child.userData.canEnter = height > 3 // 高度>3米才可进入

                // 存入可点击数组
                clickableObjects.push(child)
            }
        })

        // 控制器观察目标 = 城市中心
        controls.target.copy(cityCenter)
        controls.update() // 强制更新控制器

        // 创建无人机飞行轨迹
        createDronePath()
        // 加载无人机
        loadDroneModel()
    })
}

// ==================== 3. 创建无人机环绕轨迹 ====================
function createDronePath() {
    if (!cityBox) return
    const min = cityBox.min  // 包围盒最小值
    const max = cityBox.max  // 包围盒最大值
    const y = cityBox.max.y + DroneConfig.height // 飞行高度

    // 定义方形轨迹点
    const points = [
        new THREE.Vector3(min.x, y, min.z),
        new THREE.Vector3(max.x, y, min.z),
        new THREE.Vector3(max.x, y, max.z),
        new THREE.Vector3(min.x, y, max.z),
        new THREE.Vector3(min.x, y, min.z)
    ]

    // BufferGeometry：高性能几何体，setFromPoints从点创建线
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    // LineDashedMaterial：虚线材质
    const material = new THREE.LineDashedMaterial({
        color: 0x0099ff,
        dashSize: 3,   // 实线长度
        gapSize: 1.5,  // 间隔长度
    })

    // Line：创建线模型
    dronePathLine = new THREE.Line(geometry, material)
    // computeLineDistances：计算线段距离（必须调用，虚线才能显示）
    dronePathLine.computeLineDistances()
    scene.add(dronePathLine)
}

// ==================== 4. 加载无人机模型 ====================
function loadDroneModel() {
    const loader = new GLTFLoader()
    loader.load('/models/drone.glb', gltf => {
        drone = gltf.scene
        // set：设置x/y/z三轴缩放
        drone.scale.set(DroneConfig.scale, DroneConfig.scale, DroneConfig.scale)
        scene.add(drone)
    })
}

// ==================== 5. 无人机自动飞行逻辑 ====================
function updateDrone() {
    if (!drone || !cityBox) return

    // 进度累加
    droneProgress += DroneConfig.speed
    // 循环：超过1重置为0
    if (droneProgress > 1) droneProgress = 0

    const min = cityBox.min
    const max = cityBox.max
    const width = max.x - min.x
    const depth = max.z - min.z

    let x, z
    const p = droneProgress

    // 四段路径：右 → 前 → 左 → 后
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

    // 设置无人机高度
    const y = cityBox.max.y + DroneConfig.height
    // 设置位置
    drone.position.set(x, y, z)
    // lookAt：让物体朝向某个坐标
    drone.lookAt(x, y, z + 1)
}

// ==================== 6. 鼠标点击事件 ====================
function initClickEvent() {
    // Raycaster：射线投射器，用于鼠标拾取3D物体
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2() // 鼠标坐标

    // 鼠标按下：记录起点
    window.addEventListener('mousedown', e => {
        mouseDownPos.x = e.clientX
        mouseDownPos.y = e.clientY
        isDragging = false
    })

    // 鼠标移动：判断是否拖动
    window.addEventListener('mousemove', e => {
        const dx = e.clientX - mouseDownPos.x
        const dy = e.clientY - mouseDownPos.y
        // 勾股定理计算移动距离
        if (Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
            isDragging = true
        }
    })

    // 鼠标抬起：非拖动才执行点击
    window.addEventListener('mouseup', e => {
        if (isDragging) return

        // 设备坐标 → 标准化设备坐标（-1~1）
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

        // 从相机发射一条射线
        raycaster.setFromCamera(mouse, camera)
        // 计算射线与物体的交点
        const intersects = raycaster.intersectObjects(clickableObjects, true)

        if (intersects.length > 0) {
            const obj = intersects[0].object

            // 清除上一个选中状态
            if (selectedObject) {
                selectedObject.material = selectedObject.userData.originalMaterial
            }
            selectedObject = obj

            // 判断是否可进入
            if (!obj.userData.canEnter) {
                console.log('ℹ️ 该物体高度不足3米，无法进入')
                return
            }

            // 获取物体中心
            const box = new THREE.Box3().setFromObject(obj)
            const targetCenter = new THREE.Vector3()
            box.getCenter(targetCenter)
            currentTargetCenter = targetCenter

            // 进入内部模式
            isInsideObject = true
            const cameraOffset = new THREE.Vector3(1, 0, 0)
            camera.position.copy(targetCenter.clone().add(cameraOffset.multiplyScalar(0.5)))
            controls.target.copy(targetCenter)
            console.log('✅ 进入物体内部')
        }
    })
}

// ==================== 7. 鼠标悬浮高亮 ====================
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

// ==================== 8. 键盘控制 ====================
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
            console.log('📤 ESC 退出内部')
        }
    })

    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false
    })
}

// ==================== 9. 相机内部移动 ====================
function updateMove() {
    if (!isInsideObject) return

    // 远离物体>5米自动退出
    if (currentTargetCenter && camera.position.distanceTo(currentTargetCenter) > 5) {
        isInsideObject = false
        if (selectedObject) {
            selectedObject.material = selectedObject.userData.originalMaterial
            selectedObject = null
        }
        console.log('📤 已离开物体')
        return
    }

    // getWorldDirection：获取相机世界朝向
    camera.getWorldDirection(worldDir)
    worldDir.y = 0 // 只保留水平方向
    worldDir.normalize() // 归一化（长度=1）

    // W前进 S后退
    if (keys['w']) {
        camera.position.addScaledVector(worldDir, moveSpeed)
    }
    if (keys['s']) {
        camera.position.addScaledVector(worldDir, -moveSpeed)
    }
}

// ==================== 10. 动画渲染循环 ====================
function animate() {
    // requestAnimationFrame：浏览器优化的动画循环，每秒60次
    requestAnimationFrame(animate)

    // ========== 相机防穿透安全锁：强制限制俯角，永不看地面以下 ==========
    const angle = Math.atan2(
        Math.sqrt(
            (camera.position.x - controls.target.x) ** 2 +
            (camera.position.z - controls.target.z) ** 2
        ),
        camera.position.y - controls.target.y
    )
    if (angle < Math.PI / 180 * 15) {
        camera.position.y = controls.target.y +
            Math.sqrt(
                (camera.position.x - controls.target.x) ** 2 +
                (camera.position.z - controls.target.z) ** 2
            ) / Math.tan(Math.PI / 180 * 15)
    }

    stats.update()          // 更新FPS
    updateMove()            // 更新相机移动
    updateDrone()           // 更新无人机
    controls.update()       // 更新控制器
    renderer.render(scene, camera) // 渲染画面
}

// ==================== 11. 窗口大小自适应 ====================
window.addEventListener('resize', () => {
    // 更新相机宽高比
    camera.aspect = window.innerWidth / window.innerHeight
    // 更新相机投影矩阵（必须调用）
    camera.updateProjectionMatrix()
    // 更新渲染尺寸
    renderer.setSize(window.innerWidth, window.innerHeight)
})

// ==================== 12. 生命周期启动 ====================
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
/* 清除默认边距，确保全屏 */
* {
    margin: 0;
    padding: 0;
}
</style>