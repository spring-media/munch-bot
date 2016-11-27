const gulp = require('gulp');
const zip = require('gulp-zip');
const del = require('del');
const runSequence = require('run-sequence');
const install = require('gulp-install');
const awsLambda = require("node-aws-lambda");

gulp.task('clean', function () {
    return del(['./dist', './dist.zip']);
});

gulp.task('js', function () {
    return gulp.src(['src/**/*'])
        .pipe(gulp.dest('dist/'));
});

gulp.task('node-mods', function () {
    return gulp.src('./package.json')
        .pipe(gulp.dest('dist/'))
        .pipe(install({production: true}));
});

gulp.task('zip', function () {
    return gulp.src(['dist/**/*', '!dist/package.json'])
        .pipe(zip('dist.zip'))
        .pipe(gulp.dest('./'));
});

gulp.task('upload', function (callback) {
    const lambdaConfig = require("./lambda-config.js");
    console.log(`Deploying lambda '${lambdaConfig.functionName}'`);
    awsLambda.deploy('./dist.zip', lambdaConfig, callback);
});


gulp.task('build', function (callback) {
    return runSequence(
        ['clean'],
        ['js', 'node-mods'],
        ['zip'],
        callback
    );
});

gulp.task('deploy', function (callback) {
    return runSequence(
        ['build'],
        ['upload'],
        callback
    );
});
