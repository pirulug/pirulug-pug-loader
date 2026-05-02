const should = require("should");
const path = require("path");
const loader = require("../index.js");

describe("pirulug-pug-loader", () => {
  it("should compile a simple pug template", (done) => {
    const source = "h1 Hello World";
    const context = {
      remainingRequest: "test.pug",
      getOptions: () => ({}),
      callback: (err, result) => {
        if (err) return done(err);
        try {
          result.should.containEql('template');
          result.should.containEql('Hello World');
          done();
        } catch (e) {
          done(e);
        }
      },
      async: () => context.callback,
    };

    loader.call(context, source);
  });

  it("should respect options like pretty", (done) => {
    const source = "h1 Hello World";
    const context = {
      remainingRequest: "test.pug",
      getOptions: () => ({ pretty: true }),
      callback: (err, result) => {
        if (err) return done(err);
        try {
          result.should.containEql('template');
          result.should.containEql('Hello World');
          done();
        } catch (e) {
          done(e);
        }
      },
      async: () => context.callback,
    };

    loader.call(context, source);
  });

  it("should handle globals", (done) => {
    const source = "h1= myGlobal";
    const context = {
      remainingRequest: "test.pug",
      getOptions: () => ({ globals: ["myGlobal"] }),
      callback: (err, result) => {
        if (err) return done(err);
        result.should.containEql('template');
        done();
      },
      async: () => context.callback,
    };

    loader.call(context, source);
  });

  it("should validate options and throw error for invalid ones", () => {
    const source = "h1 Hello";
    const context = {
      getOptions: () => ({ invalidOption: true }),
      remainingRequest: "test.pug",
    };

    (() => {
      loader.call(context, source);
    }).should.throw();
  });

  it("should handle inclusions and mixins", (done) => {
    const source = "include mixin.pug\n+myMixin";
    const mixinSource = "mixin myMixin\n  h2 Mixin Content";
    
    const context = {
      remainingRequest: "main.pug",
      getOptions: () => ({}),
      resolve: (ctx, req, cb) => {
        cb(null, path.join(__dirname, "fixtures", req));
      },
      loadModule: (req, cb) => {
        // req will look like "-!path/to/stringify.loader.js!path/to/mixin.pug"
        cb(null, JSON.stringify(mixinSource));
      },
      callback: (err, result) => {
        if (err) return done(err);
        try {
          result.should.containEql('template');
          result.should.containEql('Mixin Content');
          done();
        } catch (e) {
          done(e);
        }
      },
      async: () => context.callback,
    };

    loader.call(context, source);
  });
});
