<template>
    <div ref="container" style="width:100vw; height:100vh;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js'
import {
    initThreeScene,
    addStandardLights,
    setupResizeHandler,
    startAnimationLoop,
    screenToNDC,
    raycastFromCamera,
    loadGLTFModel,
} from '../../utils/three-setup'

const container = ref(null)

let ctx = null
let clickableObjects = []

// Drone & city model
let drone = null
let cityModel = null
let cityCenter = new THREE.Vector3()
let cityBox = null

let droneProgress = 0
const DroneConfig = {
    height: 10,
    speed: 0.002,
    scale: 0.03
}

let dronePathLine = null

// Inside-object navigation
let isInsideObject = false
let currentTargetCenter = null

// Drag detection
let mouseDownPos = { x: 0, y: 0 }
let isDragging = false
const dragThreshold = 5

// Keyboard movement
const keys = {}
const moveSpeed = 0.06
const worldDir = new THREE.Vector3()

// Highlight materials
let selectedObject = null
let hoveredObject = null
const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 })
const hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 })

let stats = null

// ==================== 1. Init ====================
function init() {
    ctx = initThreeScene(
        container.value,
        {
            fov: 60,
            near: 0.001,
            far: 2000,
            cameraPosition: [100, 20, 3],
            antialias: true,
            shadowMap: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
            outputColorSpace: THREE.SRGBColorSpace,
        },
        {
            dampingFactor: 0.5,
            rotateSpeed: 0.8,
            zoomSpeed: 1.2,
            panSpeed: 0.8,
            minDistance: 1,
            maxDistance: 200,
            enablePan: true,
            maxPolarAngle: Math.PI / 2 - Math.PI / 180 * 10,
            minPolarAngle: Math.PI / 180 * 10,
        }
    )

    // HDR sky
    const textureLoader = new THREE.TextureLoader()
    const equirectangularTexture = textureLoader.load(
        'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/aerial_grass_rock_1k.hdr',
        () => {
            equirectangularTexture.mapping = THREE.EquirectangularReflectionMapping
            ctx.scene.background = equirectangularTexture
            ctx.scene.environment = equirectangularTexture
            console.log('✅ HDR天空加载成功')
        },
        undefined,
        (err) => {
            console.error('HDR加载失败，使用纯色天空', err)
            ctx.scene.background = new THREE.Color(0x87ceeb)
        }
    )

    addStandardLights(ctx.scene, {
        ambientIntensity: 1,
        directionalIntensity: 1.5,
        directionalPosition: [50, 100, 20],
        castShadow: true,
    })

    stats = new Stats()
    stats.showPanel(0)
    document.body.appendChild(stats.dom)
}

// ==================== 2. Load city model ====================
function loadModel() {
    loadGLTFModel('/gltf/city2.glb', ctx.scene).then((model) => {
        cityModel = model
        cityBox = new THREE.Box3().setFromObject(cityModel)
        cityBox.getCenter(cityCenter)

        cityModel.traverse(child => {
            if (child.isMesh) {
                child.userData.originalMaterial = child.material.clone()
                const box = new THREE.Box3().setFromObject(child)
                const height = box.max.y - box.min.y
                child.userData.height = height
                child.userData.canEnter = height > 3
                clickableObjects.push(child)
            }
        })

        ctx.controls.target.copy(cityCenter)
        ctx.controls.update()
        createDronePath()
        loadDroneModel()
    })
}

// ==================== 3. Drone path ====================
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
    ctx.scene.add(dronePathLine)
}

// ==================== 4. Load drone ====================
function loadDroneModel() {
    loadGLTFModel('/models/drone.glb', ctx.scene).then((model) => {
        drone = model
        drone.scale.set(DroneConfig.scale, DroneConfig.scale, DroneConfig.scale)
    })
}

// ==================== 5. Drone flight ====================
function updateDrone() {
    if (!drone || !cityBox) return

    droneProgress += DroneConfig.speed
    if (droneProgress > 1) droneProgress = 0

    const min = cityBox.min
    const max = cityBox.max
    const width = max.x - min.x
    const depth = max.z - min.z

    let x, z
    const p = droneProgress

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

    const y = cityBox.max.y + DroneConfig.height
    drone.position.set(x, y, z)
    drone.lookAt(x, y, z + 1)
}

// ==================== 6. Click events ====================
function initClickEvent() {
    window.addEventListener('mousedown', e => {
        mouseDownPos.x = e.clientX
        mouseDownPos.y = e.clientY
        isDragging = false
    })

    window.addEventListener('mousemove', e => {
        const dx = e.clientX - mouseDownPos.x
        const dy = e.clientY - mouseDownPos.y
        if (Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
            isDragging = true
        }
    })

    window.addEventListener('mouseup', e => {
        if (isDragging) return

        const ndc = screenToNDC(e)
        const intersects = raycastFromCamera(ctx.camera, ndc, clickableObjects, true)

        if (intersects.length > 0) {
            const obj = intersects[0].object

            if (selectedObject) {
                selectedObject.material = selectedObject.userData.originalMaterial
            }
            selectedObject = obj

            if (!obj.userData.canEnter) {
                console.log('ℹ️ 该物体高度不足3米，无法进入')
                return
            }

            const box = new THREE.Box3().setFromObject(obj)
            const targetCenter = new THREE.Vector3()
            box.getCenter(targetCenter)
            currentTargetCenter = targetCenter

            isInsideObject = true
            const cameraOffset = new THREE.Vector3(1, 0, 0)
            ctx.camera.position.copy(targetCenter.clone().add(cameraOffset.multiplyScalar(0.5)))
            ctx.controls.target.copy(targetCenter)
            console.log('✅ 进入物体内部')
        }
    })
}

// ==================== 7. Mouse hover highlight ====================
function initMouseHover() {
    window.addEventListener('mousemove', e => {
        if (isDragging || isInsideObject) return

        const ndc = screenToNDC(e)
        const intersects = raycastFromCamera(ctx.camera, ndc, clickableObjects, true)

        if (hoveredObject && hoveredObject !== selectedObject) {
            hoveredObject.material = hoveredObject.userData.originalMaterial
        }

        if (intersects.length > 0) {
            hoveredObject = intersects[0].object
            if (hoveredObject !== selectedObject) {
                hoveredObject.material = hoverMaterial
            }
        }
    })
}

// ==================== 8. Keyboard ====================
function initKeyboard() {
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true

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

// ==================== 9. Camera movement inside object ====================
function updateMove() {
    if (!isInsideObject) return

    if (currentTargetCenter && ctx.camera.position.distanceTo(currentTargetCenter) > 5) {
        isInsideObject = false
        if (selectedObject) {
            selectedObject.material = selectedObject.userData.originalMaterial
            selectedObject = null
        }
        console.log('📤 已离开物体')
        return
    }

    ctx.camera.getWorldDirection(worldDir)
    worldDir.y = 0
    worldDir.normalize()

    if (keys['w']) {
        ctx.camera.position.addScaledVector(worldDir, moveSpeed)
    }
    if (keys['s']) {
        ctx.camera.position.addScaledVector(worldDir, -moveSpeed)
    }
}

// ==================== 10. Custom animation update ====================
function onAnimationUpdate() {
    // Camera anti-penetration
    const angle = Math.atan2(
        Math.sqrt(
            (ctx.camera.position.x - ctx.controls.target.x) ** 2 +
            (ctx.camera.position.z - ctx.controls.target.z) ** 2
        ),
        ctx.camera.position.y - ctx.controls.target.y
    )
    if (angle < Math.PI / 180 * 15) {
        ctx.camera.position.y = ctx.controls.target.y +
            Math.sqrt(
                (ctx.camera.position.x - ctx.controls.target.x) ** 2 +
                (ctx.camera.position.z - ctx.controls.target.z) ** 2
            ) / Math.tan(Math.PI / 180 * 15)
    }

    stats.update()
    updateMove()
    updateDrone()
}

// ==================== 11. Lifecycle ====================
onMounted(() => {
    init()
    loadModel()
    initClickEvent()
    initMouseHover()
    initKeyboard()
    startAnimationLoop(ctx, onAnimationUpdate)
    setupResizeHandler(ctx)
})
</script>

<style>
* {
    margin: 0;
    padding: 0;
}
</style>
