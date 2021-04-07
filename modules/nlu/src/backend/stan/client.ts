import { ModelId } from 'common/nlu/engine'
import { EngineInfo, TrainInput, PredictOutput, TrainingSession } from './typings'

const TRAIN_PROGRESS_POLLING_INTERVAL = 500

// TODO: implement this

export class StanClient {
  public async getInfo(): Promise<EngineInfo> {
    return {} as EngineInfo
  }

  public async startTraining(trainInput: TrainInput): Promise<ModelId> {
    return {} as ModelId
  }

  public async waitForTraining(modelId: ModelId, password: string, progressCb: (p: number) => void): Promise<void> {
    return new Promise(resolve => {
      const interval = setInterval(async () => {
        const { status, progress } = await this.getTrainingStatus(modelId, password)

        progressCb(progress)

        if (status === 'done' || status === 'errored') {
          clearInterval(interval)
          resolve()
        }
      }, TRAIN_PROGRESS_POLLING_INTERVAL)
    })
  }

  private async getTrainingStatus(modelId: ModelId, password: string): Promise<TrainingSession> {
    return {} as TrainingSession
  }

  public async cancelTraining(modelId: ModelId, password: string): Promise<void> {}

  public async hasModel(modelId: ModelId, password: string): Promise<boolean> {
    return true
  }

  public async detectLanguage(
    utterances: string[],
    models: { modelId: ModelId; password: string }[]
  ): Promise<string[]> {
    return []
  }

  public async predict(utterances: string[], modelId: ModelId, password: string): Promise<PredictOutput[]> {
    return []
  }
}
