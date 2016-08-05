"use strict";

let gulp = require('gulp'),
    watch = require('gulp-watch'),
    watcher = require('chokidar'),
    filter = require('gulp-filter'),
    sass = require('gulp-sass'),
    minifyHtml = require('gulp-minify-html'),
    minifyCss = require('gulp-clean-css'),
    ngAnnotate = require('gulp-ng-annotate'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),
    path = require('path'),
    utils = require('./utils.js'),
    concat = require('./concat.js'),
    nghtml = require('./nghtml.js'),
    sync = require('./sync.js'),
    wrapper = require('./wrapper.js'),
    gitDetails = require('./git'),
    through2 = require('through2');
    require('colors');

gulp.src = utils.newGulpSrc;
let IS_DEBUG = false;

function getGlob(srcs, pattern){
  if(!Array.isArray(srcs)) srcs = [srcs];
  return srcs.map((src) => {
    if(src.indexOf('!') === 0){
      return src;
    }else{
      return path.join(src, pattern);
    }
  })
}

function getModuleTasks(module){
  let ID = module.id,
      SRC_CSS = getGlob(module.src, '**/*.scss'),
      SRC_JS = getGlob(module.src, '**/*.{js,htm}'),
      SRC_STATIC = module.static || [],
      DEST_CSS = ID + '.css',
      DEST_JS = ID + '.js',
      DEST = module.dest;

  let PREFIX = "(function(ngm){\n",
      SUFFIX =
        "  var selector = document.scripts[document.scripts.length - 1].getAttribute('selector');" +
        "  angular.element(document).ready(function(){" +
        "    if(!selector) return;" +
        "    var elements = [];" +
        "    elements = selector == 'document'" +
        "      ? [document]" +
        "      : document.querySelectorAll(selector);" +
        "    elements.forEach(function(element){" +
        "      angular.bootstrap(element, ['" + ID + "'], { strictDi: ${module.strictDi ? 'true' : 'false'} });" +
        "    })" +
        "  });" +
        "\n}.bind(this))(angular.module('" + ID + "', []));";

  let OPERATIONS = {
        'add':    '  Adding:'.magenta,
        'change': 'Updating:'.magenta,
        'unlink': 'Removing:'.magenta
      },
      OP_CHANGING = 'FILE_EVENT',
      OP_COMPILED = 'Compiled:'.magenta,
      OP_SYNCED   = '  Synced:'.magenta;
  function log(operation){
    return through2.obj(function(file, enc, done){
      var op = operation == OP_CHANGING
          ? OPERATIONS[file.event] || 'Unknown'.magenta
          : operation;
      let time = new Date().toLocaleTimeString(void 0, {'hour12': false});
      console.log(
        `    [Gulp - ${time}]`.grey +
        ` ${op}` +
        ` ${file.relative}`.green
      );
      this.push(file);
      done();
    })
  }

  function buildCss(src){
    src = src || gulp.src(SRC_CSS);
    if(IS_DEBUG) src = src.pipe(log(OP_CHANGING));
    src = src
      .pipe(concat(DEST_CSS))
      .pipe(sass());
    if(module.minify){
      src = src
        .pipe(sourcemaps.init())
        .pipe(minifyCss())
        .pipe(sourcemaps.write('.'))
    }
    src = src.pipe(gulp.dest(DEST));
    if(IS_DEBUG) src = src.pipe(log(OP_COMPILED));
    return src;
  }

  function watchCss(){
    return buildCss(
      gulp.src(SRC_CSS).pipe(watch(SRC_CSS))
    )
  }

  function buildJs(src){
    src = src || gulp.src(SRC_JS);
  	let htmlFilter = filter(['**/*.htm'], {restore: true});
    if(IS_DEBUG) src = src.pipe(log(OP_CHANGING));
    src = src
      .pipe(htmlFilter)
  		  .pipe(minifyHtml())
  	    .pipe(nghtml({ module: ID }))
  		.pipe(htmlFilter.restore)
      .pipe(wrapper(PREFIX, SUFFIX))
      .pipe(gitDetails())
      .pipe(concat(DEST_JS))
    if(module.minify){
      src = src
        .pipe(sourcemaps.init())
  		  .pipe(ngAnnotate())
        .pipe(uglify())
    		.pipe(sourcemaps.write('.'))
    }
    src = src.pipe(gulp.dest(DEST));
    if(IS_DEBUG) src = src.pipe(log(OP_COMPILED));
    return src;
  }

  function watchJs(){
    return buildJs(
      gulp.src(SRC_JS).pipe(watch(SRC_JS))
    )
  }

  function buildStatic(src){
    src = src || gulp.src(SRC_STATIC);
    if(IS_DEBUG) src = src.pipe(log(OP_CHANGING));
    src
      .pipe(sync(DEST))
      .pipe(gulp.dest(DEST));
    if(IS_DEBUG) src = src.pipe(log(OP_SYNCED));
    return src;
  }

  function watchStatic(){
    return buildStatic(
      gulp.src(SRC_STATIC).pipe(watch(SRC_STATIC))
    )
  }

  return {
    'id': ID,
    'buildCss': function() { return buildCss(); },
    'watchCss': watchCss,
    'buildJs': function() { return buildJs(); },
    'watchJs': watchJs,
    'buildStatic': function() { return buildStatic(); },
    'watchStatic': watchStatic
  }
}

function registerModuleTasks(module){
  let TASK_PREFIX   = 'guzzle:' + module.id + ':',
      BUILD         = TASK_PREFIX + 'build',
      BUILD_CSS     = BUILD + ':css',
      BUILD_JS      = BUILD + ':js',
      BUILD_STATIC  = BUILD + ':static',
      WATCH         = TASK_PREFIX + 'watch',
      WATCH_CSS     = WATCH + ':css',
      WATCH_JS      = WATCH + ':js',
      WATCH_STATIC  = WATCH + ':static',
      SERVE         = TASK_PREFIX + 'serve';

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

module.exports = function guzzle(config, debug){
  IS_DEBUG = !!debug;
  let buildTasks = [],
      watchTasks = [];

  if(!Array.isArray(config.modules)) config.modules = [config.modules];

  config.modules
    .map(getModuleTasks)
    .map(registerModuleTasks)
    .forEach(function(moduleTasks){
      buildTasks.push(moduleTasks.build);
      watchTasks.push(moduleTasks.watch);
    });

  gulp.task('build', buildTasks);
  gulp.task('watch', watchTasks);
  gulp.task('default', ['watch']);

  return {
    build: (fn) => { gulp.start('build', fn || () => {}) },
    watch: () => { gulp.start('watch') }
  }
}
