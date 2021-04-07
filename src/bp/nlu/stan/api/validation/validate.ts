import { validate } from 'joi'

import { PreconditionError } from 'nlu/stan/application/errors'
import { PredictInput, TrainInput } from '../../typings_v1'

import { CancelInputSchema, PredictInputSchema, TrainInputSchema } from './schemas'

export async function validateTrainInput(rawInput: any): Promise<TrainInput> {
  try {
    const validatedInput: TrainInput = await validate(rawInput, TrainInputSchema, {})
    return validatedInput
  } catch (err) {
    throw new PreconditionError(err.message)
  }
}

export async function validateCancelRequestInput(rawInput: any): Promise<{ password: string }> {
  try {
    const validated: { password: string } = await validate(rawInput, CancelInputSchema, {})
    return validated
  } catch (err) {
    throw new PreconditionError(err.message)
  }
}

export async function validatePredictInput(rawInput: any): Promise<PredictInput> {
  try {
    const validated: PredictInput = await validate(rawInput, PredictInputSchema, {})
    return validated
  } catch (err) {
    throw new PreconditionError(err.message)
  }
}
