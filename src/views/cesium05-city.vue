<template>
  <div>
    <div ref="cesiumContainer" style="width: 100vw; height: 100vh"></div>
  </div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, onMounted } from 'vue';

const cesiumContainer = ref(null);
let viewer = null;
let model = null;

const initCesium = async () => {
  viewer = new Cesium.Viewer(cesiumContainer.value, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    imageryProvider: false,
    terrainProvider: false,
  });

  // 隐藏地球
  viewer.scene.globe.show = false;
  viewer.scene.skyBox.show = false;
  viewer.scene.sun.show = false;
  viewer.scene.moon.show = false;
  viewer.scene.skyAtmosphere.show = false;
  viewer.scene.fog.enabled = false;

  const longitude = 116.404;
  const latitude = 39.915;
  const height = 0;
  const center = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);

  // 加载模型
  model = await Cesium.Model.fromGltfAsync({
    url: '/gltf/city2.glb',
    scale: 100.0,
    modelMatrix: transform,
  });
  viewer.scene.primitives.add(model);

  // 等待模型完全加载
  await new Promise((resolve) => {
    const checkReady = () => {
      if (model.ready) resolve();
      else requestAnimationFrame(checkReady);
    };
    checkReady();
  });

  console.log('✅ 模型加载完成');

  // 控制 Plane 节点（只能显示/隐藏、缩放，不能改颜色）
  const targetNodeName = "Plane";
  const node = model.getNode(targetNodeName);

  if (node) {
    console.log(`✅ 找到节点：${targetNodeName}`);
    node.show = true; // 保持显示
    node.scale = new Cesium.Cartesian3(1, 1, 1); // 不缩放
  } else {
    console.log(`❌ 未找到节点：${targetNodeName}`);
  }

  // 相机定位
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 2000),
    duration: 1,
  });
};

onMounted(() => {
  initCesium();
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
}
</style>