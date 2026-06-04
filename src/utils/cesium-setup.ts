import * as Cesium from 'cesium'

export interface CesiumViewerOptions {
  terrain?: boolean
  animation?: boolean
  timeline?: boolean
  baseLayerPicker?: boolean
  geocoder?: boolean
  homeButton?: boolean
  sceneModePicker?: boolean
  navigationHelpButton?: boolean
  fullscreenButton?: boolean
  hideCredits?: boolean
  imageryProvider?: boolean
  terrainProvider?: boolean
  sceneMode?: Cesium.SceneMode
  enableLighting?: boolean
}

const CESIUM_DEFAULTS: CesiumViewerOptions = {
  animation: false,
  timeline: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  fullscreenButton: false,
  hideCredits: true,
}

/**
 * Create a Cesium Viewer with sensible defaults (all chrome hidden).
 * Pass overrides to enable specific controls.
 */
export function createCesiumViewer(
  container: HTMLElement | string,
  opts: CesiumViewerOptions = {}
): Cesium.Viewer {
  const merged = { ...CESIUM_DEFAULTS, ...opts }

  const viewerOpts: Cesium.Viewer.ConstructorOptions = {
    animation: merged.animation,
    timeline: merged.timeline,
    baseLayerPicker: merged.baseLayerPicker,
    geocoder: merged.geocoder,
    homeButton: merged.homeButton,
    sceneModePicker: merged.sceneModePicker,
    navigationHelpButton: merged.navigationHelpButton,
    fullscreenButton: merged.fullscreenButton,
  }

  if (merged.terrain) {
    viewerOpts.terrain = Cesium.Terrain.fromWorldTerrain()
  }

  if (merged.imageryProvider === false) {
    viewerOpts.imageryProvider = false as any
  }

  if (merged.terrainProvider === false) {
    viewerOpts.terrainProvider = false as any
  }

  if (merged.sceneMode !== undefined) {
    viewerOpts.sceneMode = merged.sceneMode
  }

  if (merged.hideCredits) {
    viewerOpts.creditContainer = document.createElement('div')
  }

  const viewer = new Cesium.Viewer(container, viewerOpts)

  if (merged.enableLighting) {
    viewer.scene.globe.enableLighting = true
  }

  return viewer
}

export type CesiumClickCallback = (
  pick: any,
  cartesian: Cesium.Cartesian3 | undefined,
  movement: { position: Cesium.Cartesian2 }
) => void

/**
 * Set up a left-click handler on a Cesium viewer.
 * The callback receives the picked object, the globe pick position, and the raw movement.
 */
export function setupCesiumClickHandler(
  viewer: Cesium.Viewer,
  callback: CesiumClickCallback
): Cesium.ScreenSpaceEventHandler {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
    const pick = viewer.scene.pick(movement.position)
    const ray = viewer.camera.getPickRay(movement.position)
    const cartesian = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined
    callback(pick, cartesian, movement)
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  return handler
}
