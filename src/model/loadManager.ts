import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { LoadPathList, LoadSuccessCallback, LoadedModel } from '@/types'

/**
 * Load model list and return loaded objects.
 *
 * @param pathList file path array
 * @param suc callback when all files are loaded
 */
export const loadManager = (pathList: LoadPathList, suc: LoadSuccessCallback) => {
  const gltfLoader = new GLTFLoader()
  const fbxLoader = new FBXLoader()
  // 保存加载成功模型对象数组
  const model: LoadedModel[] = []
  let loadedCount = 0

  pathList.forEach((path) => {
    if (path.toLowerCase().endsWith('.fbx')) {
      fbxLoader.load(
        path,
        (obj) => {
          model.push({
            model: obj,
            url: path
          })
          loadedCount += 1
          if (loadedCount === pathList.length) {
            suc(model)
          }
        },
        undefined,
        (error) => {
          console.error('FBX load error:', path, error)
          loadedCount += 1
          if (loadedCount === pathList.length) {
            suc(model)
          }
        }
      )
    } else if (path.toLowerCase().endsWith('.glb') || path.toLowerCase().endsWith('.gltf')) {
      gltfLoader.load(
        path,
        (obj) => {
          model.push({
            model: obj.scene,
            url: path
          })
          loadedCount += 1
          if (loadedCount === pathList.length) {
            suc(model)
          }
        },
        undefined,
        (error) => {
          console.error('GLTF load error:', path, error)
          loadedCount += 1
          if (loadedCount === pathList.length) {
            suc(model)
          }
        }
      )
    } else {
      console.warn('Unsupported model type:', path)
      loadedCount += 1
      if (loadedCount === pathList.length) {
        suc(model)
      }
    }
  })
}
