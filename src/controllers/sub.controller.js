import _ from 'underscore';
import { prompt } from 'inquirer';
import filesize from 'filesize';
import path from 'path';
import stringSimilarity from 'string-similarity';
import getVideosList from 'modules/files';
import { searchForSubtitles, getDownloadUrl } from 'lib/subscene';
import ZipStream from 'modules/ZipStream';

const CWD = process.cwd();

function stringSim(str1, str2) {
  return stringSimilarity.compareTwoStrings(
    str1.toLowerCase(),
    str2.toLowerCase()
  );
}

function filterFiles(filter, dirStructure) {
  return dirStructure.filter(file => {
    return stringSim(file.filename, filter) > 0.2;
  });
}

function filterSubed(dirStructure) {
  return dirStructure.filter(file => !file.srt);
}

async function showFilesSelection(dirStructure) {
  const filesPrompt = await prompt({
    type: 'checkbox',
    name: 'files',
    message: 'Select a file: ',
    choices: _.sortBy(dirStructure, 'name').map(file => ({
      name: `${file.filename} ${file.srt ? '(SRT)' : ''}`,
      value: file.uri
    }))
  });

  return filesPrompt.files;
}

async function askForQuery(query) {
  const queryPrompt = await prompt({
    type: 'input',
    name: 'query',
    message: 'Search query:',
    default: () => query
  });

  return queryPrompt.query;
}

async function showSubsSelection(subs, query) {
  const subPrompt = await prompt({
    type: 'list',
    name: 'subtitle',
    message: 'Select a subtitle: ',
    choices: [
      {
        name: 'Skip',
        value: 'skip'
      }
    ].concat(
      _.sortBy(subs, 'language').map(sub => {
        const match = (stringSim(sub.name, query) * 100).toFixed(2);
        return {
          name: `${sub.name} (${sub.language}) (${match}%)`,
          value: sub.link
        };
      })
    )
  });

  return subPrompt.subtitle;
}

async function showZipSelection(entries, filename) {
  const srtPrompt = await prompt({
    type: 'list',
    name: 'zipFile',
    message: `Select a file from the zip (${filename}) : `,
    choices: entries.map(entry => ({
      name: `${entry.path} (${filesize(entry.uncompressedSize)})`,
      value: entry
    }))
  });

  return srtPrompt.zipFile;
}

export default async function(
  dirUir = null,
  language = false,
  filter = false,
  showSubed = false
) {
  let dirStructure = await getVideosList(dirUir || CWD);

  if (filter) dirStructure = filterFiles(filter, dirStructure);
  if (!showSubed) dirStructure = filterSubed(dirStructure);

  if (dirStructure.length === 0) return console.log('No Files');

  const files = await showFilesSelection(dirStructure);

  if (files.length === 0) return console.log('No selected files');

  /* eslint-disable no-await-in-loop,no-restricted-syntax, no-continue */
  for (const file of files) {
    const filename = path.basename(file, path.extname(file));
    const query = await askForQuery(filename);

    let subs = await searchForSubtitles(query);

    if (language) {
      subs = subs.filter(
        sub => sub.language.toLowerCase() === language.toLowerCase()
      );
    }
    if (subs.length === 0) {
      console.log(`No subtitles found for ${filename}`);
      continue;
    }

    const subLink = await showSubsSelection(subs, query);

    if (subLink === 'skip') {
      console.log(`Skipped subtitles for ${filename}`);
      continue;
    }

    const downloadUrl = await getDownloadUrl(subLink);
    const zipStream = new ZipStream(downloadUrl);
    const zipFiles = await zipStream.getFiles();
    const selectedEntry = await showZipSelection(zipFiles, filename);

    await zipStream.save(
      selectedEntry,
      path.join(path.dirname(file), `${filename}.srt`)
    );
  }

  return true;
}
