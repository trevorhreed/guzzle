var gulp = require('gulp'),
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
	console.log("ERROR: " + err);
	notifier.notify({
		title: 'Gulp Error!',
		icon: path.join(__dirname, 'gulp.png'),
		message: err.plugin,
		sound: true
	});
	var location = getErrorLocation(err);
	console.log(
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

module.exports = {
  'newGulpSrc': newGulpSrc
}
