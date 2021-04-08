import { Logger } from 'botpress/sdk'
import _ from 'lodash'
import * as NLUEngine from 'nlu/engine'

import { PredictOutput, TrainInput, EngineInfo, TrainingSession } from '../typings_v1'
import { BpPredictOutput, mapPredictOutput, mapTrainInput } from './api-mapper'
import { ModelNotFoundError, TrainingNotFoundError } from './errors'
import ModelRepository from './model-repo'
import { assertTrainInput } from './pre-conditions'
import TrainService from './train-service'
import TrainSessionService from './train-session-service'
import { Stan as IStan, ModelPassword } from './typings'

export interface Options {
  modelDir: string
  modelCacheSize: string
}

/**
 * TODO: this app requires a way to delete old models, but it has no concept of bot/owner and no method to delete models
 */
export class Stan implements IStan {
  constructor(
    private engine: NLUEngine.Engine,
    private modelRepo: ModelRepository,
    private trainSessionService: TrainSessionService,
    private trainService: TrainService,
    private logger: Logger
  ) {}

  public getInfo(): EngineInfo {
    const specs = this.engine.getSpecifications()
    const health = this.engine.getHealth()
    const languages = this.engine.getLanguages()
    return { specs, health, languages }
  }

  public startTraining(trainInput: TrainInput): NLUEngine.ModelId {
    trainInput = assertTrainInput(trainInput)

    const { intents, entities, seed, language, password } = mapTrainInput(trainInput)
    const pickedSeed = seed ?? Math.round(Math.random() * 10000)
    const modelId = NLUEngine.modelIdService.makeId({
      specifications: this.engine.getSpecifications(),
      intentDefs: intents,
      entityDefs: entities,
      languageCode: language,
      seed: pickedSeed
    })

    // return the modelId as fast as possible
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.trainService.train(modelId, password, intents, entities, language, pickedSeed)
    return modelId
  }

  public async getTrainingStatus(modelId: NLUEngine.ModelId, password: string): Promise<TrainingSession> {
    let session = this.trainSessionService.getTrainingSession(modelId, password)

    if (!session) {
      const model = await this.modelRepo.getModel(modelId, password ?? '')

      if (!model) {
        throw new ModelNotFoundError(modelId)
      }

      const stringId = NLUEngine.modelIdService.toString(modelId)
      session = {
        key: stringId, // this is wrong
        status: 'done',
        progress: 1,
        language: modelId.languageCode
      }
    }

    return session
  }

  public async hasModel(modelId: NLUEngine.ModelId, password: string): Promise<boolean> {
    if (this.engine.hasModel(modelId)) {
      return true
    }
    return this.modelRepo.hasModel(modelId, password)
  }

  public async cancelTraining(modelId: NLUEngine.ModelId, password: string): Promise<void> {
    const session = this.trainSessionService.getTrainingSession(modelId, password)

    if (session?.status === 'training') {
      await this.engine.cancelTraining(session.key)
      return
    }

    throw new TrainingNotFoundError(modelId)
  }

  public async detectLanguage(utterances: string[], models: ModelPassword[]) {
    for (const { modelId, password } of models) {
      if (!this.engine.hasModel(modelId)) {
        const model = await this.modelRepo.getModel(modelId, password)
        if (!model) {
          throw new ModelNotFoundError(modelId)
        }
        await this.engine.loadModel(model) // try to load everything in cache
      }
    }

    const modelCacheState = _.map(models, ({ modelId }) => ({
      model: modelId,
      loaded: this.engine.hasModel(modelId)
    }))

    const missingModels = _(modelCacheState)
      .filter(mod => !mod.loaded)
      .map(({ model }) => model)
      .value()

    if (missingModels.length) {
      const formattedMissingModels = JSON.stringify(missingModels, undefined, 2)
      this.logger.warn(
        `About to detect language, but the following models are not loaded: \n${formattedMissingModels}\nMake sure you have enough cache space to fit all models for your bot.`
      )
    }

    const loadedModels = _(modelCacheState)
      .filter(mod => mod.loaded)
      .map(({ model }) => model)
      .keyBy(m => m.languageCode)
      .value()

    const predictions: string[] = await Promise.map(utterances, async utterance => {
      const detectedLanguage = await this.engine.detectLanguage(utterance, loadedModels)
      return detectedLanguage
    })

    return predictions
  }

  public async predict(utterances: string[], modelId: NLUEngine.ModelId, password: string): Promise<PredictOutput[]> {
    // TODO: once the model is loaded, there's no more password check (to fix)
    if (!this.engine.hasModel(modelId)) {
      const model = await this.modelRepo.getModel(modelId, password)
      if (!model) {
        throw new ModelNotFoundError(modelId)
      }
      await this.engine.loadModel(model)
    }

    const rawPredictions: BpPredictOutput[] = await Promise.map(utterances as string[], async utterance => {
      const detectedLanguage = await this.engine.detectLanguage(utterance, { [modelId.languageCode]: modelId })
      const { entities, predictions, spellChecked } = await this.engine.predict(utterance, modelId)
      return { entities, contexts: predictions, spellChecked, detectedLanguage, utterance }
    })

    const formatedPredictions: PredictOutput[] = rawPredictions.map(mapPredictOutput)
    return formatedPredictions
  }
}
