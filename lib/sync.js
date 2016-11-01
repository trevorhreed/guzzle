var through = require('through2'),
    fs = require('fs'),
    path = require('path'),
    gutil = require('gulp-util');

module.exports = function sync(DEST){
	var destination = path.join(process.cwd(), DEST);
	return through.obj(function(file, enc, done){
	    if (file.event == 'unlink') {
		    var destFile = path.join(destination, file.relative);
		    fs.unlinkSync(destFile);
		    done();
	    } else {
        this.push(file);
			done();
		}
	});
};
