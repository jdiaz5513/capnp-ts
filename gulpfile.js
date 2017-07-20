/**
 * @author ishitatsuyuki
 */

var gulp = require('gulp');
var tslint = require('gulp-tslint');
var glob = require('glob');
var realTslint = require('tslint');
var spawnSync = require('child_process').spawnSync;

function build(projectConfig) {
  var result = spawnSync('./node_modules/.bin/tsc', ['-p', projectConfig], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('Process exited with non-zero status: ' + result.status);
  }
}

/** Build the main capnp-ts library. */
gulp.task('build:capnp-ts:lib', function () {
  return build('configs/capnp-ts/tsconfig-lib.json');
});

/** Build the capnpc-ts schema compiler. */
gulp.task('build:capnpc-ts:lib', ['build:capnp-ts:lib'], function () {
  return build('configs/capnpc-ts/tsconfig-lib.json');
});

/** Build the capnpc-js schema compiler. */
gulp.task('build:capnpc-js:lib', ['build:capnp-ts:lib', 'build:capnpc-ts:lib'], function () {
  return build('configs/capnpc-js/tsconfig-lib.json');
});

/** Build tests for capnp-ts. */
gulp.task('build:capnp-ts:test', ['build:capnp-ts:lib'], function () {
  return build('configs/capnp-ts/tsconfig-lib-test.json');
});

/** Build tests for capnpc-ts. */
gulp.task('build:capnpc-ts:test', ['build:capnpc-ts:lib'], function () {
  return build('configs/capnpc-ts/tsconfig-lib-test.json');
});

/** Build tests for capnpc-js. */
gulp.task('build:capnpc-js:test', ['build:capnpc-js:lib'], function () {
  return build('configs/capnpc-js/tsconfig-lib-test.json');
});

/** Main build task (does not build tests). */
gulp.task('build', ['build:capnp-ts:lib', 'build:capnpc-ts:lib', 'build:capnpc-js:lib']);

/** Build all tests. */
gulp.task('build-test', ['build:capnp-ts:test', 'build:capnpc-ts:test', 'build:capnpc-js:test']);

function test(src, coverage) {
  var options = glob.sync(src).concat('-J');
  if (coverage) {
    options.push('--cov', '--nyc-arg=-x=**/lib-test/**/*');
  }
  var result = spawnSync('./node_modules/.bin/tap', options, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('Process exited with non-zero status: ' + result.status);
  }
}

/** Run tests for the main capnp-ts library. */
gulp.task('test:capnp-ts', ['build:capnp-ts:test'], function () {
  return test('packages/capnp-ts/lib-test/**/*.spec.js', false);
});

/** Run tests for the capnpc-ts schema compiler. */
gulp.task('test:capnpc-ts', ['build:capnpc-ts:test'], function () {
  return test('packages/capnpc-ts/lib-test/**/*.spec.js', false);
});

/** Run tests for the capnpc-js schema compiler. */
gulp.task('test:capnpc-js', ['build:capnpc-js:test'], function () {
  return test('packages/capnpc-js/lib-test/**/*.spec.js', false);
});

/** Run all tests. */
gulp.task('test', ['test:capnp-ts', 'test:capnpc-ts', 'test:capnpc-ts']);

/** Run all tests with test coverage. */
gulp.task('test-cov', ['build:capnp-ts:test', 'build:capnpc-ts:test', 'build:capnpc-js:test'], function () {
  return test('packages/*/lib-test/**/*.spec.js', true);
});

/** Run all tests and generate a coverage report. */
gulp.task('coverage', ['test-cov'], function () {
  var result = spawnSync('./node_modules/.bin/tap', ['--coverage-report=lcov'], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('Process exited with non-zero status: ' + result.status);
  }
});

gulp.task('benchmark:capnp-ts', ['build:capnp-ts:test'], function () {
  var result = spawnSync(process.execPath, ['packages/capnp-ts/lib-test/benchmark/index.js'], { stdio: 'inherit' });
  if (result.status != 0) {
    throw new Error('Process exited with non-zero status: ' + result.status);
  }
});

gulp.task('benchmark', ['benchmark:capnp-ts']);

gulp.task('lint', function () {
  var program = realTslint.Linter.createProgram('tsconfig.json');
  return gulp.src('packages/*/src/**/*.ts')
    .pipe(tslint({ program }));
});

gulp.task('watch', function () {
  return gulp.watch('packages/*/{src,test}/**/*', ['test']);
});
