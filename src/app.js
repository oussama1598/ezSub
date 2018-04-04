import program from 'commander';
import searchForSubtitle from 'controllers/sub.controller';

program
  .version('0.0.1')
  .usage('[options] <name>')
  .option('-i, --input <dir>', 'Folder to search in')
  .option('-l, --language <n>', 'Specify the language')
  .option('-f, --filter <n>', 'Filter files')
  .option('-s, --subed', 'Show subed episodes')
  .parse(process.argv);

(async function main() {
  try {
    await searchForSubtitle(
      program.input,
      program.language,
      program.filter,
      program.subed
    );
  } catch (error) {
    console.log(error);
  }
})();
