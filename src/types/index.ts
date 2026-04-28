import type { Object3D } from 'three'

export interface LoadedModel {
  model: Object3D
  url: string
}

export type LoadSuccessCallback = (models: LoadedModel[]) => void
export type LoadPathList = string[]

export interface SceneConfig {
  bgColor: string
  cameraZ: number
}

export interface MainStoreState {
  userName: string
  sceneConfig: SceneConfig
}
