import * as sdk from 'botpress/sdk'

import * as NLUEngine from 'nlu/engine'

import { IntentDefinition, EntityDefinition, TrainSet, ModelId } from 'nlu/typings_v1'
import ModelRepository from './model-repo'
import TrainSessionService from './train-session-service'

export default class TrainService {
  constructor(
    private logger: sdk.Logger,
    private engine: NLUEngine.Engine,
    private modelRepo: ModelRepository,
    private trainSessionService: TrainSessionService
  ) {}

  train = async (
    modelId: ModelId,
    password: string,
    intents: IntentDefinition[],
    entities: EntityDefinition[],
    language: string,
    nluSeed: number
  ) => {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    this.logger.info(`[${stringId}] Training Started.`)

    const ts = this.trainSessionService.makeTrainingSession()
    this.trainSessionService.setTrainingSession(modelId, password, ts)

    const progressCallback = (progress: number) => {
      if (ts.status === 'training-pending') {
        ts.status = 'training'
      }
      ts.progress = progress
      this.trainSessionService.setTrainingSession(modelId, password, ts)
    }

    try {
      const trainSet: TrainSet = {
        intents,
        entities,
        language,
        seed: nluSeed
      }
      const model = await this.engine.train(stringId, trainSet, { progressCallback })
      this.logger.info(`[${stringId}] Training Done.`)

      await this.modelRepo.saveModel(model, password)
      ts.status = 'done'
      this.trainSessionService.setTrainingSession(modelId, password, ts)
      this.trainSessionService.releaseTrainingSession(modelId, password)
    } catch (err) {
      if (NLUEngine.errors.isTrainingCanceled(err)) {
        this.logger.info(`[${stringId}] Training Canceled.`)

        ts.status = 'canceled'
        this.trainSessionService.setTrainingSession(modelId, password, ts)
        this.trainSessionService.releaseTrainingSession(modelId, password)
        return
      }

      if (NLUEngine.errors.isTrainingAlreadyStarted(err)) {
        this.logger.error('training already started')
        return
      }

      ts.status = 'errored'
      this.trainSessionService.setTrainingSession(modelId, password, ts)
      this.trainSessionService.releaseTrainingSession(modelId, password)
      this.logger.attachError(err).error('an error occured during training')
      return
    }
  }
}
