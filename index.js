const path = require("path");
const { dirname, join } = path;
const loaderUtils = require("loader-utils");
const nodeResolve = require("resolve").sync;
const walk = require("pug-walk");
const { validate } = require("schema-utils");
const schema = require("./options-schema.json");

module.exports = function (source) {
  const options = this.getOptions() || {};

  validate(schema, options, {
    name: "PiruPug Loader",
    baseDataPath: "options",
  });

  const modulePaths = {};
  modulePaths.pug = require.resolve("pug");
  modulePaths.load = nodeResolve("pug-load", {
    basedir: dirname(modulePaths.pug),
  });
  modulePaths.runtime = nodeResolve("pug-runtime", {
    basedir: dirname(modulePaths.pug),
  });

  const pug = require(modulePaths.pug);
  const load = require(modulePaths.load);

  const req = this.remainingRequest.replace(/^!/, "");

  const { loadModule, resolve } = this;
  const loaderContext = this;
  let callback;
  let finished = false;

  const fileContents = {};
  const filePaths = {};

  let missingFileMode = false;

  function getFileContent(context, request) {
    const originalRequest = request;
    request = loaderUtils.urlToRequest(request, options.root);
    const baseRequest = request;

    let filePath = filePaths[`${context} ${request}`];
    if (filePath) return filePath;

    let isSync = true;
    resolve(context, request, (err, resolvedRequest) => {
      if (err) {
        resolve(context, request, (err2, secondResolvedRequest) => {
          if (err2) {
            if (finished) return;
            finished = true;
            return (callback || loaderContext.callback)(err2);
          }

          request = secondResolvedRequest;
          next();
        });
        return;
      }

      request = resolvedRequest;
      next();

      function next() {
        loadModule(
          `-!${join(__dirname, "stringify.loader.js")}!${request}`,
          (err, source) => {
            if (err) {
              if (finished) return;
              finished = true;
              return (callback || loaderContext.callback)(err);
            }

            filePaths[`${context} ${baseRequest}`] = request;
            fileContents[request] = JSON.parse(source);

            if (!isSync) {
              run();
            }
          }
        );
      }
    });

    filePath = filePaths[`${context} ${baseRequest}`];
    if (filePath) return filePath;

    isSync = false;
    missingFileMode = true;
    const err = new Error("continue");
    err.pugLoaderContinue = true;
    throw err;
  }

  const plugin = loadModule
    ? {
        postParse(ast) {
          return walk(ast, (node) => {
            if (["Mixin", "MixinBlock", "NamedBlock"].includes(node.type)) {
              ast._mustBeInlined = true;
            }
          });
        },
        resolve(request, source) {
          if (!callback) {
            callback = loaderContext.async();
          }

          if (!callback) {
            return load.resolve(request, source);
          }

          const context = dirname(source.split("!").pop());
          return getFileContent(context, request);
        },
        read(path) {
          if (!callback) {
            return load.read(path);
          }

          return fileContents[path];
        },
        postLoad(ast) {
          const self = this;
          return walk(
            ast,
            (node) => {
              if (node.file && node.file.ast) {
                self.postLoad(node.file.ast);
              }

              if (node.type === "Include") {
                if (node.file.ast._mustBeInlined) {
                  ast._mustBeInlined = true;
                }
              }
            },
            (node, replace) => {
              if (
                node.type === "Include" &&
                !(node.block && node.block.nodes.length) &&
                !node.file.ast._mustBeInlined
              ) {
                replace({
                  type: "Code",
                  val: `require(${loaderUtils.stringifyRequest(
                    loaderContext,
                    node.file.fullPath
                  )}).call(this, locals)`,
                  buffer: true,
                  mustEscape: false,
                  isInline: false,
                  line: node.line,
                  filename: node.filename,
                });
              }
            }
          );
        },
      }
    : {};

  const run = () => {
    if (finished) return;
    try {
      const tmplFunc = pug.compileClient(source, {
        filename: req,
        doctype: options.doctype || "html",
        pretty: options.pretty,
        self: options.self,
        compileDebug: options.compileDebug ?? (this.mode === "development"),
        globals: ["require", ...(options.globals || [])],
        name: "template",
        inlineRuntimeFunctions: false,
        filters: options.filters,
        plugins: [plugin, ...(options.plugins || [])],
      });

      const runtime = `var pug = require(${loaderUtils.stringifyRequest(
        loaderContext,
        "!" + modulePaths.runtime
      )});\n\n`;

      if (finished) return;
      finished = true;
      (callback || loaderContext.callback)(
        null,
        `${runtime}${tmplFunc.toString()};\nmodule.exports = template;`
      );
    } catch (e) {
      const isContinue = e.pugLoaderContinue || 
                         (e.message && e.message.includes("continue")) || 
                         e === "continue";
      
      if (missingFileMode && isContinue) {
        missingFileMode = false;
        return;
      }
      if (finished) return;
      finished = true;
      (callback || loaderContext.callback)(e);
    }
  };

  run();
};

