import bodyParser from 'body-parser'
import cors from 'cors'
import express, { Application, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import _ from 'lodash'
import ms from 'ms'
import * as NLUEngine from 'nlu/engine'

import { authMiddleware, handleErrorLogging, handleUnexpectedError } from '../../../http-utils'
import Logger from '../../../simple-logger'

import { Stan } from '../application'
import { TrainingNotFoundError, ModelNotFoundError, PreconditionError } from '../application/errors'

import { validateCancelRequestInput, validatePredictInput, validateTrainInput } from './validation/validate'

export interface APIOptions {
  host: string
  port: number
  modelDir: string
  authToken?: string
  limitWindow: string
  limit: number
  bodySize: string
  batchSize: number
  silent: boolean
  modelCacheSize: string
}

const debug = DEBUG('api')
const debugRequest = debug.sub('request')

const createExpressApp = (options: APIOptions): Application => {
  const app = express()

  // This must be first, otherwise the /info endpoint can't be called when token is used
  app.use(cors())

  app.use(bodyParser.json({ limit: options.bodySize }))

  app.use((req, res, next) => {
    res.header('X-Powered-By', 'Botpress NLU')
    debugRequest(`incoming ${req.path}`, { ip: req.ip })
    next()
  })

  app.use(handleUnexpectedError)

  if (process.core_env.REVERSE_PROXY) {
    app.set('trust proxy', process.core_env.REVERSE_PROXY)
  }

  if (options.limit > 0) {
    app.use(
      rateLimit({
        windowMs: ms(options.limitWindow),
        max: options.limit,
        message: 'Too many requests, please slow down'
      })
    )
  }

  if (options.authToken?.length) {
    app.use(authMiddleware(options.authToken))
  }

  return app
}

const mapError = (res: Response, err: Error) => {
  const success = false
  if (err instanceof PreconditionError) {
    return res.status(412).send({ success, err: err.message })
  }

  if (err instanceof ModelNotFoundError || err instanceof TrainingNotFoundError) {
    return res.status(404).send({ success, err: err.message })
  }

  return res.status(500).send({ success, error: err.message })
}

export default async function(options: APIOptions, stan: Stan) {
  const app = createExpressApp(options)
  const logger = new Logger('API')

  const router = express.Router({ mergeParams: true })

  router.get('/info', async (req, res) => {
    try {
      const info = stan.getInfo()
      res.send({ success: true, info })
    } catch (err) {
      return mapError(res, err)
    }
  })

  router.post('/train', async (req, res) => {
    try {
      const input = await validateTrainInput(req.body)
      const modelId = stan.startTraining(input)
      return res.send({ success: true, modelId: NLUEngine.modelIdService.toString(modelId) })
    } catch (err) {
      return mapError(res, err)
    }
  })

  router.get('/train/:modelId', async (req, res) => {
    try {
      const { modelId: stringId } = req.params
      if (!_.isString(stringId) || !NLUEngine.modelIdService.isId(stringId)) {
        const errorMsg = `model id "${stringId}" has invalid format`
        throw new PreconditionError(errorMsg)
      }

      const { password } = req.query
      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const session = await stan.getTrainingStatus(modelId, password)
      res.send({ success: true, session })
    } catch (err) {
      return mapError(res, err)
    }
  })

  router.post('/train/:modelId/cancel', async (req, res) => {
    try {
      const { modelId: stringId } = req.params
      const { password } = await validateCancelRequestInput(req.body)

      const modelId = NLUEngine.modelIdService.fromString(stringId)

      await stan.cancelTraining(modelId, password)
    } catch (err) {
      return mapError(res, err)
    }
  })

  router.post('/predict/:modelId', async (req, res) => {
    try {
      const { modelId: stringId } = req.params
      const { utterances, password } = await validatePredictInput(req.body)

      if (!_.isArray(utterances) || (options.batchSize > 0 && utterances.length > options.batchSize)) {
        const errMessage = `Batch size of ${utterances.length} is larger than the allowed maximum batch size (${options.batchSize}).`
        throw new PreconditionError(errMessage)
      }

      const modelId = NLUEngine.modelIdService.fromString(stringId)
      const predictions = await stan.predict(utterances, modelId, password)
      return res.send({ success: true, predictions })
    } catch (err) {
      return mapError(res, err)
    }
  })

  app.use(['/v1', '/'], router)
  app.use(handleErrorLogging)

  const httpServer = createServer(app)

  await Promise.fromCallback(callback => {
    const hostname = options.host === 'localhost' ? undefined : options.host
    httpServer.listen(options.port, hostname, undefined, callback)
  })

  logger.info(`NLU Server is ready at http://${options.host}:${options.port}/`)
  options.silent && logger.silence()
}
