# ng-guzzle

This project helps me remove the gulp boilerplate from my AngularJS applications. You're welcome to use it, but I don't have any intention of writing documentation at the moment. There is, however, a partial example.

Ok, here are some reminders for myself:

```
$ guzzle init
$ guzzle build
$ guzzle watch
```

*package.json*
```
...
  "dependencyConfig": {
    "ng-guzzle": {
      "modules": [
        {
          "id": "app",
          "src": "./src/app/",
          "dest": "./dest/",
          "static": "./dest/"
        },
        {
          "id": "lib",
          "src": "./src/lib/",
          "dest": "./dest/"
        }
      ]
    }
  }
...
```

Each guzzle module gets compiled into two files: one JavaScript file and one CSS file. Each JavaScript module is wrapped in an [IIFE](https://en.wikipedia.org/wiki/Immediately-invoked_function_expression) with a single parameter named ngm. This parameter is an Angular module.
