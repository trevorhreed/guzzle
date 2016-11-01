"use strict";

let gutil = require("gulp-util");
let Concat = require("concat-with-sourcemaps");
let htmlJsStr = require("js-string-escape");
let path = require("path");
let through = require("through2");

const TEMPLATE_HEADER = `angular.module("<%= module %>"<%= standalone %>).run(["$templateCache", function($templateCache) {`;
const TEMPLATE_FOOTER = "}]);";
const DEFAULT_MODULE = "templates";
const DEFAULT_FILENAME = "templates.js";

module.exports = (opt) => {
	opt = opt || {};
	opt.newLine = opt.newLine || gutil.linefeed;
	opt.module = opt.module || DEFAULT_MODULE;
	opt.filename = opt.filename || DEFAULT_FILENAME;
	opt.templateHeader = opt.templateHeader || TEMPLATE_HEADER;
	opt.templateFooter = opt.templateFooter || TEMPLATE_FOOTER;
	opt.standalone = opt.standalone ? ",[]" : "";
	opt.transformUrl = opt.transformUrl || function(url) { return url.substring(url.lastIndexOf(path.sep) + 1, url.lastIndexOf(".")); }

  let getJsTemplateFile = (eventFile) => {
    if(Object.keys(buffer).length === 0) return;
    let event = eventFile.event;
    let contents = [];
    let template = `$templateCache.put("<%= url %>","<%= contents %>");`;
    concat = new Concat(opt.mappingSource, opt.filename, opt.newLine);
    concat.add("template-header", gutil.template(TEMPLATE_HEADER, {module: opt.module, standalone: opt.standalone, file: eventFile}));
    for(let i=0; i < index.length; i++){
      let file = buffer[index[i]];
      let content = gutil.template(template, {
        url: opt.transformUrl(file.path),
        contents: htmlJsStr(file.contents.toString("utf8")),
        file: file
      });
      concat.add(file.relative, content);
    }
    concat.add("template-footer", TEMPLATE_FOOTER);
    let newFile =	new gutil.File({
      cwd: firstFile.cwd,
      base: firstFile.base,
      path: path.join(firstFile.base, opt.filename),
      contents: new Buffer(concat.content)
    });
    newFile.event = event;
    return newFile;
  }

  let buffer = {};
  let index = [];
  let firstFile = null;

	return through.obj(function(file, enc, done){
    if(file.isNull()) return done();
    if(file.isStream()) {
      this.emit("error", new gutil.PluginError("my-nghtml", "Streaming not supported."));
      return done();
    }
    if(file.sourceMap) opt.mappingSource = true;
    if(!firstFile) firstFile = file;
    if(file.event === "unlink"){
      index.splice(index.indexOf(file.path), 1);
      delete buffer[file.path];
    }else{
      if(buffer[file.path] === undefined) index.push(file.path);
      buffer[file.path] = file;
    }
    this.push(getJsTemplateFile(file));
    done();
	});
}
