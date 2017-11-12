import program from 'commander'
import { searchForSubtitle } from './controllers/sub.controller'

program
  .version('0.0.1')
  .usage('[options] <name>')
  .option('-l, --language <n>', 'Specify the language')
  .option('-f, --filter <n>', 'Filter files')
  .option('-s, --subed', 'Show subed episodes')
  .parse(process.argv);

(async function () {
  try {
    await searchForSubtitle(
      program.language,
      program.filter,
      program.subed
    )
  } catch (error) {
    console.log(error.message)
  }
})()
