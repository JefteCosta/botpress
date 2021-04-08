import crypto from 'crypto'
import fse, { WriteStream } from 'fs-extra'
import _ from 'lodash'
import mkdirp from 'mkdirp'
import * as NLUEngine from 'nlu/engine'
import { Model, ModelId } from 'nlu/typings_v1'
import path from 'path'
import { Stream } from 'stream'
import tar from 'tar'
import tmp from 'tmp'

export default class ModelRepository {
  constructor(private modelDir: string) {}

  public async init() {
    mkdirp.sync(this.modelDir)
  }

  public async hasModel(modelId: ModelId, password: string): Promise<boolean> {
    const model = await this.getModel(modelId, password)
    return !!model
  }

  public async getModel(modelId: ModelId, password: string): Promise<Model | undefined> {
    const modelFileName = this._makeFileName(modelId, password)

    const { modelDir } = this

    const fpath = path.join(modelDir, modelFileName)
    if (!fse.existsSync(fpath)) {
      return
    }
    const buffStream = new Stream.PassThrough()
    buffStream.end(await fse.readFile(fpath))
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })

    const tarStream = tar.x({ cwd: tmpDir.name, strict: true }, ['model']) as WriteStream
    buffStream.pipe(tarStream)
    await new Promise(resolve => tarStream.on('close', resolve))

    const modelBuff = await fse.readFile(path.join(tmpDir.name, 'model'))
    let mod
    try {
      mod = JSON.parse(modelBuff.toString())
    } catch (err) {
      await fse.remove(fpath)
    } finally {
      tmpDir.removeCallback()
      return mod
    }
  }

  public async saveModel(model: Model, password: string): Promise<void> {
    const { modelDir } = this
    const modelFileName = this._makeFileName(model.id, password)

    const serialized = JSON.stringify(model)

    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const tmpFileName = path.join(tmpDir.name, 'model')
    await fse.writeFile(tmpFileName, serialized)

    const archiveName = path.join(tmpDir.name, modelFileName)
    await tar.create(
      {
        file: archiveName,
        cwd: tmpDir.name,
        portable: true,
        gzip: true
      },
      ['model']
    )
    const buffer = await fse.readFile(archiveName)
    const fpath = path.join(modelDir, modelFileName)
    await fse.writeFile(fpath, buffer)
    tmpDir.removeCallback()
  }

  private _makeFileName(modelId: ModelId, password: string): string {
    const stringId = NLUEngine.modelIdService.toString(modelId)
    const fname = crypto
      .createHash('md5')
      .update(`${stringId}${password}`)
      .digest('hex')

    return `${fname}.model`
  }
}
