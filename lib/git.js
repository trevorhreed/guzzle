var git = require('git-rev-sync'),
    gutil = require('gulp-util'),
    through = require('through2');

module.exports = function(gitFilename){
  gitFilename = gitFilename || '@git.js';
  return through.obj(function(file, enc, done){
    try {
      gitDetails = JSON.stringify({
        'gitBranch': git.branch() || '-',
        'gitCommit': git.short() || '-',
        'gitTag': git.tag() || '-'
      }, null, 2);
      var content = `var gitDetails = ${gitDetails};`;
      var gitFile = new gutil.File({
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
