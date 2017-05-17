module.exports = {
    region: 'eu-central-1',
    handler: 'index.handler',
    role: "arn:aws:iam::<awsAccountId>:role/MinimalLambdaRole",
    functionName: "munchbot",
    timeout: 10,
    memorySize: 128,
    publish: true, // default: false,
    runtime: 'nodejs6.10', // default: 'nodejs',
};
