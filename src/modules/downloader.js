import request from 'request'
import unzipper from 'unzipper'
import fs from 'fs'
import os from 'os'
import randomString from 'randomstring'
import path from 'path'
import ProgressBar from 'progress'

function downloadZip (url) {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(os.tmpdir(), `${randomString.generate()}.zip`)
    let progressBar = null

    request.get(url)
      .on('response', res => {
        const total = parseInt(res.headers['content-length'], 10)

        progressBar = new ProgressBar('  downloading [:bar] :percent', {
          width: 20,
          total
        })
      })
      .on('data', chunk => {
        progressBar.tick(chunk.length)
      })
      .pipe(fs.createWriteStream(zipPath))
      .on('finish', () => resolve(zipPath))
  })
}

export async function extractSub (url) {
  const zipPath = await downloadZip(url)
  const zipStream = await unzipper.Open.file(zipPath)

  return zipStream.files.map(file => Object.assign({
    zipPath
  }, file))
}

export function saveEntry (entry, uri) {
  return new Promise((resolve, reject) => {
    entry.stream().pipe(fs.createWriteStream(uri))
      .on('finish', () => {
        fs.unlink(entry.zipPath, (err) => {
          if (err) return reject(err)

          resolve()
        })
      })
  })
}
