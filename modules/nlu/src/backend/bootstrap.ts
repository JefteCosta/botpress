import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import { Config } from '../config'

import { getWebsocket } from './api'
import { NLUApplication } from './application'
import { ScopedServicesFactory } from './application/bot-factory'
import { BotService } from './application/bot-service'
import { DistributedTrainingQueue } from './application/distributed-training-queue'
import { ScopedDefinitionsRepository } from './application/scoped/infrastructure/definitions-repository'
import { TrainingRepository } from './application/training-repo'
import { BotDefinition } from './application/typings'
import { StanClient } from './stan/client'
import modelIdService from './stan/model-id-service'

export async function bootStrap(bp: typeof sdk): Promise<NLUApplication> {
  const globalConfig: Config = await bp.config.getModuleConfig('nlu')

  const { maxTrainingPerInstance, queueTrainingOnBotMount, legacyElection } = globalConfig

  if (legacyElection) {
    bp.logger.warn(
      'You are still using legacy election which is deprecated. Set { legacyElection: false } in your global nlu config to use the new election pipeline.'
    )
  }

  // const logger = <NLU.Logger>{
  //   info: (msg: string) => bp.logger.info(msg),
  //   warning: (msg: string, err?: Error) => (err ? bp.logger.attachError(err).warn(msg) : bp.logger.warn(msg)),
  //   error: (msg: string, err?: Error) => (err ? bp.logger.attachError(err).error(msg) : bp.logger.error(msg))
  // }

  const socket = getWebsocket(bp)

  const botService = new BotService()

  const makeDefRepo = (bot: BotDefinition) => new ScopedDefinitionsRepository(bot, bp)

  const stanClient = new StanClient()
  const servicesFactory = new ScopedServicesFactory(stanClient, bp.logger, modelIdService, makeDefRepo)

  const trainRepo = new TrainingRepository(bp.database)
  const trainingQueue = new DistributedTrainingQueue(
    trainRepo,
    {}, // nlu errors checkers
    bp.logger,
    botService,
    bp.distributed,
    socket,
    { maxTraining: maxTrainingPerInstance }
  )
  await trainingQueue.initialize()
  const application = new NLUApplication(
    trainingQueue,
    stanClient,
    servicesFactory,
    botService,
    queueTrainingOnBotMount
  )

  return application
}
