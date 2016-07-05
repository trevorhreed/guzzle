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
  console.log('\nThis utility will walk you through adding guzzle configuration to your package.json file.\n');

  var more = true,
      config = { modules: [] };
  do{
    var module = {};
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
    var staticDir = ui.question('            Static: ');
    if(staticDir) module.static = staticDir;
    module.minify = ui.keyInYN(`     Minify?`);
    module.strictDi = ui.keyInYN(`  Strict DI?`);
    config.modules.push(module);
    more = ui.keyInYN('\nAdd another module?');
    console.log();
  }while(more);

  if(!pkg.dependencyConfig){
    pkg.dependencyConfig = {
      'ng-guzzle': config
    }
  }else{
    pkg.dependencyConfig['ng-guzzle'] = config;
  }

  fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2), function(err){
    if(err) console.log(err);
    console.log('Updated file: ' + pkgFile + '\n');
  })

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
