import crypto from 'crypto'
import LRUCache from 'lru-cache'

import modelIdService from 'nlu/engine/model-id-service'
import { TrainingProgress, ModelId } from '../../typings_v1'

export default class TrainSessionService {
  private trainSessions: {
    [key: string]: TrainingProgress
  } = {}

  // training sessions of this cache will eventually be kicked out so there's no memory leak
  private releasedTrainSessions = new LRUCache<string, TrainingProgress>(1000)

  constructor() {}

  makeTrainingSession = (): TrainingProgress => ({
    status: 'training-pending',
    progress: 0
  })

  getTrainingSession(modelId: ModelId, password: string): TrainingProgress | undefined {
    const key = this._makeTrainSessionKey(modelId, password)
    const ts = this.trainSessions[key]
    if (ts) {
      return ts
    }
    return this.releasedTrainSessions.get(key)
  }

  setTrainingSession(modelId: ModelId, password: string, trainSession: TrainingProgress) {
    const key = this._makeTrainSessionKey(modelId, password)
    if (this.releasedTrainSessions.get(key)) {
      this.releasedTrainSessions.del(key)
    }
    this.trainSessions[key] = trainSession
  }

  releaseTrainingSession(modelId: ModelId, password: string): void {
    const key = this._makeTrainSessionKey(modelId, password)
    const ts = this.trainSessions[key]
    delete this.trainSessions[key]
    this.releasedTrainSessions.set(key, ts)
  }

  private _makeTrainSessionKey(modelId: ModelId, password: string) {
    const stringId = modelIdService.toString(modelId)
    return crypto
      .createHash('md5')
      .update(`${stringId}${password}`)
      .digest('hex')
  }
}
