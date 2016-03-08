require('ng-guzzle')({
  app: {
    id: 'app',
    src: ['./src/app/'],
    static: ['./src/static/**/*'],
    dest: './dist/',
    port: 3011
  },
  libs: [
    {
      id: 'mde',
      src: './src/lib/',
      dest: './dist/'
    }
  ]
});
