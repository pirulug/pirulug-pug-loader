const path = require("path");
const nodeResolve = require("resolve").sync;
const walk = require("pug-walk");

module.exports = function (source) {
  const modulePaths = {};
  modulePaths.pug = require.resolve("pug");
  modulePaths.load = nodeResolve("pug-load", {
    basedir: path.dirname(modulePaths.pug),
  });
  modulePaths.runtime = nodeResolve("pug-runtime", {
    basedir: path.dirname(modulePaths.pug),
  });

  const pug = require(modulePaths.pug);
  const load = require(modulePaths.load);

  const req = this.resourcePath;

  const query = this.query ? this.getOptions() : {};

  const plugin = load
    ? {
        postParse: function (ast) {
          return walk(ast, function (node) {
            if (
              ["Mixin", "MixinBlock", "NamedBlock"].indexOf(node.type) !== -1
            ) {
              ast._mustBeInlined = true;
            }
          });
        },
        resolve: function (request, source) {
          const context = path.dirname(source.split("!").pop());
          return load.resolve(request, source);
        },
        read: function (path) {
          return load.read(path);
        },
        postLoad: function postLoad(ast) {
          return walk(
            ast,
            function (node) {
              if (node.file && node.file.ast) {
                postLoad(node.file.ast);
              }

              if (node.type === "Include") {
                if (node.file.ast._mustBeInlined) {
                  ast._mustBeInlined = true;
                }
              }
            },
            function (node, replace) {
              if (
                node.type === "Include" &&
                !(node.block && node.block.nodes.length) &&
                !node.file.ast._mustBeInlined
              ) {
                replace({
                  type: "Code",
                  val:
                    "require(" +
                    JSON.stringify(node.file.fullPath) +
                    ").call(this, locals)",
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

  try {
    const tmplFunc = pug.compileClient(source, {
      filename: req,
      doctype: query.doctype || "html",
      pretty: query.pretty,
      self: query.self,
      compileDebug: this.debug || false,
      globals: ["require"].concat(query.globals || []),
      name: "template",
      inlineRuntimeFunctions: false,
      filters: query.filters,
      plugins: [plugin].concat(query.plugins || []),
    });

    const runtime =
      "var pug = require(" +
      JSON.stringify("!" + modulePaths.runtime) +
      ");\n\n";
    this.callback(
      null,
      runtime + tmplFunc.toString() + ";\nmodule.exports = template;"
    );
  } catch (e) {
    this.callback(e);
  }
};
