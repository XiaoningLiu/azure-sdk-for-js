// https://github.com/karma-runner/karma-chrome-launcher
process.env.CHROME_BIN = require("puppeteer").executablePath();
require("dotenv").config({ path: "../.env" });

module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "./",

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ["mocha"],

    plugins: [
      "karma-mocha",
      "karma-mocha-reporter",
      "karma-chrome-launcher",
      "karma-edge-launcher",
      "karma-firefox-launcher",
      "karma-ie-launcher",
      "karma-env-preprocessor",
      "karma-coverage",
      "karma-remap-coverage",
      "karma-junit-reporter",
      "karma-json-to-file-reporter",
      "karma-json-preprocessor"
    ],

    // list of files / patterns to load in the browser
    files: [
      // polyfill service supporting IE11 missing features
      // Promise,String.prototype.startsWith,String.prototype.endsWith,String.prototype.repeat,String.prototype.includes,Array.prototype.includes,Object.keys
      "https://cdn.polyfill.io/v2/polyfill.js?features=Symbol,Promise,String.prototype.startsWith,String.prototype.endsWith,String.prototype.repeat,String.prototype.includes,Array.prototype.includes,Object.keys|always",
      "dist-test/index.browser.js",
      "recordings/browsers/**/*.json"
    ],

    // list of files / patterns to exclude
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      "**/*.js": ["env"],
      // IMPORTANT: COMMENT following line if you want to debug in your browsers!!
      // Preprocess source file to calculate code coverage, however this will make source file unreadable
      "dist-test/index.browser.js": ["coverage"],
      "recordings/browsers/**/*.json": ["json"]
    },

    // inject following environment values into browser testing with window.__env__
    // environment values MUST be exported or set with same console running "karma start"
    // https://www.npmjs.com/package/karma-env-preprocessor
    envPreprocessor: ["ACCOUNT_NAME", "ACCOUNT_SAS", "TEST_MODE", "ACCOUNT_TOKEN", "DFS_ACCOUNT_NAME_OPTIONAL", "DFS_ACCOUNT_SAS_OPTIONAL"],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ["mocha", "coverage", "remap-coverage", "junit", "json-to-file"],

    coverageReporter: { type: "in-memory" },

    // Coverage report settings
    remapCoverageReporter: {
      "text-summary": null, // to show summary in console
      html: "./coverage-browser",
      cobertura: "./coverage-browser/cobertura-coverage.xml"
    },

    // Exclude coverage calculation for following files
    remapOptions: {
      exclude: /node_modules|test/g
    },

    junitReporter: {
      outputDir: "", // results will be saved as $outputDir/$browserName.xml
      outputFile: "test-results.browser.xml", // if included, results will be saved as $outputDir/$browserName/$outputFile
      suite: "", // suite will become the package name attribute in xml testsuite element
      useBrowserName: false, // add browser name to report and classes names
      nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
      classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
      properties: {} // key value pair of properties to add to the <properties> section of the report
    },

    jsonToFileReporter: {
      filter: function(obj) {
        // - jsonToFileReporter filters the JSON strings in console.logs.
        // - Console logs with `.writeFile` property are captured and are written to a file(recordings).
        // - The other console statements are captured and printed normally.
        // - Example - console.warn("hello"); -> console.log({ warn: "hello" });
        // - Example - console.log("hello"); -> console.log({ log: "hello" });
        if (process.env.TEST_MODE === "record") {
          if (obj.writeFile) {
            const fs = require("fs-extra");
            // Create the directories recursively incase they don't exist
            try {
              // Stripping away the filename from the file path and retaining the directory structure
              fs.ensureDirSync(obj.path.substring(0, obj.path.lastIndexOf("/") + 1));
            } catch (err) {
              if (err.code !== "EEXIST") throw err;
            }
            fs.writeFile(obj.path, JSON.stringify(obj.content, null, " "), (err) => {
              if (err) {
                throw err;
              }
            });
          } else {
            console.log(obj);
          }
          return false;
        }
      },
      outputPath: "."
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    // 'ChromeHeadless', 'Chrome', 'Firefox', 'Edge', 'IE'
    browsers: ["ChromeHeadless"],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: 1,

    browserNoActivityTimeout: 600000,
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 3,
    browserConsoleLogOptions: {
      terminal: process.env.TEST_MODE !== "record"
    },

    client: {
      mocha: {
        // change Karma's debug.html to the mocha web reporter
        reporter: "html",
        timeout: "600000",
        retries: 2
      }
    }
  });
};
