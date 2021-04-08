import * as sdk from 'botpress/sdk'
import { mapTrainSet } from '../../stan/api-mapper'
import { StanClient } from '../../stan/client'
import modelIdService from '../../stan/model-id-service'
import { ModelId } from '../../stan/typings'
import { I } from '../typings'
import { IDefinitionsRepository } from './infrastructure/definitions-repository'

type DirtyModelCallback = (language: string) => Promise<void>

interface BotDefinition {
  languages: string[]
  seed: number
}

export type IDefinitionsService = I<ScopedDefinitionsService>

export class ScopedDefinitionsService {
  private _languages: string[]
  private _seed: number

  private _needTrainingWatcher: sdk.ListenHandle

  private _dirtyModelsListeners: DirtyModelCallback[] = []

  constructor(
    bot: BotDefinition,
    private _engine: StanClient,
    private _definitionRepository: IDefinitionsRepository,
    private _modelIdService: typeof modelIdService
  ) {
    this._languages = bot.languages
    this._seed = bot.seed
  }

  public async initialize() {
    this._needTrainingWatcher = this._registerNeedTrainingWatcher()
  }

  public async teardown() {
    this._needTrainingWatcher.remove()
  }

  public listenForDirtyModels = (listener: DirtyModelCallback) => {
    this._dirtyModelsListeners.push(listener)
  }

  public async getLatestModelId(languageCode: string): Promise<ModelId> {
    const { _engine } = this

    const trainSet = await this.getTrainSet(languageCode)

    const { specs } = await _engine.getInfo()
    return this._modelIdService.makeId({
      ...trainSet,
      specifications: specs
    })
  }

  public async getTrainSet(languageCode: string) {
    const trainDefinitions = await this._definitionRepository.getTrainDefinitions()

    const trainSet = mapTrainSet({
      ...trainDefinitions,
      languageCode,
      seed: this._seed
    })

    return trainSet
  }

  private _registerNeedTrainingWatcher = () => {
    return this._definitionRepository.onFileChanged(async filePath => {
      const hasPotentialNLUChange = filePath.includes('/intents/') || filePath.includes('/entities/')
      if (!hasPotentialNLUChange) {
        return
      }

      await Promise.filter(this._languages, async l => {
        const modelId = await this.getLatestModelId(l)
        return !this._engine.hasModel(modelId, process.APP_SECRET)
      }).mapSeries(this._notifyListeners)
    })
  }

  private _notifyListeners = (language: string) => {
    return Promise.mapSeries(this._dirtyModelsListeners, l => l(language))
  }
}
