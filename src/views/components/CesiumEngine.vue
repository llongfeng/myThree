<template>
    <div ref="container" class="cesium-box"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { createCesiumViewer } from '../../utils/cesium-setup'

const container = ref(null)
let viewer = null

function initCesium() {
    viewer = createCesiumViewer(container.value, {
        terrain: true,
        baseLayerPicker: true,
        hideCredits: false,
    })

    viewer.cesiumWidget.creditContainer.style.display = 'none'

    flyToLocation()
    addPoint()
}

function flyToLocation() {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.39748, 39.90882, 2000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0.0
        },
        duration: 2
    })
}

function addPoint() {
    viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(116.39748, 39.90882, 50),
        point: {
            color: Cesium.Color.RED,
            pixelSize: 10,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
        },
        label: {
            text: "学习成果展示点",
            font: "16px sans-serif",
            fillColor: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
        }
    })
}

const destroy = () => {
    if (viewer) {
        viewer.destroy()
        viewer = null
    }
}

const resize = () => {
    if (viewer) {
        viewer.resize()
    }
}

onMounted(() => {
    initCesium()
    window.addEventListener('resize', resize)
})

onUnmounted(() => {
    destroy()
    window.removeEventListener('resize', resize)
})

defineExpose({ destroy })
</script>

<style scoped>
.cesium-box {
    width: 100%;
    height: 100%;
}
</style>
