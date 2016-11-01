"use strict";

let gutil = require("gulp-util");
let path = require("path");
let through = require("through2");

module.exports = (prefixContent, suffixContent) => {
  prefixContent = prefixContent || "";
  suffixContents = suffixContent || "";
  let firstTimeThrough = true;
  return through.obj((file, enc, done) => {
    if(firstTimeThrough){
      let wrapperFile = new gutil.File({
        cwd: file.cwd,
        base: file.base,
        path: "@wrapper",
        contents: new Buffer("")
      });
      wrapperFile.byubWrapperFile = true;
      wrapperFile.byubPrefix = new gutil.File({
        cwd: file.cwd,
        base: file.base,
        path: "@prefix",
        contents: new Buffer(prefixContent)
      });
      wrapperFile.byubSuffix = new gutil.File({
        cwd: file.cwd,
        base: file.base,
        path: "@suffix",
        contents: new Buffer(suffixContent)
      });
      this.push(wrapperFile);
      firstTimeThrough = false;
    }
    this.push(file);
    done();
  });
}
