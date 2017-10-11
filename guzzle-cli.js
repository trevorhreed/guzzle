#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ui = require('readline-sync');
const liveServer = require('live-server');
const guzzle = require('./guzzle.js');
const version = require('./package.json').version;
const pkgFilename = path.join(process.cwd(), 'package.json');
const pkg = require(pkgFilename);
const config = pkg && pkg.guzzle || {};
const args = process.argv;
const mode = args.indexOf('--mode') > 0 ? args[args.indexOf('--mode') + 1] : 'help';

switch(mode){
  case 'init':
    doInit();
    break;
  case 'build':
    guzzle(config.modules).build(()=>{
      console.log('Build complete.');
    });
    console.log('Building...');
    break;
  case 'watch':
    guzzle(config.modules).watch();
    console.log('Watching files...');
    if(config.liveServerParams){
      liveServer.start(config.liveServerParams);
      console.log('Serving files...');
    }
    break;
  default:
    doHelp();
}

const doInit = () => {
  console.log('\nThis utility will walk you through adding guzzle configuration to your package.json file.\n');
  let more = true;
  let config = { modules: [], server: {} };
  do{
    let module = {};
    module.id = ui.question('         Module id: ', {
      limit: /.+/,
      limitMessage: 'Invalid module id!'
    });
    module.src = ui.question('            Source: ', {
      limit: /.+/,
      limitMessage: 'Invalid source directory!'
    });
    module.dest = ui.question('       Destination: ', {
      limit: /.+/,
      limitMessage: 'Invalid destination directory!'
    });
    let staticDir = ui.question('            Static: ');
    if(staticDir) module.static = staticDir;
    module.minify = ui.keyInYN(`     Minify?`);
    module.strictDi = ui.keyInYN(`  Strict DI?`);
    config.modules.push(module);
    more = ui.keyInYN('\nAdd another module?');
    console.log();
  }while(more);
  pkg.guzzle = config;
  fs.writeFile(pkgFilename, JSON.stringify(pkg, null, 2), (err) => {
    if(err) console.log(err);
    console.log(`Updated file: ${pkgFilename}\n`);
  });
}

const doHelp = () => {
  console.log(`

Usage: guzzle <command>

Commands:

  init    - Setup guzzle configuration in your package.json file

  build   - Compile all source files and write them out to destination

  watch   - Watch source files, recompile, and write them out to destination

  `);
}
