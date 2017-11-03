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

async function showFilesSelection (filter) {
  let dirStructure = await getVideosList(CWD)

  if (filter) dirStructure = filterFiles(filter, dirStructure)
  if (dirStructure.length === 0) throw new Error('No Files')

  const filePrompt = await prompt({
    type: 'list',
    name: 'file',
    message: 'Select a file',
    choices: _.sortBy(dirStructure, 'name').map(file => ({
      name: `${file.filename} ${file.srt ? '(SRT)' : ''}`,
      value: file.uri
    }))
  })

  return filePrompt.file
}

async function showSubsSelection (subs, query) {
  const subPrompt = await prompt({
    type: 'list',
    name: 'subtitle',
    message: 'Select a subtitle',
    choices: _.sortBy(subs, 'language').map(sub => {
      const match = (stringSim(sub.name, query) * 100).toFixed(2)
      return {
        name: `${sub.name} (${sub.language}) (${match}%)`,
        value: sub.link
      }
    })
  })

  return subPrompt.subtitle
}

async function showZipSelection (entries) {
  const srtPrompt = await prompt({
    type: 'list',
    name: 'zipFile',
    message: 'Select a file',
    choices: entries.map(entry => ({
      name: `${entry.path} (${filesize(entry.uncompressedSize)})`,
      value: entry
    }))
  })

  return srtPrompt.zipFile
}

export async function searchForSubtitle (query = false, filter = false) {
  const fileUri = await showFilesSelection()
  const filename = path.basename(fileUri, path.extname(fileUri))

  query = query || filename

  const subs = await searchForSubtitles(query)

  if (subs.length === 0) throw new Error('No subtitles found')

  const subLink = await showSubsSelection(subs, query)
  const downloadUrl = await getDownloadUrl(subLink)
  const zipFiles = await extractSub(downloadUrl)
  const selectedEntry = await showZipSelection(zipFiles)

  await saveEntry(selectedEntry, path.join(path.dirname(fileUri), `${filename}.srt`))
  console.log('Subtitle Downloaded')
}
