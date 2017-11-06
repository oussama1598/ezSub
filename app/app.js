import program from 'commander'
import { searchForSubtitle } from './controllers/sub.controller'

program
  .version('0.0.1')
  .usage('[options] <name>')
  .option('-f, --filter <n>', 'Filter files')
  .parse(process.argv);

(async function () {
  try {
    await searchForSubtitle(
      program.query,
      program.filter
    )
  } catch (error) {
    console.log(error.message)
  }
})()
