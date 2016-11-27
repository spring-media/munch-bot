module.exports = {
    region: 'eu-central-1',
    handler: 'index.handler',
    role: "arn:aws:iam::<ReplaceWithAwsAccountId>:role/MinimalLambdaRole",
    functionName: "munchbot",
    timeout: 10,
    memorySize: 128,
    publish: true, // default: false,
    runtime: 'nodejs4.3', // default: 'nodejs',
};
