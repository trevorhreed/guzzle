var gulp = require('gulp'),
    gutil = require('gulp-util'),
    through = require('through2'),
    notifier = require('node-notifier'),
    path = require('path'),
    colors = require('colors'),
    plumber = require('gulp-plumber');

function getErrorLocation(err){
	err = err || {};
	err.stack = err.stack || "";
	var file = err.stack.match(/Error:\s(.*):\serror:/);
	if(file && file.length > 1) file = file[1]
	var lineCol = err.stack.match(/Unexpected token \((.*)\)/);
	if(lineCol && lineCol.length > 1) lineCol = lineCol[1];
	file = file || err.fileName || "Unknown";
	lineCol = lineCol || err.lineNumber || "?:?";
	return file + " (" + lineCol + ")";
}

function handleErrors(err){
	gutil.log("ERROR: " + err);
	notifier.notify({
		title: 'Gulp Error!',
		icon: path.join(__dirname, 'gulp.png'),
		message: err.plugin,
		sound: true
	});
	var location = getErrorLocation(err);
	gutil.log(
		'\n                Location:  ' + location.cyan +
		'\n                  Plugin:  ' + (err.plugin || "Unknown").cyan +
		'\n\n' + err.stack.substr(7).replace(/^/gm, '                     ').red +
		'\n\n'
	);
}

gulp.origSrc = gulp.src;
function newGulpSrc() {
  return gulp
    .origSrc.apply(gulp, arguments)
    .pipe(plumber(handleErrors));
}

function logCompilation(fileName){
  return through.obj(function(file, enc, done){
    if(file.event == 'add' || file.event == 'added' || file.event == 'change' || file.event == 'changed'){
      gutil.log('Compiled: ' + fileName.cyan);
    }
    this.push(file);
    done();
  });
}

module.exports = {
  'newGulpSrc': newGulpSrc,
  'logCompilation': logCompilation
}
