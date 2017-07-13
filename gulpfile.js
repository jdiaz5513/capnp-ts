var _ = require('lodash');
var gulp = require('gulp');
var gutil = require('gulp-util');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');
var realTslint = require('tslint');
var spawnSync = require('child_process').spawnSync;

function build(src, dest) {
  var tsProject = ts.createProject('configs/tsconfig-base.json', { declaration: true });
  return gulp.src(src)
    .pipe(tsProject())
    .pipe(gulp.dest(dest));
}

gulp.task('build:capnp', function () {
  return build('./packages/capnp-ts/src/**/*.ts', 'packages/capnp-ts/lib');
});

gulp.task('build:capnpc', function () {
  // Stub, schema are not compiled yet
  return build('./packages/capnpc-ts/src/**/*.ts', 'packages/capnpc-ts/lib');
});

gulp.task('build', ['build:capnp'/*, 'build:capnpc'*/]);

function test(src, dest, coverage) {
  var tsProject = ts.createProject('configs/tsconfig-base.json');
  return gulp.src(src)
    .pipe(tsProject())
    .pipe(gulp.dest(dest))
    .pipe(gutil.buffer(function (err, files) {
      var options = ['-J'];
      if (coverage) {
        options.push('--cov', '--nyc-arg=-x=**/lib-test/**/*');
      }
      // lodash is used for Node 4 compatibility
      var result = spawnSync('./node_modules/.bin/tap', options.concat(_.map(files, function (file) {
        return file.path;
      })), { stdio: 'inherit' });
      if (result.status != 0) {
        throw new Error('Process exited with non-zero status: ' + result.status);
      }
    }));
}

gulp.task('test:capnp', ['build:capnp'], function () {
  return test(
    './packages/capnp-ts/test/**/*.spec.ts',
    'packages/capnp-ts/lib-test',
    false
  );
});

gulp.task('test', ['test:capnp']);

gulp.task('test-cov:capnp', ['build:capnp'], function () {
  return test(
    './packages/capnp-ts/test/**/*.spec.ts',
    'packages/capnp-ts/lib-test',
    true
  );
});

gulp.task('test-cov', ['test-cov:capnp']);

gulp.task('coverage', ['test-cov'], function () {
  var result = spawnSync('./node_modules/.bin/tap', ['--coverage-report=lcov'], { stdio: 'inherit' });
  if (result.status != 0) {
    throw new Error('Process exited with non-zero status: ' + result.status);
  }
})

gulp.task('benchmark:capnp', function () {
  var tsProject = ts.createProject('configs/tsconfig-base.json');
  return gulp.src('./packages/capnp-ts/test/benchmark/**/*.ts')
    .pipe(tsProject())
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

gulp.task('benchmark', ['benchmark:capnp']);

gulp.task('lint', function () {
  var program = realTslint.Linter.createProgram('tsconfig.json');
  return gulp.src('packages/*/src/**/*.ts')
    .pipe(tslint({ program }));
})

gulp.task('watch', function () {
  return gulp.watch('packages/**/*', ['test']);
})
