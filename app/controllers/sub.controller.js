import _ from 'underscore'
import { getVideosList } from '../modules/files'
import { extractSub, saveEntry } from '../modules/downloader'
import stringSimilarity from 'string-similarity'
import { prompt } from 'inquirer'
import path from 'path'
import { searchForSubtitles, getDownloadUrl } from '../lib/subscene'
import filesize from 'filesize'

const CWD = process.cwd()

function stringSim (str1, str2) {
  return stringSimilarity.compareTwoStrings(
    str1.toLowerCase(),
    str2.toLowerCase()
  )
}

function filterFiles (filter, dirStructure) {
  return dirStructure.filter(file => {
    return stringSim(
      file.filename,
      filter
    ) > 0.2
  })
}

async function showFilesSelection (dirStructure) {
  const filesPrompt = await prompt({
    type: 'checkbox',
    name: 'files',
    message: 'Select a file: ',
    choices: _.sortBy(dirStructure, 'name').map(file => ({
      name: `${file.filename} ${file.srt ? '(SRT)' : ''}`,
      value: file.uri
    }))
  })

  return filesPrompt.files
}

async function askForQuery (query) {
  const queryPrompt = await prompt({
    type: 'input',
    name: 'query',
    message: 'Search query:',
    default: () => query
  })

  return queryPrompt.query
}

async function showSubsSelection (subs, query) {
  const subPrompt = await prompt({
    type: 'list',
    name: 'subtitle',
    message: 'Select a subtitle: ',
    choices: [{
      name: 'Skip',
      value: 'skip'
    }].concat(_.sortBy(subs, 'language').map(sub => {
      const match = (stringSim(sub.name, query) * 100).toFixed(2)
      return {
        name: `${sub.name} (${sub.language}) (${match}%)`,
        value: sub.link
      }
    }))
  })

  return subPrompt.subtitle
}

async function showZipSelection (entries) {
  const srtPrompt = await prompt({
    type: 'list',
    name: 'zipFile',
    message: 'Select a file from the zip: ',
    choices: entries.map(entry => ({
      name: `${entry.path} (${filesize(entry.uncompressedSize)})`,
      value: entry
    }))
  })

  return srtPrompt.zipFile
}

export async function searchForSubtitle (language = false, filter = false) {
  let dirStructure = await getVideosList(CWD)

  if (filter) dirStructure = filterFiles(filter, dirStructure)
  if (dirStructure.length === 0) return console.log('No Files')

  const files = await showFilesSelection(dirStructure)

  if (files.length === 0) return console.log('No selected files')

  for (const file of files) {
    const filename = path.basename(file, path.extname(file))
    const query = await askForQuery(filename)

    let subs = await searchForSubtitles(query)

    if (subs.length === 0) {
      console.log(`No subtitles found for ${filename}`)
      continue
    }
    if (language) {
      subs = subs.filter(sub => sub.language.toLowerCase() === language.toLowerCase())
    }

    const subLink = await showSubsSelection(subs, query)

    if (subLink === 'skip') {
      console.log(`Skipped subtitles for ${filename}`)
      continue
    }

    const downloadUrl = await getDownloadUrl(subLink)
    const zipFiles = await extractSub(downloadUrl)
    const selectedEntry = await showZipSelection(zipFiles)

    await saveEntry(selectedEntry, path.join(path.dirname(file), `${query}.srt`))
  }
}
