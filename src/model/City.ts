import { BaseModel } from './BaseModel'

export class City extends BaseModel {
  protected init(): void {
    this.scene.add(this.model)
  }
}
