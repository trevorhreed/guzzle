let DEBUG = false;

// █████████████████████████████████████████████████████████████████████████████
// UTILS

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const util = require('util');
const Glob = require('glob');
const GlobParent = require('glob-parent');
const Concat = require('concat-with-sourcemaps');
const sourceMapMerger = require('source-map-merger');
const Less = require('less');
const UglifyJs = require('uglify-js');
const chokidar = require('chokidar');
const git = require('git-rev-sync');
const html2JsStr = require('js-string-escape')
const colors = require('colors');

const noop = () => {};

const errors = (label) => {
  return (reason) => {
    let message, details,
        cols = process.stdout.columns,
        hr = Array(cols + 1).join(' ');
    if(reason instanceof Error){
      message = `  ${reason.name}: ${reason.message}`;
      details = reason.stack.split('\n');
      details.shift();
      details = details.map(line => {
        return line + Array(cols - (line.length % cols) + 1).join(' ');
      }).join('\n');
    }else{
      message = `  ERROR!`;
      details = '  ' + reason;
      details = details + Array(cols - (details.length % cols) + 1).join(' ');
    }
    if(label) message += ` (${label})`;
    message = message += Array(cols - (message.length % cols) + 1).join(' ');

    console.log('\n' + hr.bgWhite);
    console.log(message.bgWhite.red.bold);
    console.log(hr.bgWhite);
    console.log(hr.bgRed);
    console.log(details.bgRed.white);
    console.log(hr.bgRed + hr.bgRed + '\n');
  }
}

const getGitDetails = () => {
  return {
    branch: git.branch() || void 0,
    commit: git.short() || void 0,
    tag: git.tag() || void 0
  }
}

const readFile = (path, relative, event) => {
  return new Promise((resolve, reject)=>{
    try{
      event = event || 'unknown';
      if(event === 'unlink'){
        let content = '';
        resolve({ event, path, relative, content });
      }else{
        fs.readFile(path, function(err, data){
          if(err) return reject(err);
          let content = data.toString('utf8');
          return resolve({ event, path, relative, content });
        })
      }
    }catch(err){
      reject(err);
    }
  })
}

const readFiles = (glob) => {
  return new Promise((resolve, reject)=>{
    try{
      let root = GlobParent(glob);
      let options = { nodir: true };
      Glob(glob, options, (err, filenames)=>{
        if(err) return reject(err);
        let promises = filenames.map((filename)=>{
          let relative = path.relative(root, filename);
          return readFile(filename, relative).catch(reject);
        })
        Promise.all(promises).then(resolve).catch(reject);
      })
    }catch(err){
      reject(err);
    }
  })
}

const watchFiles = (glob, listener) => {
  let root = GlobParent(glob);
  chokidar
    .watch(glob, { ignoreInitial: true })
    .on('raw', (event, filename, details)=>{
      if(!filename || !event || event === 'addDir' || event === 'unlinkDir') return;
      listener(event, filename, path.relative(root, filename));
    });
}

const write = (dest) => {
  return (file)=>{
    let promises = [
      new Promise((resolve, reject)=>{
        let filename = path.join(dest, file.relative);
        mkdirp(path.dirname(filename), (err)=>{
          if(err) return reject(err);
          fs.writeFile(filename, file.content, (err)=>{
            if(err) return reject(err);
            resolve();
          })
        });
      }),
      new Promise((resolve, reject)=>{
        if(file.sourceMap){
          let filename = path.join(dest, file.relative + '.map');
          mkdirp(path.dirname(filename), (err)=>{
            if(err) return reject(err);
            fs.writeFile(filename, file.sourceMap, (err)=>{
              if(err) return reject(err);
              resolve();
            })
          });
        }else{
          resolve();
        }
      })
    ]
    return Promise
      .all(promises)
      .then(x => file);
  }
}

const copy = (dest) => {
  return (files)=>{
    return new Promise((resolve, reject)=>{
      try {
        if(!Array.isArray(files)) files = [files];
        let promises = files.map((file)=>{
          return new Promise((resolve, reject)=>{
            let filename = path.join(dest, file.relative);
            mkdirp(path.dirname(filename), (err)=>{
              if(err) return reject(err);
              fs.writeFile(filename, file.content, (err)=>{
                if(err) return reject(err);
                resolve();
              })
            });
          }).catch(reject);
        })
        Promise.all(promises).then(resolve).catch(reject);
      }catch(err){
        reject(err);
      }
    })
  }
}

const combine = (options) => {
  // options = { output, prefix, suffix, useCache }
  if(!options || typeof options !== 'object' || !options.output){
    throw `Invalid options object: ${JSON.stringify(options, null, 2)}`;
  }
  let cache = {};
  return (files) => {
    if(!Array.isArray(files)) files = [files];
    if(!options.useCache){
      cache = {};
    }
    files.forEach((file)=>{
      if(file.event === 'unlink') delete cache[file.path];
      else cache[file.path] = file;
    });
    let sourcesContent = [];
    let concat = new Concat(true, options.output, '\n');
    if(options.prefix) concat.add('__autogen__prefix', options.prefix);
    Object.keys(cache).forEach((path)=>{
      concat.add(path, cache[path].content);
      sourcesContent.push(cache[path].content);
    })
    if(options.suffix) concat.add('__autogen__suffix', options.suffix);
    let sourceMap = JSON.parse(concat.sourceMap);
    sourceMap['sourcesContent'] = sourcesContent;
    sourceMap = JSON.stringify(sourceMap);
    return {
      event: 'add',
      path: options.output,
      relative: options.output,
      content: concat.content.toString('utf8'),
      sourceMap: sourceMap
    }
  }
}

const combineJsHtm = (options) => {
  // options = { output, prefix, suffix, useCache }
  if(!options || typeof options !== 'object' || !options.output){
    throw `Invalid options object: ${JSON.stringify(options, null, 2)}`;
  }
  let TEMPLATE_HEADER = `ngm.run(function($templateCache){`;
  let TEMPLATE_LINE   = `  $templateCache.put('%s', '%s');`;
  let TEMPLATE_FOOTER = `});`;
  let transformFilename = url => url.substring(url.lastIndexOf(path.sep) + 1, url.lastIndexOf('.'));
  let templatePath = '__autogen__templates.js';
  let jsCache = {};
  let htmlCache = {};
  return (files)=>{
    if(!Array.isArray(files)) files = [files];
    let htmlFiles = files.filter(file => file.path.endsWith('.htm'));
    let jsFiles = files.filter(file => file.path.endsWith('.js'));
    if(!options.useCache){
      jsCache = {};
      htmlCache = {};
    }
    htmlFiles.forEach((file)=>{
      if(file.event === 'unlink') delete htmlCache[file.path];
      else htmlCache[file.path] = file;
    })
    jsFiles.forEach((file)=>{
      if(file.event === 'unlink') delete jsCache[file.path];
      else jsCache[file.path] = file;
    })
    let sourcesContent = [];
    let concatHtml = new Concat(true, templatePath, '\n');
    concatHtml.add('__autogen__template_header.js', TEMPLATE_HEADER);
    Object.keys(htmlCache).forEach((filename)=>{
      let line = `\t$templateCache.put('${transformFilename(filename)}', '${html2JsStr(htmlCache[filename].content)}')`;
      concatHtml.add(filename, line);
      sourcesContent.push(htmlCache[filename].content);
    })
    concatHtml.add('__autogen__template_footer.js', TEMPLATE_FOOTER);
    jsCache[templatePath] = {
      event: 'add',
      path: templatePath,
      content: concatHtml.content.toString('utf8'),
      sourceMap: concatHtml.sourceMap
    };
    jsCache['__autogen__git.js'] = {
      event: 'add',
      path: '__autogen__git.js',
      content: `var git = ${JSON.stringify(getGitDetails())};`,
      sourceMap: `var git = ${JSON.stringify(getGitDetails(), null, 2)};`
    }
    let concatJs = new Concat(true, options.output, '\n');
    if(options.prefix) concatJs.add('__autogen__prefix.js', options.prefix);
    Object.keys(jsCache).forEach((filename)=>{
      concatJs.add(filename, jsCache[filename].content);
      sourcesContent.push(jsCache[filename].content);
    })
    if(options.suffix) concatJs.add('__autogen__suffix.js', options.suffix);
    let sourceMap = JSON.parse(concatJs.sourceMap);
    sourceMap['sourcesContent'] = sourcesContent;
    sourceMap = JSON.stringify(sourceMap);
    return Promise.resolve({
      event: 'add',
      path: options.output,
      relative: options.output,
      content: concatJs.content.toString('utf8'),
      sourceMap: sourceMap
    });
  }
}

const less = () => {
  return (file) => {
    return new Promise((resolve, reject)=>{
      try{
        let sourcesContent = JSON.parse(file.sourceMap).sourcesContent;
        let options = { sourceMap: { sourceMapFileInline: true } };
        Less.render(file.content, options, (err, output)=>{
          resolve({
            path: file.path,
            relative: file.path,
            content: output.css,
            sourceMap: output.map
          });
        });
      }catch(err){
        reject(err);
      }
    })
  }
}

// END: UTILS
// █████████████████████████████████████████████████████████████████████████████


const getModuleTasks = (config) => {

  const MODULE_ID   = config.id;

  const SRC_CSS     = config.src ? path.join(config.src, '**/*.scss') : void 0;
  const SRC_JS      = config.src ? path.join(config.src, '**/*.{js,htm}') : void 0;
  const SRC_STATIC  = config.static;

  const DEST_CSS    = `${MODULE_ID}.css`;
  const DEST_JS     = `${MODULE_ID}.js`;
  const DEST        = config.dest;

  const PREFIX_JS   = `
(function(ngm){
`;
  const SUFFIX_JS   = `

var selector = document.scripts[document.scripts.length - 1].getAttribute('selector');
angular.element(document).ready(function(){
  if(!selector) return;
  var elements = [];
  elements = selector == 'document'
    ? [document]
    : document.querySelectorAll(selector);
  elements.forEach(function(element){
    angular.bootstrap(element, ['${MODULE_ID}'], { strictDi: false });
  })
});

}.bind(this))(angular.module('${MODULE_ID}', []));`;

  let combineJsHtmOptions = {
    output: DEST_JS,
    prefix: PREFIX_JS,
    suffix: SUFFIX_JS
  }

  let combineJsHtmOptionsWithCache = {
    output: DEST_JS,
    prefix: PREFIX_JS,
    suffix: SUFFIX_JS,
    useCache: true
  }

  let buildCss = (errCb) => {
    if(!SRC_CSS) return Promise.resolve();
    return readFiles(SRC_CSS)
      .then(combine({ output: DEST_CSS }))
      .then(less())
      .then(write(DEST))
      .catch(errCb || errors('BUILD CSS'));
  }

  let buildJs = (errCb) => {
    if(!SRC_JS) return Promise.resolve();
    return readFiles(SRC_JS)
      .then(combineJsHtm(combineJsHtmOptions))
      .then(write(DEST))
      .catch(errCb || errors('BUILD JS'));
  }

  let buildStatic = (errCb) => {
    if(!SRC_STATIC) return Promise.resolve();
    return readFiles(SRC_STATIC)
      .then(copy(DEST))
      .catch(errCb || errors('BUILD STATIC'));
  }

  let watchCss = (cb, errCb) => {
    if(!SRC_CSS) return Promise.resolve();
    return new Promise((resolve, reject)=>{
      let watchPipeline = (event, path, relative) => {
        readFile(path, relative, event)
          .then(combine({ output: DEST_CSS, useCache: true }))
          .then(less())
          .then(write(DEST))
          .then(cb || noop)
          .catch(errCb || errors('WATCH CSS'));
      }
      buildCss().then(()=>{
        resolve();
        watchFiles(SRC_CSS, watchPipeline)
      })

    })
  }

  let watchJs = (cb, errCb) => {
    if(!SRC_JS) return Promise.resolve();
    return new Promise((resolve, reject)=>{
      let watchPipeline = (event, path, relative) => {
        readFile(path, relative, event)
          .then(combineJsHtm(combineJsHtmOptionsWithCache))
          .then(write(DEST))
          .then(cb || noop)
          .catch(errCb || errors('WATCH JS'));
      }
      buildJs().then(()=>{
        resolve();
        watchFiles(SRC_JS, watchPipeline)
      })
    })
  }

  let watchStatic = (cb, errCb) => {
    if(!SRC_STATIC) return Promise.resolve();
    return new Promise((resolve, reject)=>{
      let watchPipeline = (event, path, relative) => {
        readFile(path, relative, event)
          .then(copy(DEST))
          .then(cb || noop)
          .catch(errCb || errors('WATCH STATIC'));
      }
      buildStatic().then(()=>{
        resolve();
        watchFiles(SRC_STATIC, watchPipeline)
      })
    })
  }

  let buildModule = (errCb) => {
    return Promise.all([
      buildCss(errCb),
      buildJs(errCb),
      buildStatic(errCb)
    ])
  }

  let watchModule = (cb, errCb) => {
    return Promise.all([
      watchCss(cb, errCb),
      watchJs(cb, errCb),
      watchStatic(cb, errCb)
    ])
  }

  return { buildModule, watchModule }
}

const guzzle = module.exports = (modules, debug) => {
  DEBUG = !!debug;

  if(!Array.isArray(modules)) modules = [modules];
  modules = modules.map(getModuleTasks)

  return {
    watch: (cb, errCb) => {
      return Promise.all(modules.map(tasks => tasks.watchModule(cb, errCb)));
    },
    build: (errCb) => {
      return Promise.all(modules.map(tasks => tasks.buildModule(errCb)));
    }
  }
}
