import * as NLUEngine from 'nlu/engine'
import { EngineInfo, TrainInput, TrainingSession, PredictOutput } from '../typings_v1'

export interface ModelPassword {
  modelId: NLUEngine.ModelId
  password: string
}

export interface Stan {
  getInfo: () => EngineInfo

  startTraining: (trainInput: TrainInput) => NLUEngine.ModelId
  getTrainingStatus: (modelId: NLUEngine.ModelId, password: string) => Promise<TrainingSession>
  cancelTraining: (modelId: NLUEngine.ModelId, password: string) => Promise<void>

  hasModel: (modelId: NLUEngine.ModelId, password: string) => Promise<boolean>

  detectLanguage: (utterances: string[], models: ModelPassword[]) => Promise<string[]>
  predict: (utterances: string[], modelId: NLUEngine.ModelId, password: string) => Promise<PredictOutput[]>
}
