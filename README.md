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
    "ng-guzzle": [
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
...
```
