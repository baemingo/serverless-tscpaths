# serverless-tscpaths

[![npm version](https://badge.fury.io/js/serverless-tscpaths.svg)](https://badge.fury.io/js/serverless-tscpaths)
[![Dependency Status](https://david-dm.org/baemingo/serverless-tscpaths.svg)](https://david-dm.org/baemingo/serverless-tscpaths)
[![License](http://img.shields.io/:license-mit-blue.svg)](http://doge.mit-license.org)

Replace absolute paths to relative paths after typescript compilation for serverless

## Installation

First, add serverless-tscpaths to your project:

```sh
$ yarn add serverless-tscpaths -D
```

Then inside your project's `serverless.yml` file add following entry to the plugins section: `serverless-tscpaths`. If there is no plugin section you will need to add it to the file.

It should look something like this:

```YAML
plugins:
  - serverless-plugin-typescript
  - serverless-tscpaths # should be after serverless-plugin-typescript
```

## Configuration

You can specify paths to your build or tsconfig using `custom` section of your `serverless.yml`.

```YAML
custom:
  tscpaths:
    buildPath: dist # default is .build
    tsconfigPath: tsconfig.es5.json # default is tsconfig.json in the root folder
    tscpathsPath: node_modules/@baemingo/tscpaths-async # if you want to use different lib
```
