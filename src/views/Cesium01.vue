<template>
  <div id="cesiumContainer" style="width: 100%; height: 100vh; margin: 0; padding: 0"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import * as Cesium from 'cesium';

Cesium.Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYzFhNDc5Zi1mYjVlLTQ5MDEtODIzOC0xMDc5Njk4ZGJjY2QiLCJpZCI6NDE3MzgzLCJpYXQiOjE3NzYwNjAxNzJ9.VGBInP8aLnTt5ibVkS3ZcXYquQ7OqGjJzWRvHEaf8T4';

onMounted(async () => {
  const viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: false,
    baseLayerPicker: false,
    timeline: true,
    animation: true,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    sceneMode: Cesium.SceneMode.MORPHING,
  });

  viewer.cesiumWidget.creditContainer.style.display = 'none';

  // 鼠标控制
  viewer.scene.screenSpaceCameraController.enableZoom = true;
  viewer.scene.screenSpaceCameraController.enableRotate = true;
  viewer.scene.screenSpaceCameraController.enableTilt = true;
  viewer.scene.screenSpaceCameraController.enablePan = true;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 20000;

  // 高德地图
  const gaodeVec = new Cesium.UrlTemplateImageryProvider({
    url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
  });
  viewer.imageryLayers.addImageryProvider(gaodeVec);

  const gaodeImg = new Cesium.UrlTemplateImageryProvider({
    url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    subdomains: ['1', '2', '3', '4'],
  });
  const layer = viewer.imageryLayers.addImageryProvider(gaodeImg);
  layer.alpha = 0.5;

  // 视角
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.39746, 39.90421, 1000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0,
    },
  });

  // 3D建筑
  Cesium.Cesium3DTileset.fromIonAssetId(2275207).then((tileset) => {
    viewer.scene.primitives.add(tileset);
    console.log('✅ 北京3D建筑加载成功');
  });

  // ===================== 无人机飞行 =====================
  const czmlData = [
    { id: 'document', name: 'Circle-Tiananmen', version: '1.0' },
    {
      id: 'DroneFlight',
      availability: '2025-01-01T00:00:00Z/2025-01-01T00:03:00Z',
      position: {
        epoch: '2025-01-01T00:00:00Z',
        cartographicDegrees: [
          0, 116.39746, 39.90421, 300,
          20, 116.39900, 39.90500, 300,
          40, 116.40000, 39.90421, 300,
          60, 116.39900, 39.90340, 300,
          80, 116.39746, 39.90260, 300,
          100, 116.39590, 39.90340, 300,
          120, 116.39490, 39.90421, 300,
          140, 116.39590, 39.90500, 300,
          160, 116.39746, 39.90421, 300,
        ],
      },
      path: {
        material: { solidColor: { color: { rgba: [0, 255, 255, 230] } } },
        width: 4,
      },
    },
  ];

  Cesium.CzmlDataSource.load(czmlData).then((dataSource) => {
    viewer.dataSources.add(dataSource);
    const drone = dataSource.entities.getById('DroneFlight');

    drone.model = {
      uri: '/models/drone.glb',
      scale: 0.15,
    };
    drone.orientation = new Cesium.VelocityOrientationProperty(drone.position);

    viewer.clock.multiplier = 1.5;
    viewer.clock.shouldAnimate = true;
  });

  // ==============================================
  // 🔥 🔥 🔥 修复：点击建筑 → 正常显示，不黑屏
  // ==============================================
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement) => {
    const pick = viewer.scene.pick(movement.position);
    if (!pick || !pick.id) return;

    // 获取点击点坐标
    const cartesian = viewer.scene.globe.pick(
      viewer.camera.getPickRay(movement.position),
      viewer.scene
    );
    if (!cartesian) return;

    // ✅ 关键：相机抬升 30 米，防止扎进地下 / 模型内部
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    cartographic.height += 30; // 安全高度
    const safePosition = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height
    );

    // ✅ 相机飞到点击点上方
    viewer.camera.flyTo({
      destination: safePosition,
      orientation: {
        heading: viewer.camera.heading,
        pitch: Cesium.Math.toRadians(-15), // 向下看，不黑屏
        roll: 0.0,
      },
      duration: 0.5,
    });

    console.log('✅ 点击建筑，相机已安全定位');
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
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