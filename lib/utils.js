"use strict";

let gulp = require("gulp");
let through = require("through2");
let notifier = require("node-notifier");
let path = require("path");
let colors = require("colors");
let plumber = require("gulp-plumber");

let getErrorLocation = (err) => {
	err = err || {};
	err.stack = err.stack || "";
	let file = err.stack.match(/Error:\s(.*):\serror:/);
	if(file && file.length > 1) file = file[1]
	let lineCol = err.stack.match(/Unexpected token \((.*)\)/);
	if(lineCol && lineCol.length > 1) lineCol = lineCol[1];
	file = file || err.fileName || "Unknown";
	lineCol = lineCol || err.lineNumber || "?:?";
	return file + " (" + lineCol + ")";
}

let handleErrors = (err) => {
	console.log("ERROR: " + err);
	notifier.notify({
		title: "Gulp Error!",
		icon: path.join(__dirname, "gulp.png"),
		message: err.plugin,
		sound: true
	});
	let location = getErrorLocation(err);
	console.log(
		"\n                Location:  " + location.cyan +
		"\n                  Plugin:  " + (err.plugin || "Unknown").cyan +
		"\n\n" + err.stack.substr(7).replace(/^/gm, "                     ").red +
		"\n\n"
	);
}

gulp.origSrc = gulp.src;
function newGulpSrc(){
  return gulp
    .origSrc.apply(gulp, arguments)
    .pipe(plumber(handleErrors));
}

module.exports = {
  "newGulpSrc": newGulpSrc
}
