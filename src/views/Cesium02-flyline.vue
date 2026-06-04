<template>
  <div ref="container" class="cesium-container"></div>
</template>

<script setup>
import * as Cesium from 'cesium';
import { ref, onMounted } from 'vue';
import flyLineShader from '../shaders/flyline.glsl?raw';
import { createCesiumViewer } from '../utils/cesium-setup';

const container = ref(null);
let viewer = null;

// ==================== Constants ====================
const WUHAN_AIRPORT = {
  name: '武汉天河机场',
  coords: [114.208, 30.783],
};

const DESTINATION_AIRPORTS = [
  { name: '北京首都国际机场', coords: [116.59, 40.08] },
  { name: '上海浦东国际机场', coords: [121.805, 31.143] },
  { name: '广州白云国际机场', coords: [113.3, 23.39] },
  { name: '成都天府国际机场', coords: [104.45, 30.31] },
  { name: '深圳宝安国际机场', coords: [113.81, 22.63] },
  { name: '昆明长水国际机场', coords: [102.93, 25.1] },
  { name: '西安咸阳国际机场', coords: [108.75, 34.44] },
  { name: '重庆江北国际机场', coords: [106.64, 29.72] },
  { name: '杭州萧山国际机场', coords: [120.43, 30.23] },
  { name: '乌鲁木齐地窝堡国际机场', coords: [87.47, 43.9] },
  { name: '哈尔滨太平国际机场', coords: [126.25, 45.62] },
  { name: '拉萨贡嘎国际机场', coords: [90.91, 29.3] },
  { name: '沈阳桃仙国际机场', coords: [123.48, 41.64] },
  { name: '长沙黄花国际机场', coords: [113.22, 28.19] },
];

const GRADIENT_PALETTE = [
  {
    start: Cesium.Color.fromCssColorString('#00E5FF'),
    end: Cesium.Color.fromCssColorString('#18A0FF'),
  },
  {
    start: Cesium.Color.fromCssColorString('#F8FF00'),
    end: Cesium.Color.fromCssColorString('#FF8C00'),
  },
  {
    start: Cesium.Color.fromCssColorString('#FF00FF'),
    end: Cesium.Color.fromCssColorString('#8A2BE2'),
  },
  {
    start: Cesium.Color.fromCssColorString('#00FF7F'),
    end: Cesium.Color.fromCssColorString('#32CD32'),
  },
  {
    start: Cesium.Color.fromCssColorString('#FF4500'),
    end: Cesium.Color.fromCssColorString('#FF0000'),
  },
];

const FLYLINE_SHADER = flyLineShader;

// ==================== Lifecycle ====================
onMounted(() => {
  if (!container.value) return;
  initCesium();
  addAllFlyLines();
  add3dBuildings();
});

// ==================== 1. Init Cesium ====================
function initCesium() {
  viewer = createCesiumViewer(container.value, { terrain: true });
}

// ==================== 2. Parabolic path ====================
function createParabolicPath(start, end, height, count = 100) {
  const startPoint = Cesium.Cartesian3.fromDegrees(start[0], start[1], 0);
  const endPoint = Cesium.Cartesian3.fromDegrees(end[0], end[1], 0);

  const midPoint = Cesium.Cartesian3.add(
    startPoint,
    endPoint,
    new Cesium.Cartesian3()
  );
  Cesium.Cartesian3.multiplyByScalar(midPoint, 0.5, midPoint);

  const up = Cesium.Cartesian3.normalize(midPoint, new Cesium.Cartesian3());
  const controlPoint = Cesium.Cartesian3.add(
    midPoint,
    Cesium.Cartesian3.multiplyByScalar(up, height, new Cesium.Cartesian3()),
    new Cesium.Cartesian3()
  );

  const positions = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p0 = (1 - t) ** 2;
    const p1 = 2 * (1 - t) * t;
    const p2 = t ** 2;

    const point = new Cesium.Cartesian3();
    Cesium.Cartesian3.add(
      Cesium.Cartesian3.multiplyByScalar(
        startPoint,
        p0,
        new Cesium.Cartesian3()
      ),
      Cesium.Cartesian3.multiplyByScalar(
        controlPoint,
        p1,
        new Cesium.Cartesian3()
      ),
      point
    );
    Cesium.Cartesian3.add(
      point,
      Cesium.Cartesian3.multiplyByScalar(endPoint, p2, new Cesium.Cartesian3()),
      point
    );

    positions.push(point);
  }
  return positions;
}

// ==================== 3. Gradient colors ====================
function createGradientColors(startColor, endColor, count = 100) {
  const colors = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    colors.push(Cesium.Color.lerp(startColor, endColor, t, new Cesium.Color()));
  }
  return colors;
}

// ==================== 4. Dynamic flow line ====================
function createDynamicFlowLine(positions, colorPair) {
  const material = new Cesium.Material({
    fabric: {
      type: 'GradientFlowingLineMaterial',
      uniforms: {
        startColor: colorPair.start,
        endColor: colorPair.end,
        speed: 1 + Math.random() * 0.8,
        headsize: 0.05,
        tailsize: 0.5,
        widthoffset: 0.1,
        coresize: 0.05,
      },
      source: FLYLINE_SHADER,
    },
  });

  return new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions,
        width: 12,
        vertexFormat: Cesium.VertexFormat.ALL,
      }),
    }),
    appearance: new Cesium.PolylineMaterialAppearance({ material }),
  });
}

// ==================== 5. Static base line ====================
function createStaticLine(positions) {
  const colors = createGradientColors(
    Cesium.Color.fromCssColorString('#00E5FF88'),
    Cesium.Color.fromCssColorString('#00E5FF22'),
    100
  );

  return new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions,
        width: 3,
        colors,
        colorMode: Cesium.COLORS,
      }),
    }),
    appearance: new Cesium.PolylineColorAppearance(),
  });
}

// ==================== 6. Draw all fly lines ====================
function addAllFlyLines() {
  const allPositions = [];
  const linePointCount = 100;

  DESTINATION_AIRPORTS.forEach((airport, index) => {
    const height = 300000 + Math.random() * 400000;
    const positions = createParabolicPath(
      WUHAN_AIRPORT.coords,
      airport.coords,
      height,
      linePointCount
    );
    allPositions.push(...positions);

    const colorPair = GRADIENT_PALETTE[index % GRADIENT_PALETTE.length];
    const dynamicLine = createDynamicFlowLine(positions, colorPair);
    const staticLine = createStaticLine(positions);

    viewer.scene.primitives.add(dynamicLine);
    viewer.scene.primitives.add(staticLine);
  });

  if (allPositions.length) {
    const sphere = Cesium.BoundingSphere.fromPoints(allPositions);
    viewer.camera.flyToBoundingSphere(sphere, {
      duration: 3,
      offset: new Cesium.HeadingPitchRange(
        0,
        -Cesium.Math.PI_OVER_TWO * 0.9,
        sphere.radius * 2
      ),
    });
  }
}

// ==================== 7. 3D buildings ====================
function add3dBuildings() {
  Cesium.createOsmBuildingsAsync().then((tileset) => {
    viewer.scene.primitives.add(tileset);
  });
}
</script>

<style>
html,
body,
.cesium-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
