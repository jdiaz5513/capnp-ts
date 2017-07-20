/**
 * @author ishitatsuyuki
 */

var gulp = require('gulp');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');
var realTslint = require('tslint');
var spawnSync = require('child_process').spawnSync;

function build(src, dest) {
  var tsProject = ts.createProject('configs/tsconfig-base.json', { declaration: true });
  return gulp.src(src)
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write('.', { includeContent: false, destPath: dest }))
    .pipe(gulp.dest(dest));
}

gulp.task('build:capnp-ts:lib', function () {
  return build('./packages/capnp-ts/src/**/*.ts', 'packages/capnp-ts/lib');
});

gulp.task('build:capnpc-ts:lib', ['build:capnp-ts'], function () {
  return build('./packages/capnpc-ts/src/**/*.ts', 'packages/capnpc-ts/lib');
});

/** Build the capnpc-js schema compiler. */
gulp.task('build:capnpc-js:lib', ['build:capnp-ts:lib', 'build:capnpc-ts:lib'], function () {
  return build('./packages/capnpc-js/src/**/*.ts', 'packages/capnpc-ts/lib');
});

/** Build tests for capnp-ts. */
gulp.task('build:capnp-ts:test', ['build:capnp-ts:lib'], function () {
  return build('./packages/capnp-ts/test/**/*.ts', 'packages/capnp-ts/lib-test');
});

/** Build tests for capnpc-ts. */
gulp.task('build:capnpc-ts:test', ['build:capnpc-ts:lib'], function () {
  return build('./packages/capnpc-ts/test/**/*.ts', 'packages/capnpc-ts/lib-test');
});

/** Build tests for capnpc-js. */
gulp.task('build:capnpc-js:test', ['build:capnpc-js:lib'], function () {
  return build('./packages/capnpc-js/test/**/*.ts', 'packages/capnpc-js/lib-test');
});

/** Main build task (does not build tests). */
gulp.task('build', ['build:capnp-ts:lib', 'build:capnpc-ts:lib', 'build:capnpc-js:lib']);

/** Build all tests. */
gulp.task('build-test', ['build:capnp-ts:test', 'build:capnpc-ts:test', 'build:capnpc-js:test']);

function test(src, dest, coverage) {
  var tsProject = ts.createProject('configs/tsconfig-base.json');
  return gulp.src(src)
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write('.', { includeContent: false, destPath: dest }))
    .pipe(gulp.dest(dest))
    .pipe(gutil.buffer(function (err, files) {
      var options = ['-J'];
      if (coverage) {
        options.push('--cov', '--nyc-arg=-x=**/lib-test/**/*');
      }
      var result = spawnSync('./node_modules/.bin/tap', options.concat(files.map(function (file) {
        return file.path;
      }).filter(function (path) {
        // This filters not only unrelated files, but also sourcemaps
        return path.endsWith('.spec.js');
      })), { stdio: 'inherit' });
      if (result.status != 0) {
        throw new Error('Process exited with non-zero status: ' + result.status);
      }
    }));
}

gulp.task('test:capnp-ts', ['build:capnp-ts:test'], function () {
  return test(
    './packages/capnp-ts/test/**/*.ts',
    'packages/capnp-ts/lib-test',
    false
  );
});

gulp.task('test:capnpc-ts', ['build:capnpc-ts:test'], function () {
  return test(
    './packages/capnpc-ts/test/**/*.ts',
    'packages/capnpc-ts/lib-test',
    false
  );
});

/** Run tests for the capnpc-js schema compiler. */
gulp.task('test:capnpc-js', ['build:capnpc-js:test'], function () {
  return test(
    './packages/capnpc-js/test/**/*.ts',
    'packages/capnpc-js/lib-test',
    false
  );
});

/** Run all tests. */
gulp.task('test', ['test:capnp-ts', 'test:capnpc-ts', 'test:capnpc-ts']);

/** Run all tests with test coverage. */
gulp.task('test-cov', ['build:capnp-ts:test', 'build:capnpc-ts:test', 'build:capnpc-js:test'], function () {
  return test('packages/*/lib-test/**/*.spec.js', true);
});

gulp.task('test', ['test:capnp-ts', 'test:capnpc-ts']);

gulp.task('test-cov:capnp-ts', ['build:capnp-ts'], function () {
  return test(
    './packages/capnp-ts/test/**/*.ts',
    'packages/capnp-ts/lib-test',
    true
  );
});

gulp.task('test-cov:capnpc-ts', ['build:capnpc-ts'], function () {
  return test(
    './packages/capnpc-ts/test/**/*.ts',
    'packages/capnpc-ts/lib-test',
    true
  );
});

gulp.task('test-cov', ['test-cov:capnp-ts', 'test-cov:capnpc-ts']);

gulp.task('coverage', ['test-cov'], function () {
  var result = spawnSync('./node_modules/.bin/tap', ['--coverage-report=lcov'], { stdio: 'inherit' });
  if (result.status != 0) {
    throw new Error('Process exited with non-zero status: ' + result.status);
  }
});

gulp.task('benchmark:capnp-ts', function () {
  var tsProject = ts.createProject('configs/tsconfig-base.json');
  return gulp.src('./packages/capnp-ts/test/benchmark/**/*.ts')
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('packages/capnp-ts/lib-test'))
    .on('finish', function () {
      var result = spawnSync(process.execPath,
        ['packages/capnp-ts/lib-test/benchmark/index.js'],
        { stdio: 'inherit' });
      if (result.status != 0) {
        throw new Error('Process exited with non-zero status: ' + result.status);
      }
    });
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
