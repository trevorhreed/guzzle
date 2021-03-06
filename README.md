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
      "liveServerParams": {
        "port": 3000,
        "etc.": "etc."
      },
      "modules": [
        {
          "id": "app",
          "src": "./src/app/",
          "dest": "./dest/",
          "static": "./dest/",
          "strictDi": false,
          "minify": false
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

Each guzzle module gets compiled into two files: one JavaScript file and one CSS file. Each JavaScript module is wrapped in an [IIFE](https://en.wikipedia.org/wiki/Immediately-invoked_function_expression) with a single parameter named ngm. This parameter is an Angular module. The Angular module can be bootstrapped by including a `selector` attribute on the `script` tag used to include the JavaScript file. There are two possible values for the selector attribute: `document | [QUERY SELECTOR]`. If you use the query selector and the selector returns multiple elements, the Angular module will be bootstrapped on all elements returned by the selector query.

*index.html*
```
...
  <script src="/dest/app.js" selector="document"></script>
...
```
