"use strict";

let through = require("through2");
let fs = require("fs");
let path = require("path");
let gutil = require("gulp-util");

module.exports = sync = (DEST) => {
	let destination = path.join(process.cwd(), DEST);
	return through.obj((file, enc, done) => {
	    if (file.event == "unlink") {
		    let destFile = path.join(destination, file.relative);
		    fs.unlinkSync(destFile);
		    done();
	    } else {
        this.push(file);
			done();
		}
	});
};
