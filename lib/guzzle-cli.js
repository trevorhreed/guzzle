 require('./guzzle.js')({
   id:     'app',
   src:    ['./src/app/'],
   static: ['./src/static/**/*'],
   dest:   './www/'
 }).develop();
