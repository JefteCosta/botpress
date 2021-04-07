import * as NLUEngine from 'nlu/engine'
import { EngineInfo, TrainInput, TrainingSession, PredictOutput } from '../typings_v1'

export interface Stan {
  getInfo: () => EngineInfo
  startTraining: (trainInput: TrainInput) => NLUEngine.ModelId
  getTrainingStatus: (modelId: NLUEngine.ModelId, password: string) => Promise<TrainingSession>
  hasModel: (modelId: NLUEngine.ModelId, password: string) => Promise<boolean>
  cancelTraining: (modelId: NLUEngine.ModelId, password: string) => Promise<void>
  predict: (utterances: string[], modelId: NLUEngine.ModelId, password: string) => Promise<PredictOutput[]>
}
