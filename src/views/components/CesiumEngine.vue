<template>
    <div ref="container" class="cesium-box"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

const container = ref(null)
let viewer = null

// 初始化 Cesium 地球
function initCesium() {
    // 1. 创建地球
    viewer = new Cesium.Viewer(container.value, {
        terrain: Cesium.Terrain.fromWorldTerrain(), // 开启三维地形
        timeline: false,
        animation: false,
        baseLayerPicker: true,
        geocoder: false,
        homeButton: false,
        navigationHelpButton: false,
    })

    // 2. 隐藏版权信息
    viewer.cesiumWidget.creditContainer.style.display = 'none'

    // 3. 飞行到目标城市（你可以改成你公司/家乡坐标）
    flyToLocation()

    // 4. 添加点位标注
    addPoint()
}

// 飞行定位
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

// 添加点位 + 文字标签
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

// 销毁 Cesium（切换页面必须）
const destroy = () => {
    if (viewer) {
        viewer.destroy()
        viewer = null
    }
}

// 窗口自适应
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