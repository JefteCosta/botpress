import * as sdk from 'botpress/sdk'
import { ModelId, ModelIdService, Model } from 'common/nlu/engine'

import _ from 'lodash'

import { StanClient } from 'src/backend/stan/client'
import mergeSpellChecked from '../../election/spellcheck-handler'
import { mapPredictOutput } from '../../stan/api-mapper'
import { EventUnderstanding } from '../typings'

interface BotDefinition {
  defaultLanguage: string
}

// TODO: rm this class and put all the logic inside Bot. This class no longer has a reason to be.
export class ScopedPredictionHandler {
  private defaultLanguage: string

  constructor(
    bot: BotDefinition,
    private engine: StanClient,
    private modelIdService: ModelIdService,
    private modelsByLang: _.Dictionary<ModelId>,
    private logger: sdk.Logger
  ) {
    this.defaultLanguage = bot.defaultLanguage
  }

  async predict(textInput: string, anticipatedLanguage: string): Promise<EventUnderstanding> {
    const { defaultLanguage } = this

    const password = process.APP_SECRET
    const models = _(this.modelsByLang)
      .values()
      .map(m => ({ modelId: m, password }))
      .value()

    let detectedLanguage: string | undefined
    try {
      detectedLanguage = await this.engine.detectLanguage(textInput, models)
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
    if (!this.modelsByLang[language] || !this.engine.hasModel(this.modelsByLang[language], process.APP_SECRET)) {
      return
    }

    const password = process.APP_SECRET

    const t0 = Date.now()
    try {
      const stanOutput = await this.engine.predict(textInput, this.modelsByLang[language], password)
      const originalOutput = mapPredictOutput(stanOutput)
      const ms = Date.now() - t0

      const { spellChecked } = originalOutput

      if (spellChecked && spellChecked !== textInput) {
        const stanSpellCheckedOutput = await this.engine.predict(spellChecked, this.modelsByLang[language], password)
        const spellCheckedOutput = mapPredictOutput(stanSpellCheckedOutput)
        const merged = mergeSpellChecked(originalOutput, spellCheckedOutput)
        return { ...merged, spellChecked, errored: false, language, ms }
      }
      return { ...originalOutput, spellChecked, errored: false, language, ms }
    } catch (err) {
      const stringId = this.modelIdService.toString(this.modelsByLang[language])
      const msg = `An error occured when predicting for input "${textInput}" with model ${stringId}`
      this.logger.attachError(err).error(msg)

      const ms = Date.now() - t0
      return { errored: true, language, ms }
    }
  }

  private isEmpty(nluResults: EventUnderstanding | undefined): nluResults is undefined {
    return !nluResults
  }

  private isError(nluResults: EventUnderstanding): boolean {
    return !nluResults || nluResults.errored
  }
}
