'use strict';

const env = require('gulp-env');
const envs = env({
    file: process.env['HOME'] + "/.spring/ep-local-env.json"
});

const index = require('./src/index');

console.log("start local munchbot with Parameter => (channel: "+process.env.SLACK_CHANNEL + ", token: " + process.env.SLACK_TOKEN + ")" );

index.handler({}, {}, (result,error)=>{
    console.log('Result:', result);
    console.log('Error:', error);
});
