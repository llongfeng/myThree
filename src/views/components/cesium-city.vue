<template>
    <div id="cesiumContainer" style="width: 100%; height: 100vh; margin: 0; padding: 0"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createCesiumViewer } from '../../utils/cesium-setup';

onMounted(() => {
    const viewer = createCesiumViewer('cesiumContainer', {
        imageryProvider: false,
        terrainProvider: false,
        hideCredits: false,
    });

    viewer.cesiumWidget.creditContainer.style.display = 'none';

    // Gaode base map
    const gaodeVec = new Cesium.UrlTemplateImageryProvider({
        url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    });
    viewer.imageryLayers.addImageryProvider(gaodeVec);

    // Camera view
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(116.39746, 39.90421, 1000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-30),
            roll: 0,
        },
    });

    // Load city model
    viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(116.39746, 39.90421, 10),
        model: {
            uri: '/gltf/city2.glb',
            scale: 15,
            minimumPixelSize: 128,
        },
    });

    console.log('✅ Cesium 初始化完成，底图和模型加载正常');
});
</script>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html,
body {
    width: 100%;
    height: 100%;
    overflow: hidden;
}
</style>
