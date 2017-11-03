import request from 'request'
import unzip from 'unzip'
import fs from 'fs'
import path from 'path'

export function downloadSub (url, uri) {
  return new Promise((resolve, reject) => {
    let downloaded = false

    request.get(url)
      .pipe(unzip.Parse())
      .on('entry', entry => {
        if (path.extname(entry.path) !== '.srt' || downloaded) return entry.autodrain()

        entry.pipe(fs.createWriteStream(uri))
        downloaded = true
        resolve()
      })
      .on('finish', () => {
        if (!downloaded) {
          reject(new Error('No srt file found in this package'))
        }
      })
  })
}
