# The Munch-Bot

A tiny Lambda Function (http://docs.aws.amazon.com/lambda/latest/dg/welcome.html) that 
parses the html of the Paparazzi-Menu of the day (https://pace.berlin/) and posts
it into our #essen_berlin slack-channel.
The execution of the Lambda is triggered via a daily Cloudwatch event at 11:00 a.m.

## Deployment

To execute the deployment, AWS credentials with enough rights have to be available.
The role "MinimalLambdaRole" just needs rights to write to Cloudwatch-Logs.

```
$ yarn install
```

## local developement

```
$ yarn runLocal
```

## next features:

- regularily download and save all available menu-plans and then provide full-text-search via bot command, e.g. `/munchbot pasta`