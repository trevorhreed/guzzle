"use strict";

let git = require("git-rev-sync");
let gutil = require("gulp-util");
let through = require("through2");

module.exports = (gitFilename) => {
  gitFilename = gitFilename || "@git.js";
  return through.obj(function(file, enc, done){
    try {
      let details = JSON.stringify({
        "branch": git.branch() || "-",
        "long": git.long() || "-",
        "short": git.short() || "-",
        "tag": git.tag() || "-"
      }, null, 2);
      let content = `var __git = ${details};`;
      let gitFile = new gutil.File({
        cwd: file.cwd,
        base: file.base,
        path: gitFilename,
        contents: new Buffer(content)
      });
      this.push(gitFile);
    } catch (err) { }
    this.push(file);
    done();
  });
}
