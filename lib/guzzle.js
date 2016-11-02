"use strict";

let gulp = require("gulp");
let watch = require("gulp-watch");
let watcher = require("chokidar");
let filter = require("gulp-filter");
let sass = require("gulp-sass");
let minifyHtml = require("gulp-minify-html");
let minifyCss = require("gulp-clean-css");
let ngAnnotate = require("gulp-ng-annotate");
let sourcemaps = require("gulp-sourcemaps");
let uglify = require("gulp-uglify");
let path = require("path");
let utils = require("./utils.js");
let concat = require("./concat.js");
let nghtml = require("./nghtml.js");
let sync = require("./sync.js");
let wrapper = require("./wrapper.js");
let gitDetails = require("./git.js");
let through2 = require("through2");
let colors = require("colors");

gulp.src = utils.newGulpSrc;
let IS_DEBUG = false;

let getGlob = (srcs, pattern) => {
  if(!Array.isArray(srcs)) srcs = [srcs];
  return srcs.map((src) => {
    if(src.indexOf("!") === 0){
      return src;
    }else{
      return path.join(src, pattern);
    }
  })
}

let getModuleTasks = (config) => {
  let ID = config.id;
  let SRC_CSS = getGlob(config.src, "**/*.scss");
  let SRC_JS = getGlob(config.src, "**/*.{js,htm}");
  let SRC_STATIC = config.static || [];
  let DEST_CSS = ID + ".css";
  let DEST_JS = ID + ".js";
  let DEST = config.dest;
  let PREFIX = `(function(ngm){\n`;
  let SUFFIX = `
          var selector = document.scripts[document.scripts.length - 1].getAttribute("selector");
          angular.element(document).ready(function(){
            if(!selector) return;
            var elements = [];
            elements = selector == "document"
              ? [document]
              : document.querySelectorAll(selector);
            elements.forEach(function(element){
              angular.bootstrap(element, ["${ID}"], { strictDi: false });
            })
          });
        \n}.bind(this))(angular.module("${ID}", []));
      `;
  let OPERATIONS = {
        "add":    "  Adding:".magenta,
        "change": "Updating:".magenta,
        "unlink": "Removing:".magenta
      };
  let OP_CHANGING = "FILE_EVENT";
  let OP_COMPILED = "Compiled:".magenta;
  let OP_SYNCED   = "  Synced:".magenta;

  let log = (operation) => {
    return through2.obj((file, enc, done) => {
      let op = operation == OP_CHANGING
          ? OPERATIONS[file.event] || "Unknown".magenta
          : operation;
      let time = new Date().toLocaleTimeString(void 0, {"hour12": false});
      console.log(
        `    [Gulp - ${time}]`.grey +
        ` ${op}` +
        ` ${file.relative}`.green
      );
      this.push(file);
      done();
    })
  }

  let buildCss = (src, done) => {
    src = src || gulp.src(SRC_CSS);
    if(IS_DEBUG) src = src.pipe(log(OP_CHANGING));
    src = src
    .pipe(concat(DEST_CSS))
    .pipe(sass())
    .pipe(sourcemaps.init())
    if(module.minify){
      src = src.pipe(minifyCss());
    }
    src = src
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(DEST));
    if(IS_DEBUG) src = src.pipe(log(OP_COMPILED));
    typeof done === "function" && src.on("end", done);
  }

  let watchCss = () => {
    return buildCss(
      gulp.src(SRC_CSS).pipe(watch(SRC_CSS))
    )
  }

  let buildJs = (src, done) => {
    src = src || gulp.src(SRC_JS);
  	let htmlFilter = filter(["**/*.htm"], {restore: true});
    if(IS_DEBUG) src = src.pipe(log(OP_CHANGING));
    src = src
    .pipe(htmlFilter)
		  .pipe(minifyHtml())
	    .pipe(nghtml({ module: ID }))
		.pipe(htmlFilter.restore)
    .pipe(wrapper(PREFIX, SUFFIX))
    .pipe(gitDetails())
    .pipe(sourcemaps.init())
      .pipe(concat(DEST_JS));
    if(module.minify){
      src = src
      .pipe(ngAnnotate())
      .pipe(uglify())
    }
    src = src
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(DEST));
    if(IS_DEBUG) src = src.pipe(log(OP_COMPILED));
    typeof done === "function" && src.on("end", done);
  }

  let watchJs = () => {
    return buildJs(
      gulp.src(SRC_JS).pipe(watch(SRC_JS))
    )
  }

  let buildStatic = (src, done) => {
    src = src || gulp.src(SRC_STATIC);
    if(IS_DEBUG) src = src.pipe(log(OP_CHANGING));
    src = src
      .pipe(sync(DEST))
      .pipe(gulp.dest(DEST));
    if(IS_DEBUG) src = src.pipe(log(OP_SYNCED));
    typeof done === "function" && src.on("end", done);
  }

  let watchStatic = () => {
    return buildStatic(
      gulp.src(SRC_STATIC).pipe(watch(SRC_STATIC))
    )
  }

  return {
    "id": ID,
    "buildCss": (done) => { buildCss(null, done); },
    "watchCss": watchCss,
    "buildJs": (done) => { buildJs(null, done); },
    "watchJs": watchJs,
    "buildStatic": (done) => { buildStatic(null, done); },
    "watchStatic": watchStatic
  }
}

let registerModuleTasks = (module) => {
  let TASK_PREFIX   = "guzzle:" + module.id + ":";
  let BUILD         = TASK_PREFIX + "build";
  let BUILD_CSS     = BUILD + ":css";
  let BUILD_JS      = BUILD + ":js";
  let BUILD_STATIC  = BUILD + ":static";
  let WATCH         = TASK_PREFIX + "watch";
  let WATCH_CSS     = WATCH + ":css";
  let WATCH_JS      = WATCH + ":js";
  let WATCH_STATIC  = WATCH + ":static";
  let SERVE         = TASK_PREFIX + "serve";

  gulp.task(BUILD_CSS, module.buildCss);
  gulp.task(BUILD_JS, module.buildJs);
  gulp.task(BUILD_STATIC, module.buildStatic);
  gulp.task(BUILD, [BUILD_CSS, BUILD_JS, BUILD_STATIC]);

  gulp.task(WATCH_CSS, module.watchCss);
  gulp.task(WATCH_JS, module.watchJs);
  gulp.task(WATCH_STATIC, module.watchStatic);
  gulp.task(WATCH, [WATCH_CSS, WATCH_JS, WATCH_STATIC]);

  return {
    "build": BUILD,
    "watch": WATCH
  };

}

module.exports = (modules, debug) => {
  IS_DEBUG = !!debug;
  let buildTasks = [];
  let watchTasks = [];

  if(!Array.isArray(modules) && typeof modules !== "object"){
    throw `Invalid configuration parameter passed to guzzle: ${modules}`;
  }
  if(!Array.isArray(modules)) modules = [modules];

  modules
    .map(getModuleTasks)
    .map(registerModuleTasks)
    .forEach((moduleTasks) => {
      buildTasks.push(moduleTasks.build);
      watchTasks.push(moduleTasks.watch);
    });

  gulp.task("watch", watchTasks);
  gulp.task("default", ["watch"]);

  return {
    watch: () => {
      gulp.start("watch");
    },
    build: (fn) => {
      gulp.task("build", buildTasks, (done) => {
        setTimeout(() => {
          typeof fn === "function" && fn();
          done();
        }, 5000);
      });
      gulp.start("build");
    }
  }
}
