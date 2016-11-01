var gutil = require('gulp-util'),
	applySourceMap = require('vinyl-sourcemaps-apply'),
	Concat = require('concat-with-sourcemaps'),
	path = require('path'),
  through = require('through2');

module.exports = function(filename, opt){
	if(!filename) throw new gutil.PluginError('byub-concat', 'Missing filename option for byub-concat.');
	opt = opt || {newLine: gutil.linefeed};
	var buffer = {},
			index = [],
			firstFile = null,
      prefix,
      suffix;

  function getConcatenatedFile(event){
    if(Object.keys(buffer).length === 0) return;
    concat = new Concat(opt.mappingSource, filename, opt.newLine);
    if(prefix) concat.add(prefix.relative, prefix.contents.toString('utf8'), prefix.sourceMap);
    for(var i=0; i < index.length; i++){
      var file = buffer[index[i]];
      concat.add(file.relative, file.contents.toString('utf8'), file.sourceMap);
    }
    if(suffix) concat.add(suffix.relative, suffix.contents.toString('utf8'), suffix.sourceMap);
    var newFile =	new gutil.File({
      cwd: firstFile.cwd,
      base: firstFile.base,
      path: path.join(firstFile.base, filename),
      contents: new Buffer(concat.content)
    });
    if(concat.sourceMap){
      applySourceMap(newFile, concat.sourceMap);
    }
    newFile.event = event;
    return newFile;
  }

  return through.obj(function(file, enc, done){
    if(file.isStream()) {
			this.emit('error', new gutil.PluginError('byub-concat', 'Streaming not supported.'));
			return done();
		}
		if(file.sourceMap) opt.mappingSource = true;
		if(!firstFile) firstFile = file;
		if(file.event === 'unlink'){
			index.splice(index.indexOf(file.path), 1);
			delete buffer[file.path];
		}else{
      if(file.byubWrapperFile){
        prefix = file.byubPrefix;
        suffix = file.byubSuffix;
      }else{
  			if(buffer[file.path] === undefined) index.push(file.path);
  			buffer[file.path] = file;
      }
		}
    this.push(getConcatenatedFile(file.event));
		done();
  });

}
