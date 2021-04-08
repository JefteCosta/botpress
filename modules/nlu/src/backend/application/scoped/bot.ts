import * as sdk from 'botpress/sdk'
import * as NLU from 'common/nlu/engine'
import _ from 'lodash'
import { StanClient } from 'src/backend/stan/client'
import { mapTrainInput } from '../../stan/api-mapper'
import { BotDoesntSpeakLanguageError } from '../errors'
import { Predictor, ProgressCallback, Trainable, I } from '../typings'

import { IDefinitionsService } from './definitions-service'
import { ScopedPredictionHandler } from './prediction-handler'

interface BotDefinition {
  botId: string
  defaultLanguage: string
  languages: string[]
}

export type IBot = I<Bot>

export class Bot implements Trainable, Predictor {
  private _botId: string
  private _defaultLanguage: string
  private _languages: string[]

  private _modelsByLang: _.Dictionary<NLU.ModelId> = {}
  private _trainingByLang: _.Dictionary<NLU.ModelId> = {}

  private _predictor: ScopedPredictionHandler

  constructor(
    bot: BotDefinition,
    private _engine: StanClient,
    private _defService: IDefinitionsService,
    private _modelIdService: typeof NLU.modelIdService,
    private _logger: sdk.Logger
  ) {
    this._botId = bot.botId
    this._defaultLanguage = bot.defaultLanguage
    this._languages = bot.languages

    this._predictor = new ScopedPredictionHandler(
      {
        defaultLanguage: this._defaultLanguage
      },
      _engine,
      this._modelIdService,
      this._modelsByLang,
      this._logger
    )
  }

  public async mount() {
    await this._defService.initialize()
  }

  public async unmount() {
    await this._defService.teardown()
    for (const [_botId, modelId] of Object.entries(this._modelsByLang)) {
      delete this._modelsByLang[modelId.languageCode]
    }
  }

  public load = async (modelId: NLU.ModelId) => {
    this._modelsByLang[modelId.languageCode] = modelId
  }

  public train = async (language: string, progressCallback: ProgressCallback): Promise<NLU.ModelId> => {
    const { _engine, _languages, _defService, _botId } = this

    if (!_languages.includes(language)) {
      throw new BotDoesntSpeakLanguageError(_botId, language)
    }

    const trainSet: NLU.TrainingSet = await _defService.getTrainSet(language)

    const previousModel = this._modelsByLang[language]
    const options: NLU.TrainingOptions = { previousModel, progressCallback }

    const password = process.APP_SECRET
    const stanTrainInput = mapTrainInput(trainSet, options, password)
    const modelId: NLU.ModelId = await _engine.startTraining(stanTrainInput)

    this._trainingByLang[modelId.languageCode] = modelId

    await _engine.waitForTraining(modelId, password, progressCallback)

    delete this._trainingByLang[modelId.languageCode]

    return modelId
  }

  public cancelTraining = async (language: string) => {
    if (!this._languages.includes(language)) {
      throw new BotDoesntSpeakLanguageError(this._botId, language)
    }
    if (!this._trainingByLang[language]) {
      return
    }

    const password = process.APP_SECRET
    return this._engine.cancelTraining(this._trainingByLang[language], password)
  }

  public predict = async (textInput: string, anticipatedLanguage?: string) => {
    const { _predictor, _defaultLanguage } = this
    return _predictor.predict(textInput, anticipatedLanguage ?? _defaultLanguage)
  }

  private _makeTrainingId = (language: string) => {
    return `${this._botId}:${language}`
  }
}
