//  EXAMPLE USAGE:
//
//  var tasks = guzzle({
//    app: {
//      id: 'app',
//      src: ['./src/', '!./src/_lib/**/*', '!./src/_etc/**/*'],
//      static: ['./src/_etc/**/*'],
//      dest: './dist/',
//      port: 3001
//    },
//    libs: [
//      {
//        id: 'mde',
//        src: './src/_lib/',
//        dest: './dist/'
//      }
//    ]
//  });
//
//  gulp.task('build', tasks.build);
//  gulp.task('watch', tasks.watch);
//  gulp.task('serve', tasks.serve);
//  gulp.task('default', tasks.develop);

var gulp = require('gulp'),
    gfile = require('gulp-file'),
    watch = require('gulp-watch'),
    filter = require('gulp-filter'),
    sass = require('gulp-sass'),
    less = require('gulp-less'),
    minifyHtml = require('gulp-minify-html'),
    minifyCss = require('gulp-minify-css'),
    ngAnnotate = require('gulp-ng-annotate'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),

    liveServer = require('live-server'),
    path = require('path'),

    utils = require('./byub-utils.js'),
    concat = require('./byub-concat.js'),
    nghtml = require('./byub-nghtml.js'),
    sync = require('./byub-sync.js'),
    wrapper = require('./byub-wrapper.js'),
    gitDetails = require('./byub-git');

gulp.src = utils.newGulpSrc;

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

  function watchCss(glob){
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

  function serve(){
    var express = require('express'),
        puddy = require('puddy'),
        defaults = puddy.extractPuddyConfig(),
        app = express();
    defaults.staticPath = DEST;
    app.disable('x-powered-by');
    app.use(puddy(defaults));
    app.listen(PORT);
    console.log('Listening on port ' + PORT + '...');
  }

  return {
    'id': ID,
    'buildCss': function() { buildCss(); },
    'watchCss': watchCss,
    'buildJs': function() { buildJs(); },
    'watchJs': watchJs,
    'buildStatic': function() { buildStatic(); },
    'watchStatic': watchStatic,
    'serve': serve
  }
}

function registerModuleTasks(module){
  var TASK_PREFIX   = 'guzzle:' + module.id + ':',
      BUILD         = TASK_PREFIX + 'build';
      BUILD_CSS     = BUILD + ':build:css',
      BUILD_JS      = BUILD + ':build:js',
      BUILD_STATIC  = BUILD + ':build:static',
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

  gulp.task(SERVE, module.serve);

  return {
    'build': BUILD,
    'watch': WATCH,
    'serve': SERVE
  };

}

module.exports = function guzzle(options){
  if(
    !options ||
    !options.app ||
    !options.app.id ||
    !options.app.src ||
    !options.app.dest
  ){
    throw new Error("Guzzle options must include a valid 'app' object.");
  }

  var app = getModuleTasks(options.app),
      libs = (options.libs || []).map(function(lib){
        return getModuleTasks(lib);
      }),
      libTasksArr = libs.map(registerModuleTasks),
      appTasks = registerModuleTasks(app),
      buildDeps = [appTasks.build],
      watchDeps = [appTasks.watch],
      serveDeps = [appTasks.serve];

  libTasksArr.forEach(function(libTasks){
    buildDeps.push(libTasks.build);
    watchDeps.push(libTasks.watch);
  });

  gulp.task('build', buildDeps);
  gulp.task('watch', buildDeps);
  gulp.task('serve', serveDeps);
  gulp.task('default', watchDeps.concat(serveDeps));
}
