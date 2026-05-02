# pirulug-pug-loader

A high-performance, feature-rich Pug loader for Webpack. This loader allows you to use Pug (formerly Jade) templates in your Webpack projects with support for advanced features like async resolution, inlining, and custom plugins.

## Features

- **Modern ES6+ Syntax**: Clean and maintainable codebase.
- **Async Resolution**: Handles complex dependency trees efficiently.
- **Auto-Inlining**: Smart detection of mixins and blocks for proper template inlining.
- **Options Validation**: Robust validation using `schema-utils`.
- **Flexible Configuration**: Full access to Pug's compilation options.

## Installation

```bash
npm install pirulug-pug-loader --save-dev
```

You also need to have `pug` installed:

```bash
npm install pug --save-dev
```

## Usage

In your Webpack configuration:

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.pug$/,
        use: [
          {
            loader: 'pirulug-pug-loader',
            options: {
              pretty: true,
              doctype: 'html'
            }
          }
        ]
      }
    ]
  }
};
```

### Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `doctype` | `string` | `'html'` | The doctype of the output HTML. |
| `pretty` | `boolean` | `false` | Whether to output pretty-printed HTML. |
| `self` | `boolean` | `false` | Use `self` namespace for locals. |
| `compileDebug` | `boolean` | `false` | Include debug information in the compiled function. |
| `globals` | `string[]` | `[]` | List of global variables to include. |
| `filters` | `object` | `{}` | Custom Pug filters. |
| `plugins` | `array` | `[]` | Custom Pug plugins. |
| `root` | `string` | `undefined` | Root directory for absolute paths. |

## Publishing

To publish a new version to npm:

```bash
npm login
npm publish
```

## License

MIT