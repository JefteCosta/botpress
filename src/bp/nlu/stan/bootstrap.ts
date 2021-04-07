import { Logger } from 'botpress/sdk'
import * as NLUEngine from 'nlu/engine'
import { ArgV } from 'nlu/stan'
import { Stan } from './application'
import ModelRepository from './application/model-repo'
import TrainService from './application/train-service'
import TrainSessionService from './application/train-session-service'

const makeEngine = async (options: ArgV, logger: Logger) => {
  const loggerWrapper: NLUEngine.Logger = {
    debug: (msg: string) => logger.debug(msg),
    info: (msg: string) => logger.info(msg),
    warning: (msg: string, err?: Error) => (err ? logger.attachError(err).warn(msg) : logger.warn(msg)),
    error: (msg: string, err?: Error) => (err ? logger.attachError(err).error(msg) : logger.error(msg))
  }

  try {
    const { ducklingEnabled, ducklingURL, modelCacheSize, languageURL, languageAuthToken } = options
    const config: NLUEngine.Config = {
      languageSources: [
        {
          endpoint: languageURL,
          authToken: languageAuthToken
        }
      ],
      ducklingEnabled,
      ducklingURL,
      modelCacheSize,
      legacyElection: false
    }

    const engine = await NLUEngine.makeEngine(config, loggerWrapper)
    return engine
  } catch (err) {
    // TODO: Make lang provider throw if it can't connect.
    logger
      .attachError(err)
      .error(
        'There was an error while initializing Engine tools. Check out the connection to your language and Duckling server.'
      )
    process.exit(1)
  }
}

export const bootstrap = async (options: ArgV, logger: Logger): Promise<Stan> => {
  const engine = await makeEngine(options, logger)

  const modelRepo = new ModelRepository(options.modelDir)
  await modelRepo.init()

  const trainSessionService = new TrainSessionService()

  const trainService = new TrainService(logger, engine, modelRepo, trainSessionService)

  const stan = new Stan(engine, modelRepo, trainSessionService, trainService)
  return stan
}
