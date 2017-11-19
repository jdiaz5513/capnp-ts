/**
 * @author ishitatsuyuki
 */

var gulp = require('gulp');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');
var realTslint = require('tslint');
var mergeStream = require('merge-stream');
var spawnSync = require('child_process').spawnSync;

// FIXME: Not yet able to compile all the schema files, so this whitelist is needed.
const CAPNP_WHITELIST = [
  'capnp-ts/src/std/schema.capnp',
  'capnp-ts/test/integration/foo.capnp',
  'capnp-ts/test/integration/foo-new.capnp',
  'capnp-ts/test/integration/list-mania.capnp',
  'capnp-ts/test/integration/upgrade-v1.capnp',
  'capnpc-ts/test/integration/import-bar.capnp',
  'capnpc-ts/test/integration/import-foo.capnp'
];


function build(src, dest, test) {
  var tsProject = ts.createProject('configs/tsconfig-base.json', { declaration: !test });
  return gulp.src(src)
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write('.', { includeContent: false, destPath: dest }))
    .pipe(gulp.dest(dest));
}

function compileCapnp() {
  return gutil.buffer(function (err, files) {
    files.filter(function (file) {
      return file.path.endsWith('.capnp') && CAPNP_WHITELIST.some((p) => file.path.endsWith(p));
    }).forEach(function (file) {
      var options = ['-o./packages/capnpc-ts/bin/capnpc-ts.js', file.path];
      var result = spawnSync('capnpc', options, { stdio: 'inherit' });
      if (result.status !== 0) {
        throw new Error('Process exited with non-zero status: ' + result.status);
      }
    });
  });
}

/** Compile any capnp schema files. */
gulp.task('build:capnp', ['build:capnp-ts', 'build:capnpc-ts'], function() {
  return gulp.src('./packages/**/*.capnp')
    .pipe(compileCapnp());
});

/** Build the main capnp-ts library. */
gulp.task('build:capnp-ts', function () {
  return build('./packages/capnp-ts/src/**/*.ts', 'packages/capnp-ts/lib', false);
});

/** Build the capnpc-ts schema compiler. */
gulp.task('build:capnpc-ts', ['build:capnp-ts'], function () {
  return build('./packages/capnpc-ts/src/**/*.ts', 'packages/capnpc-ts/lib', false);
});

/** Build the capnpc-js schema compiler. */
gulp.task('build:capnpc-js', ['build:capnp-ts', 'build:capnpc-ts'], function () {
  return build('./packages/capnpc-js/src/**/*.ts', 'packages/capnpc-js/lib', false);
});

/** Main build task (does not build tests). */
gulp.task('build', ['build:capnp-ts', 'build:capnpc-ts', 'build:capnpc-js', 'build:capnp']);

function test(coverage) {
  return gutil.buffer(function (err, files) {
    var options = ['-J', '-R', 'spec'];
    if (coverage) {
      options.push('--cov', '--nyc-arg=-x=**/lib-test/**/*');
    }
    var result = spawnSync('./node_modules/.bin/tap', options.concat(files.map(function (file) {
      return file.path;
    }).filter(function (path) {
      // This filters not only unrelated files, but also sourcemaps
      return path.endsWith('.spec.js');
    })), { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error('Process exited with non-zero status: ' + result.status);
    }
  });
}

/** Run tests for the main capnp-ts library. */
gulp.task('test:capnp-ts', ['build:capnp', 'build:capnp-ts'], function () {
  return build(
    './packages/capnp-ts/test/**/*.ts',
    'packages/capnp-ts/lib-test',
    true
  ).pipe(test(false));
});

/** Run tests for the capnpc-ts schema compiler. */
gulp.task('test:capnpc-ts', ['build:capnp', 'build:capnpc-ts'], function () {
  return build(
    './packages/capnpc-ts/test/**/*.ts',
    'packages/capnpc-ts/lib-test',
    true
  ).pipe(test(false));
});

/** Run tests for the capnpc-js schema compiler. */
gulp.task('test:capnpc-js', ['build:capnp', 'build:capnpc-js'], function () {
  return build(
    './packages/capnpc-js/test/**/*.ts',
    'packages/capnpc-js/lib-test',
    true
  ).pipe(test(false));
});

/** Run all tests. */
gulp.task('test', ['test:capnp-ts', 'test:capnpc-ts', 'test:capnpc-js']);

/** Run all tests with test coverage. */
gulp.task('test-cov', ['build:capnp', 'build:capnp-ts', 'build:capnpc-ts', 'build:capnpc-js'], function () {
  return mergeStream(build(
    './packages/capnp-ts/test/**/*.ts',
    'packages/capnp-ts/lib-test',
    true
  ), build(
    './packages/capnpc-ts/test/**/*.ts',
    'packages/capnpc-ts/lib-test',
    true
  ), build(
    './packages/capnpc-js/test/**/*.ts',
    'packages/capnpc-js/lib-test',
    true
  )).pipe(test(true));
});

gulp.task('coverage', ['test-cov'], function () {
  var result = spawnSync('./node_modules/.bin/tap', ['--coverage-report=lcov'], { stdio: 'inherit' });
  if (result.status != 0) {
    throw new Error('Process exited with non-zero status: ' + result.status);
  }
});

gulp.task('benchmark:capnp-ts', ['build:capnp', 'build:capnp-ts'], function () {
  var tsProject = ts.createProject('configs/tsconfig-base.json');
  return build(
    './packages/capnpc-ts/test/benchmark/**/*.ts',
    'packages/capnpc-ts/lib-test',
    true
  ).on('finish', function () {
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
