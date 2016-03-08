var through = require('through2'),
    fs = require('fs'),
    path = require('path'),
    gutil = require('gulp-util');

module.exports = function sync(DEST){
	var destination = path.join(process.cwd(), DEST);
	return through.obj(function(file, enc, cb){
	    if (file.event == 'unlink') {
		    var destFile = path.join(destination, file.relative);
		    fs.unlinkSync(destFile);
		    gutil.log('Deleted: ' + file.relative.cyan);
		    cb();
	    } else {
        if(file.event != undefined) gutil.log('Synced: ' + file.relative.cyan);
        this.push(file);
			cb();
		}
	});
};
