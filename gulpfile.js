const gulp = require('gulp');
const zip = require('gulp-zip');
const del = require('del');
const runSequence = require('gulp4-run-sequence');
const install = require('gulp-install');
const awsLambda = require("node-aws-lambda");
const fs = require('fs');


gulp.task('clean', function () {
    return del(['./dist', './dist.zip']);
});

gulp.task('js', function () {
    console.log(`JS lambda`);
    return gulp.src(['src/**/*'])
        .pipe(gulp.dest('dist/'));
});



gulp.task('node-mods', function () {
    return gulp.src('./package.json')
        .pipe(gulp.dest('dist/'))
        .pipe(install({production: true}));
});

gulp.task('zip', function () {

    console.log(`Zip lambda`);
    return gulp.src(['dist/**/*', '!dist/package.json'])
        .pipe(zip('dist.zip'))
        .pipe(gulp.dest('./'));
});

gulp.task('upload', function (callback) {
    const lambdaConfig = require("./lambda-config.js");

    console.log(`Deploying lambda '${lambdaConfig.functionName}'`);
    awsLambda.deploy('./dist.zip', lambdaConfig, callback);
});


gulp.task('build', gulp.series('clean', 'js', 'node-mods', 'zip'));

gulp.task('deploy', gulp.series('build', 'upload'));
