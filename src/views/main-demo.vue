<template>
    <div class="wrap">
        <div class="header">
            <h2>Vue3+Three+Cesium 三维可视化平台</h2>
            <div class="btn-group">
                <button :class="{ active: page === 'three' }" @click="page = 'three'">
                    Three建筑模型
                </button>
                <button :class="{ active: page === 'cesium' }" @click="page = 'cesium'">
                    Cesium城市GIS
                </button>
                <button :class="{ active: page === 'fly' }" @click="page = 'fly'">
                    Cesium城市飞线
                </button>
                <button :class="{ active: page === 'orbit' }" @click="page = 'orbit'">
                    Cesium城市
                </button>
            </div>
        </div>

        <div class="content">
            <ThreeEngine v-show="page === 'three'" ref="threeRef" />
            <CesiumEngine v-show="page === 'cesium'" ref="cesiumRef" />
            <CesiumFly v-show="page === 'fly'"></CesiumFly>
            <Orbit v-show="page === 'orbit'"></Orbit>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ThreeEngine from './components/ThreeEngine.vue'
import CesiumEngine from './components/CesiumEngine.vue'
import CesiumFly from './Cesium02-flyline.vue'
import Cesium from './Cesium02-flyline.vue'
import Orbit from './components/cesium-city.vue'

const page = ref('three')
const threeRef = ref(null)
const cesiumRef = ref(null)

// watch(page, (newVal) => {
//     if (newVal === 'three') {
//         threeRef.value?.destroy()
//     } else {
//         cesiumRef.value?.destroy()
//     }
// })
</script>

<style scoped>
.wrap {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #000;
}

.header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    z-index: 999;
    box-sizing: border-box;
}

.header h2 {
    color: #fff;
    margin: 0;
    font-size: 18px;
}

.btn-group button {
    margin-left: 12px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: #409eff;
    color: #fff;
    cursor: pointer;
}

.btn-group button.active {
    background: #67c23a;
}

.content {
    width: 100%;
    height: 100%;
}
</style>