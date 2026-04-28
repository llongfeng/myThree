<template>
    <div ref="container" style="width:100vw; height:100vh;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const container = ref(null)
let scene, camera, renderer, controls
let clickableObjects = []

// 1. 初始化场景
function init() {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    )
    // 45度向下俯视 + 拉近镜头
    camera.position.set(120, 200, 120)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    container.value.appendChild(renderer.domElement)

    // 灯光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight.position.set(50, 100, 50)
    scene.add(directionalLight)
    scene.add(new THREE.AmbientLight(0xffffff, 1))

    // 控制器
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = true
    controls.enablePan = true
}

// 2. 加载模型
function loadModel() {
    const loader = new GLTFLoader()
    loader.load('/gltf/city2.glb', (gltf) => {
        scene.add(gltf.scene)
        console.log('✅ 模型加载完成')

        // 遍历模型，过滤地面，收集所有可点击建筑
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                // 地面Plane_1 禁止射线拾取，防止遮挡
                if (child.name === 'Plane_1') {
                    child.raycast = () => { }
                } else {
                    clickableObjects.push(child)
                }
            }
        })
    })
}

// 点击检测
function initClickEvent() {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    window.addEventListener('click', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(clickableObjects, true)

        if (intersects.length > 0) {
            const obj = intersects[0].object
            console.log('点击到了：', obj.name)
            // 无动画，直接瞬间聚焦物体
            focusObject(obj)
        }
    })
}

// 无动画 - 直接瞬间看向+拉近目标
function focusObject(obj) {
    const box = new THREE.Box3().setFromObject(obj)
    const center = new THREE.Vector3()
    box.getCenter(center)

    // 直接设置相机位置，无插值、无动画
    const offset = new THREE.Vector3(0, 25, 35)
    camera.position.copy(center).add(offset)
    controls.target.copy(center)
}

// 渲染循环
function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
}

// 自适应
window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

onMounted(() => {
    init()
    loadModel()
    initClickEvent()
    animate()
})
</script>

<style>
* {
    margin: 0;
    padding: 0;
}
</style>