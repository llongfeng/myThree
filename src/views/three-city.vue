<template>
    <div ref="container" style="width:100vw; height:100vh;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import {
    initThreeScene,
    addStandardLights,
    setupResizeHandler,
    startAnimationLoop,
    screenToNDC,
    raycastFromCamera,
    loadGLTFModel,
} from '../utils/three-setup'

const container = ref(null)
let ctx = null
let clickableObjects = []

function init() {
    ctx = initThreeScene(
        container.value,
        { fov: 60, near: 0.1, far: 2000, cameraPosition: [120, 200, 120], background: 0x111111, shadowMap: true },
        { dampingFactor: 0.05, enableZoom: true, enablePan: true }
    )

    addStandardLights(ctx.scene, {
        ambientIntensity: 1,
        directionalIntensity: 1.5,
        directionalPosition: [50, 100, 50],
    })
}

function loadModel() {
    loadGLTFModel('/gltf/city2.glb', ctx.scene).then((model) => {
        console.log('✅ 模型加载完成')
        model.traverse(child => {
            if (child.isMesh) {
                if (child.name === 'Plane_1') {
                    child.raycast = () => { }
                } else {
                    clickableObjects.push(child)
                }
            }
        })
    })
}

function initClickEvent() {
    window.addEventListener('click', (e) => {
        const ndc = screenToNDC(e)
        const intersects = raycastFromCamera(ctx.camera, ndc, clickableObjects, true)

        if (intersects.length > 0) {
            const obj = intersects[0].object
            console.log('点击到了：', obj.name)
            focusObject(obj)
        }
    })
}

function focusObject(obj) {
    const box = new THREE.Box3().setFromObject(obj)
    const center = new THREE.Vector3()
    box.getCenter(center)

    const offset = new THREE.Vector3(0, 25, 35)
    ctx.camera.position.copy(center).add(offset)
    ctx.controls.target.copy(center)
}

onMounted(() => {
    init()
    loadModel()
    initClickEvent()
    startAnimationLoop(ctx)
    setupResizeHandler(ctx)
})
</script>

<style>
* {
    margin: 0;
    padding: 0;
}
</style>
