"use strict";

let git = require("git-rev-sync");
let gutil = require("gulp-util");
let through = require("through2");

module.exports = (gitFilename) => {
  gitFilename = gitFilename || "@git.js";
  return through.obj((file, enc, done) => {
    try {
      let gitDetails = JSON.stringify({
        "gitBranch": git.branch() || "-",
        "gitCommit": git.short() || "-",
        "gitTag": git.tag() || "-"
      }, null, 2);
      let content = `var gitDetails = ${gitDetails};`;
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
