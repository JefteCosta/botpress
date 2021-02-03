import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import mergeSpellChecked from '../election/spellcheck-handler'

import { ScopedModelRepository } from './infrastructure/model-repository'
import { EventUnderstanding } from './typings'

interface BotDefinition {
  defaultLanguage: string
}

export class ScopedPredictionHandler {
  private defaultLanguage: string

  constructor(
    bot: BotDefinition,
    private engine: sdk.NLU.Engine,
    private modelRepo: ScopedModelRepository,
    private modelIdService: typeof sdk.NLU.modelIdService,
    private modelsByLang: _.Dictionary<sdk.NLU.ModelId>,
    private logger: sdk.Logger
  ) {
    this.defaultLanguage = bot.defaultLanguage
  }

  async predict(textInput: string, anticipatedLanguage: string): Promise<EventUnderstanding> {
    const { defaultLanguage } = this

    const modelCacheState = _.mapValues(this.modelsByLang, model => ({ model, loaded: this.engine.hasModel(model) }))

    const missingModels = _(modelCacheState)
      .pickBy(mod => !mod.loaded)
      .mapValues(({ model }) => model)
      .value()

    if (Object.keys(missingModels).length) {
      const formattedMissingModels = JSON.stringify(missingModels, undefined, 2)
      this.logger.warn(
        `About to detect language, but the following models are not loaded: \n${formattedMissingModels}\nMake sure you have enough cache space to fit all models for your bot.`
      )
    }

    const loadedModels = _(modelCacheState)
      .pickBy(mod => mod.loaded)
      .mapValues(({ model }) => model)
      .value()

    let detectedLanguage: string | undefined
    try {
      detectedLanguage = await this.engine.detectLanguage(textInput, loadedModels)
    } catch (err) {
      let msg = `An error occured when detecting language for input "${textInput}"\n`
      msg += `Falling back on default language: ${defaultLanguage}.`
      this.logger.attachError(err).error(msg)
    }

    let nluResults: EventUnderstanding | undefined

    const isDefined = _.negate(_.isUndefined)
    const languagesToTry = _([detectedLanguage, anticipatedLanguage, defaultLanguage])
      .filter(isDefined)
      .uniq()
      .value()

    for (const lang of languagesToTry) {
      nluResults = await this.tryPredictInLanguage(textInput, lang)
      if (!this.isEmpty(nluResults) && !this.isError(nluResults)) {
        break
      }
    }

    if (this.isEmpty(nluResults) || this.isError(nluResults)) {
      throw new Error(`No model found for the following languages: ${languagesToTry}`)
    }

    return { ...nluResults, detectedLanguage }
  }

  private async tryPredictInLanguage(textInput: string, language: string): Promise<EventUnderstanding | undefined> {
    const { modelsByLang } = this
    if (!this.modelsByLang[language] || !this.engine.hasModel(modelsByLang[language])) {
      const model = await this.fetchModel(language, modelsByLang)
      if (!model) {
        return
      }
      modelsByLang[language] = this.modelIdService.toId(model)
      await this.engine.loadModel(model)
    }

    let spellChecked: string | undefined
    try {
      spellChecked = await this.engine.spellCheck(textInput, modelsByLang[language])
    } catch (err) {
      let msg = `An error occured when spell checking input "${textInput}"\n`
      msg += 'Falling back on original input.'
      this.logger.attachError(err).error(msg)
    }

    const t0 = Date.now()
    try {
      const originalOutput = await this.engine.predict(textInput, modelsByLang[language])
      const ms = Date.now() - t0

      if (spellChecked && spellChecked !== textInput) {
        const spellCheckedOutput = await this.engine.predict(spellChecked, modelsByLang[language])
        const merged = mergeSpellChecked(originalOutput, spellCheckedOutput)
        return { ...merged, spellChecked, errored: false, language, ms }
      }
      return { ...originalOutput, spellChecked, errored: false, language, ms }
    } catch (err) {
      const stringId = this.modelIdService.toString(modelsByLang[language])
      const msg = `An error occured when predicting for input "${textInput}" with model ${stringId}`
      this.logger.attachError(err).error(msg)

      const ms = Date.now() - t0
      return { errored: true, spellChecked, language, ms }
    }
  }

  private fetchModel(
    languageCode: string,
    modelsByLang: _.Dictionary<sdk.NLU.ModelId>
  ): Promise<sdk.NLU.Model | undefined> {
    const { modelRepo: modelService } = this

    const modelId = modelsByLang[languageCode]
    if (modelId) {
      return modelService.getModel(modelId)
    }

    const specifications = this.engine.getSpecifications()
    const query = this.modelIdService.briefId({ specifications, languageCode })
    return modelService.getLatestModel(query)
  }

  private isEmpty(nluResults: EventUnderstanding | undefined): nluResults is undefined {
    return !nluResults
  }

  private isError(nluResults: EventUnderstanding): boolean {
    return !nluResults || nluResults.errored
  }
}
