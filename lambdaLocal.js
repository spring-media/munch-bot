'use strict';

const index = require('./src/index');
index.handler({}, {}, (result,error)=>{
    console.log('Result:', result);
    console.log('Error:', error);
});
