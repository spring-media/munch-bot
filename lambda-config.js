module.exports = {
    region: 'eu-central-1',
    handler: 'index.handler',
    role: "arn:aws:iam::272144222552:role/MinimalLambdaRole",
    functionName: "munchbot",
    timeout: 10,
    memorySize: 256,
    publish: true, // default: false,
    runtime: 'nodejs12.x' // default: 'nodejs',
};
