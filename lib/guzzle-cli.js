var path = require('path'),
    pkgFile = path.join(process.cwd(), 'package.json'),
    pkg = require(pkgFile),
    config = (pkg && pkg.dependencyConfig && pkg.dependencyConfig['ng-guzzle']) || {},
    guzzle = require('./guzzle.js'),
    ui = require('readline-sync'),
    fs = require('fs');

var mode = process.argv[2];

switch(mode){
  case 'init':
    doInit();
    break;
  case 'build':
    guzzle(config).build();
    break;
  case 'watch':
    guzzle(config).watch();
    break;
  default:
    doHelp();
}

function doInit(){
  console.log('\nThis utility will walk you through adding guzzle configuration to your package.json file.\n\n');

  var more = true,
      config = [];
  do{
    var module = {},
        valid = false;
    do{
      module.id = ui.question('Module id: ');
      if(!module.id) console.log('Invalid module id!');
      else valid = true;
    }while(!valid);

    valid = false;
    do{
      module.src = ui.question('Source directory: ');
      if(!module.src) console.log('Invalid module source directory!');
      else valid = true;
    }while(!valid);

    valid = false;
    do{
      module.dest = ui.question('Destination directory: ');
      if(!module.dest) console.log('Invalid module destination directory!');
      else valid = true;
    }while(!valid);

    var staticDir = ui.question('Static directory: ');
    if(staticDir) module.static = staticDir;

    config.push(module);
    more = ui.question('Add another module (y/n)? ').toLowerCase();
  }while(more === 'y');

  if(!pkg.dependencyConfig){
    pkg.dependencyConfig = {
      'ng-guzzle': config
    }
  }else{
    pkg.dependencyConfig['ng-guzzle'] = config;
  }

}

function doHelp(){
  console.log(`

Usage: guzzle <command>

Commands:

  init    - Setup guzzle configuration in your package.json file

  build   - Compile all source files and write them out to destination

  watch   - Watch source files, recompile, and write them out to destination

  `);
}


/*
require('./guzzle.js')({
   id:     'app',
   src:    ['./src/app/'],
   static: ['./src/static/** /*'],
   dest:   './www/'
}).develop();
*/
