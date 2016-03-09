//  EXAMPLE USAGE:
//
//  require('ng-guzzle')({
//    id:     'app',
//    src:    ['./src/app/'],
//    static: ['./src/static/**/*'],
//    dest:   './dist/'
//  });

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    gfile = require('gulp-file'),
    watch = require('gulp-watch'),
    filter = require('gulp-filter'),
    sass = require('gulp-sass'),
    minifyHtml = require('gulp-minify-html'),
    minifyCss = require('gulp-minify-css'),
    ngAnnotate = require('gulp-ng-annotate'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),

    path = require('path'),

    utils = require('./utils.js'),
    concat = require('./concat.js'),
    nghtml = require('./nghtml.js'),
    sync = require('./sync.js'),
    wrapper = require('./wrapper.js'),
    gitDetails = require('./git');

gulp.src = utils.newGulpSrc;

var PREFIX = `
      (function(ngm){\n
    `,
    SUFFIX = `
        var selector = document.scripts[document.scripts.length - 1].getAttribute('selector');
        angular.element(document).ready(function(){
          if(!selector) return;
          var elements = [];
          elements = selector == 'document'
            ? [document]
            : document.querySelectorAll(selector);
          elements.forEach(function(element){
            angular.bootstrap(element, ['" + ID + "'], { strictDi: true });
          })
        });
      }.bind(this))(angular.module('" + ID + "', []));
    `;

function _configure(prefix, suffix){
  PREFIX = prefix;
  SUFFIX = suffix;
}

function getGlob(srcs, pattern){
  if(!Array.isArray(srcs)) srcs = [srcs];
  return srcs.map(function(src){
    if(src.indexOf('!') === 0){
      return src;
    }else{
      return path.join(src, pattern);
    }
  })
}

function getModuleTasks(config){
  var ID = config.id,
      SRC_CSS = getGlob(config.src, '**/*.scss'),
      SRC_JS = getGlob(config.src, '**/*.{js,htm}'),
      SRC_STATIC = config.static || [],
      DEST_CSS = ID + '.css',
      DEST_JS = ID + '.js',
      DEST = config.dest,
      PORT = config.port || 3001,
      SRCMAP_OPTIONS = { sourceRoot: ID };

  /*
  var PREFIX = "(function(ngm){\n",
      SUFFIX =
        "  var selector = document.scripts[document.scripts.length - 1].getAttribute('selector');" +
        "  angular.element(document).ready(function(){" +
        "    if(!selector) return;" +
        "    var elements = [];" +
        "    elements = selector == 'document'" +
        "      ? [document]" +
        "      : document.querySelectorAll(selector);" +
        "    elements.forEach(function(element){" +
        "      angular.bootstrap(element, ['" + ID + "'], { strictDi: true });" +
        "    })" +
        "  });" +
        "\n}.bind(this))(angular.module('" + ID + "', []));";
  */

  function buildCss(src){
    src = src || gulp.src(SRC_CSS);
    return src
      .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(concat(DEST_CSS))
        .pipe(minifyCss())
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(DEST))
      .pipe(utils.logCompilation(path.join(DEST, DEST_CSS)));
  }

  function watchCss(){
    return buildCss(
      gulp.src(SRC_CSS)
        .pipe(watch(SRC_CSS))
    );
  }

  function buildJs(src){
    src = src || gulp.src(SRC_JS);
  	var htmlFilter = filter(['**/*.htm'], {restore: true});
    return src
      .pipe(htmlFilter)
  		  .pipe(minifyHtml())
  	    .pipe(nghtml({ module: ID }))
  		.pipe(htmlFilter.restore)
      .pipe(wrapper(PREFIX, SUFFIX))
      .pipe(gfile('@git.js', gitDetails))
  		.pipe(sourcemaps.init())
  		  .pipe(ngAnnotate())
        .pipe(concat(DEST_JS))
        .pipe(uglify())
  		.pipe(sourcemaps.write('.'))
  		.pipe(gulp.dest(DEST))
      .pipe(utils.logCompilation(path.join(DEST, DEST_JS)));
  }

  function watchJs(){
    return buildJs(
      gulp.src(SRC_JS)
        .pipe(watch(SRC_JS))
    );
  }

  function buildStatic(src){
    src = src || gulp.src(SRC_STATIC);
    return src
      .pipe(sync(DEST))
      .pipe(gulp.dest(DEST));
  }

  function watchStatic(){
    return buildStatic(
      gulp.src(SRC_STATIC)
        .pipe(watch(SRC_STATIC))
    );
  }

  return {
    'id': ID,
    'buildCss': buildCss,
    'watchCss': watchCss,
    'buildJs': buildJs,
    'watchJs': watchJs,
    'buildStatic': buildStatic,
    'watchStatic': watchStatic
  }
}

function registerModuleTasks(module){
  var TASK_PREFIX   = 'guzzle:' + module.id + ':',
      BUILD         = TASK_PREFIX + 'build';
      BUILD_CSS     = BUILD + ':css',
      BUILD_JS      = BUILD + ':js',
      BUILD_STATIC  = BUILD + ':static',
      WATCH         = TASK_PREFIX + 'watch',
      WATCH_CSS     = WATCH + ':css',
      WATCH_JS      = WATCH + ':js',
      WATCH_STATIC  = WATCH + ':static';

  gulp.task(BUILD_CSS, module.buildCss);
  gulp.task(BUILD_JS, module.buildJs);
  gulp.task(BUILD_STATIC, module.buildStatic);
  gulp.task(BUILD, [BUILD_CSS, BUILD_JS, BUILD_STATIC]);

  gulp.task(WATCH_CSS, module.watchCss);
  gulp.task(WATCH_JS, module.watchJs);
  gulp.task(WATCH_STATIC, module.watchStatic);
  gulp.task(WATCH, [WATCH_CSS, WATCH_JS, WATCH_STATIC]);

  return {
    'build': BUILD,
    'watch': WATCH
  };

}

function serve(){
  var express = require('express'),
      puddy = require('puddy'),
      defaults = puddy.extractPuddyConfig(),
      app = express();
  defaults.serverPort = defaults.serverPort || 3001;
  app.disable('x-powered-by');
  app.use(puddy(defaults));
  app.listen(defaults.serverPort);
  gutil.log('Listening on port ' + defaults.serverPort + '...');
}

var proto = module.exports = function guzzle(modules){
  var buildTasks = [],
      watchTasks = [];

  if(!Array.isArray(modules)) modules = [modules];

  modules
    .map(getModuleTasks)
    .map(registerModuleTasks)
    .forEach(function(moduleTasks){
      buildTasks.push(moduleTasks.build);
      watchTasks.push(moduleTasks.watch);
    });

  gulp.task('build', buildTasks);
  gulp.task('watch', watchTasks);
  gulp.task('default', ['build', 'watch']);
}

proto.configure = _configure;
