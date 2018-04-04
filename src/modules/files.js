import readdir from 'recursive-readdir';
import isVideo from 'is-video';
import path from 'path';
import fs from 'fs';

export default async function(CWD) {
  const files = await readdir(CWD, [
    (file, stats) => !stats.isDirectory() && !isVideo(file)
  ]);

  return files.map(file => {
    const filename = path.basename(file, path.extname(file));
    const subPath = path.join(path.dirname(file), `${filename}.srt`);

    return {
      uri: file,
      filename: path.basename(file),
      srt: fs.existsSync(subPath)
    };
  });
}
