<template>
    <div class="three-page" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ThreeBase } from '../utils/three'
import * as THREE from 'three'

const container = ref<HTMLElement | null>(null)
let three: ThreeBase | null = null

onMounted(() => {
    if (!container.value) return
    three = new ThreeBase(container.value)
    three.addModel('/gltf/house.glb', (model) => {
        model.model.scale.set(1, 1, 1)
    })
})

const handleResize = () => three?.resize()
window.addEventListener('resize', handleResize)

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.three-page {
    width: 100%;
    height: 100vh;
}
</style>