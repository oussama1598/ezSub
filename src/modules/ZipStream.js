import request from 'request';
import unzipper from 'unzipper';
import fs from 'fs';
import os from 'os';
import randomString from 'randomstring';
import path from 'path';
import ProgressBar from 'progress';

export default class ZipStream {
  constructor(url) {
    this.url = url;
    this.zipPath = path.join(os.tmpdir(), `${randomString.generate()}.zip`);
  }

  async getFiles() {
    const zipPath = await this.download();
    const zipStream = await unzipper.Open.file(zipPath);

    return zipStream.files;
  }

  download() {
    let pg = null;

    return new Promise(resolve => {
      request
        .get(this.url)
        .on('response', res => {
          const contentLength = res.headers['content-length'];
          const total = parseInt(contentLength, 10);

          pg = new ProgressBar('  downloading [:bar] :percent', {
            width: 20,
            total
          });
        })
        .on('data', chunk => {
          pg.tick(chunk.length);
        })
        .pipe(fs.createWriteStream(this.zipPath))
        .on('finish', () => resolve(this.zipPath));
    });
  }

  save(entry, uri) {
    return new Promise((resolve, reject) => {
      entry
        .stream()
        .pipe(fs.createWriteStream(uri))
        .on('finish', () => {
          fs.unlink(this.zipPath, err => {
            if (err) return reject(err);

            return resolve();
          });
        });
    });
  }
}
