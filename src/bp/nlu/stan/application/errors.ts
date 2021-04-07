import { ModelId, modelIdService } from 'nlu/engine'

export class PreconditionError extends Error {}

export class ModelNotFoundError extends Error {
  constructor(modelId: ModelId) {
    const stringId = modelIdService.toString(modelId)
    super(`Model ${stringId} not found.`)
  }
}

export class TrainingNotFoundError extends Error {
  constructor(modelId: ModelId) {
    const stringId = modelIdService.toString(modelId)
    super(`Training for model ${stringId} not found.`)
  }
}
