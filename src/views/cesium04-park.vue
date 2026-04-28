<template>
  <div class="campus-page">
    <!-- 分层控制面板 -->
    <div class="layer-control">
      <label
        ><input type="checkbox" v-model="showBuilding" @change="changeLayer" />
        🏢 建筑</label
      >
      <label
        ><input type="checkbox" v-model="showDevice" @change="changeLayer" /> 🖥️
        设备</label
      >
      <label
        ><input type="checkbox" v-model="showCamera" @change="changeLayer" /> 🎥
        摄像头</label
      >
      <label
        ><input type="checkbox" v-model="showFire" @change="changeLayer" /> 🧯
        消防栓</label
      >
      <label
        ><input type="checkbox" v-model="showPeople" @change="changeLayer" /> 👤
        人员</label
      >
    </div>

    <!-- Cesium 容器 -->
    <div ref="container" class="cesium-container"></div>
  </div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, onMounted } from 'vue';

const container = ref(null);
let viewer = null;

// ==================== 分层显示开关 ====================
const showBuilding = ref(true);
const showDevice = ref(true);
const showCamera = ref(true);
const showFire = ref(true);
const showPeople = ref(true);

// 实体存储（用于分层控制）
const entityGroup = {
  buildingTileset: null, // 3D建筑
  devices: [],
  cameras: [],
  fires: [],
  peoples: [],
};

// ==================== 园区点位数据 ====================
const pointData = [
  {
    type: 'device',
    name: '一号服务器机房',
    lon: 116.4035,
    lat: 39.9145,
    height: 12,
    status: '运行中',
    param: 'CPU: 28% | 温度: 23℃',
  },
  {
    type: 'device',
    name: '二号配电房',
    lon: 116.4039,
    lat: 39.9147,
    height: 12,
    status: '正常',
    param: '电压: 220V | 电流: 15A',
  },
  {
    type: 'camera',
    name: '北门摄像头',
    lon: 116.4033,
    lat: 39.915,
    height: 8,
    status: '在线',
    param: '实时监控中',
  },
  {
    type: 'camera',
    name: '车库摄像头',
    lon: 116.4041,
    lat: 39.9143,
    height: 8,
    status: '在线',
    param: '实时监控中',
  },
  {
    type: 'fire',
    name: 'A区消防栓',
    lon: 116.4036,
    lat: 39.9142,
    height: 5,
    status: '正常',
    param: '压力: 3.5MPa',
  },
  {
    type: 'fire',
    name: 'B区消防栓',
    lon: 116.404,
    lat: 39.9149,
    height: 5,
    status: '正常',
    param: '压力: 3.4MPa',
  },
  {
    type: 'people',
    name: '运维-张三',
    lon: 116.4037,
    lat: 39.9146,
    height: 3,
    status: '在岗',
    param: '正在巡检',
  },
  {
    type: 'people',
    name: '安保-李四',
    lon: 116.4034,
    lat: 39.9148,
    height: 3,
    status: '在岗',
    param: '门口执勤',
  },
];

// ==================== 生命周期入口 ====================
onMounted(() => {
  if (!container.value) return;
  initCesium();
  loadBuilding();
  addAllPoints();
  bindClickEvent();
  flyToCampus();
});

// ==================== 1. 初始化 Cesium ====================
function initCesium() {
  viewer = new Cesium.Viewer(container.value, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    creditContainer: document.createElement('div'),
  });
  viewer.scene.globe.enableLighting = true;
}

// ==================== 2. 加载 3D 建筑白模 ====================
function loadBuilding() {
  Cesium.createOsmBuildingsAsync().then((tileset) => {
    entityGroup.buildingTileset = viewer.scene.primitives.add(tileset);
  });
}

// ==================== 3. 添加所有点位 ====================
function addAllPoints() {
  pointData.forEach((item) => {
    const entity = viewer.entities.add({
      name: item.name,
      position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat, item.height),
      point: {
        pixelSize: item.type === 'people' ? 13 : 11,
        color: getPointColor(item.type),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: item.name,
        font: '14px sans-serif',
        pixelOffset: new Cesium.Cartesian2(0, -22),
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: item,
    });

    // 分类存入
    if (item.type === 'device') entityGroup.devices.push(entity);
    if (item.type === 'camera') entityGroup.cameras.push(entity);
    if (item.type === 'fire') entityGroup.fires.push(entity);
    if (item.type === 'people') entityGroup.peoples.push(entity);
  });
}

// ==================== 4. 点位颜色 ====================
function getPointColor(type) {
  switch (type) {
    case 'device':
      return Cesium.Color.SKYBLUE;
    case 'camera':
      return Cesium.Color.ORANGE;
    case 'fire':
      return Cesium.Color.RED;
    case 'people':
      return Cesium.Color.LIME;
    default:
      return Cesium.Color.WHITE;
  }
}

// ==================== 5. 点击事件：弹窗 + 相机飞行 ====================
function bindClickEvent() {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  handler.setInputAction((movement) => {
    const pick = viewer.scene.pick(movement.position);
    if (!Cesium.defined(pick) || !Cesium.defined(pick.id)) return;

    const target = pick.id;
    viewer.selectedEntity = target;

    // 相机飞过去
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        target.properties.lon,
        target.properties.lat,
        150
      ),
      duration: 1.3,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
    });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// ==================== 6. 分层控制（已修复报错） ====================
function changeLayer() {
  // 建筑
  if (entityGroup.buildingTileset) {
    entityGroup.buildingTileset.show = showBuilding.value;
  }
  // 设备
  entityGroup.devices.forEach((i) => (i.show = showDevice.value));
  // 摄像头
  entityGroup.cameras.forEach((i) => (i.show = showCamera.value));
  // 消防
  entityGroup.fires.forEach((i) => (i.show = showFire.value));
  // 人员
  entityGroup.peoples.forEach((i) => (i.show = showPeople.value));
}

// ==================== 7. 视角飞到园区 ====================
function flyToCampus() {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.4037, 39.9146, 700),
    duration: 2,
  });
}
</script>

<style scoped>
.campus-page {
  position: relative;
  width: 100%;
  height: 100vh;
}

.layer-control {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 999;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 12px 16px;
  border-radius: 10px;
  user-select: none;
}

.layer-control label {
  display: block;
  margin: 6px 0;
  cursor: pointer;
}

.cesium-container {
  width: 100%;
  height: 100%;
}
</style>

<style>
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
