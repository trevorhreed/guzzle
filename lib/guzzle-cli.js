var path = require('path'),
    pkgFile = path.join(process.cwd(), 'package.json'),
    pkg = require(pkgFile),
    config = (
      pkg &&
      pkg.dependencyConfig &&
      pkg.dependencyConfig['ng-guzzle'] &&
      pkg.dependencyConfig['ng-guzzle'].modules
    ) || {},
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
      config = { modules: [] };
  do{
    var module = {};
    module.id = ui.question('Module id: ', {
      limit: /.+/,
      limitMessage: 'Invalid module id!'
    });
    module.src = ui.question('Source directory: ', {
      limit: /.+/,
      limitMessage: 'Invalid source directory!'
    });
    module.dest = ui.question('Destination directory: ', {
      limit: /.+/,
      limitMessage: 'Invalid destination directory!'
    });
    module.minify = ui.keyInYNStrict(`Minify JavaScript and CSS?`);
    module.strictDi = ui.keyInYNStrict(`Use Angular's strict dependency injection flag?`);
    var staticDir = ui.question('Static directory: ');
    if(staticDir) module.static = staticDir;
    config.modules.push(module);
    more = ui.keyInYNStrict('Add another module?');
  }while(more);

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
