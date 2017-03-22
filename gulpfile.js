const gulp = require('gulp');
const zip = require('gulp-zip');
const del = require('del');
const runSequence = require('run-sequence');
const install = require('gulp-install');
const awsLambda = require("node-aws-lambda");
const replace = require('gulp-replace');
const env = require('gulp-env');
const fs = require('fs');

gulp.task('local-env-file', function () {
    const envFile = process.env['HOME'] + "/.weltn24/ep-local-env.json";
    try {
        console.log(envFile);
        fs.accessSync(envFile, fs.R_OK | fs.W_OK);
        env({file: envFile})
    } catch (e) {
        console.log("Note: Local development ENV file not exists: ", envFile);
    }
});

gulp.task('clean', function () {
    return del(['./dist', './dist.zip']);
});

gulp.task('js', ['local-env-file'], function () {

    if (!process.env['slackToken']) {
        throw "ENV 'slackToken' not defined";
    }

    return gulp.src(['src/**/*'])
        .pipe(replace('<slackToken>', process.env['slackToken']))
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

gulp.task('upload', ['local-env-file'], function (callback) {
    const lambdaConfig = require("./lambda-config.js");
    
    if (!process.env['awsAccountId']) {
        throw "ENV 'awsAccountId' not defined";
    }
    lambdaConfig.role = lambdaConfig.role.replace("<awsAccountId>", process.env['awsAccountId']);
    
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
