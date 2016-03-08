var git = require('git-rev-sync');

var gitDetails = {
  'gitBanch': '-',
  'gitCommit': '-',
  'gitTag': '-'
};
try {
  gitDetails = {
    'gitBranch': git.branch(),
    'gitCommit': git.short(),
    'gitTag': git.tag()
  };
} catch (err) { /* We're probably not inside a git repo, so don't worry about it. */ }

module.exports = 'var gitDetails = ' + JSON.stringify(gitDetails, null, 2) + ';';
