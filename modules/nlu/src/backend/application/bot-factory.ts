import * as sdk from 'botpress/sdk'

import { ModelIdService } from 'common/nlu/engine'

import _ from 'lodash'
import { StanClient } from '../stan/client'
import pickSeed from './pick-seed'
import { Bot, IBot } from './scoped/bot'
import { ScopedDefinitionsService, IDefinitionsService } from './scoped/definitions-service'
import { IDefinitionsRepository } from './scoped/infrastructure/definitions-repository'
import { BotDefinition, BotConfig, I } from './typings'

export interface ScopedServices {
  bot: IBot
  defService: IDefinitionsService
}

export type DefinitionRepositoryFactory = (botDef: BotDefinition) => IDefinitionsRepository

export interface ConfigResolver {
  getBotById(botId: string): Promise<BotConfig | undefined>
}

export type IScopedServicesFactory = I<ScopedServicesFactory>

export class ScopedServicesFactory {
  constructor(
    private _engine: StanClient,
    private _logger: sdk.Logger,
    private _modelIdService: ModelIdService,
    private _makeDefRepo: DefinitionRepositoryFactory
  ) {}

  public makeBot = async (botConfig: BotConfig): Promise<ScopedServices> => {
    const { id: botId } = botConfig

    const { defaultLanguage } = botConfig

    const { languages: engineLanguages } = await this._engine.getInfo()
    const languages = _.intersection(botConfig.languages, engineLanguages)
    if (botConfig.languages.length !== languages.length) {
      const missingLangMsg = `Bot ${botId} has configured languages that are not supported by language sources. Configure a before incoming hook to call an external NLU provider for those languages.`
      this._logger.forBot(botId).warn(missingLangMsg, { notSupported: _.difference(botConfig.languages, languages) })
    }

    const botDefinition: BotDefinition = {
      botId,
      defaultLanguage,
      languages,
      seed: pickSeed(botConfig)
    }

    const defRepo = this._makeDefRepo(botDefinition)

    const defService = new ScopedDefinitionsService(botDefinition, this._engine, defRepo, this._modelIdService)

    const bot = new Bot(botDefinition, this._engine, defService, this._modelIdService, this._logger)

    return {
      defService,
      bot
    }
  }
}
