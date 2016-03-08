var gutil = require('gulp-util'),
    path = require('path'),
    through = require('through2');

module.exports = function(prefixContent, suffixContent){
  prefixContent = prefixContent || '';
  suffixContents = suffixContent || '';
  var firstTimeThrough = true;
  return through.obj(function(file, enc, done){
    if(firstTimeThrough){
      var wrapperFile = new gutil.File({
        cwd: file.cwd,
        base: file.base,
        path: '@wrapper',
        contents: new Buffer('')
      });
      wrapperFile.byubWrapperFile = true;
      wrapperFile.byubPrefix = new gutil.File({
        cwd: file.cwd,
        base: file.base,
        path: '@prefix',
        contents: new Buffer(prefixContent)
      });
      wrapperFile.byubSuffix = new gutil.File({
        cwd: file.cwd,
        base: file.base,
        path: '@suffix',
        contents: new Buffer(suffixContent)
      });
      this.push(wrapperFile);
      firstTimeThrough = false;
    }
    this.push(file);
    done();
  })
}
