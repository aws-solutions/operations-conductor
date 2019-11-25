# Operations Conductor
## Description
AWS Operations Conductor is a framework that provides an easy-to-use interface for automating and orchestrating operational tasks to manage AWS resources at scale.

## Running unit tests for customization
* Clone the repository, then make the desired code changes.
```bash
git clone https://github.com/awslabs/operations-conductor.git
cd operations-conductor
export OPS_CO_PATH=`pwd`
```

* Next, run unit tests to make sure added customization passees the tests.
```bash
cd $OPS_CO_PATH/deployment
chmod +x ./run-unit-tests.sh
./run-unit-tests.sh
```

## Building the customized solution
* Configure the build paraemters.
```bash
export DIST_OUTPUT_BUCKET=my-bucket-name # bucket where customized code will reside
export VERSION=my-version # version number for the customized code
export SOLUTION_NAME=operations-conductor # solution name for the customized code
```
_Note:_ You would have to create an S3 bucket with the prefix 'my-bucket-name-<aws_region>' as whole Lambda functions are going to get the source codes from the 'my-bucket-name-<aws_region>' bucket; aws_region is where you are deployting the customized solution (e.g. us-east-1, us-east-2, etc.).

* Build the customized solution
```bash
cd $OPS_CO_PATH/deployment
chmod +x ./build-s3-dist.sh
./build-s3-dist.sh $DIST_OUTPUT_BUCKET $SOLUTION_NAME $VERSION
```

* Deploy the source codes to an Amazon S3 bucket in your account. _Note:_ You must have the AWS Command Line Interface installed and create the Amazon S3 bucket in your account prior to copy source codes.
```bash
export AWS_REGION=us-east-1 # the AWS region you are going to deploy the solution in your account.
export AWS_PROFILE=default # the AWS Command Line Interface profile

aws s3 cp $OPS_CO_PATH/deployment/global-s3-assets/ s3://$DIST_OUTPUT_BUCKET-$AWS_REGION/operations-conductor/$VERSION/ --recursive --acl bucket-owner-full-control --profile $AWS_PROFILE
aws s3 cp $OPS_CO_PATH/deployment/regional-s3-assets/ s3://$DIST_OUTPUT_BUCKET-$AWS_REGION/operations-conductor/$VERSION/ --recursive --acl bucket-owner-full-control --profile $AWS_PROFILE
```

## Deploying the customized solution
* Get the link of the operations-conductor.template uploaded to your Amazon S3 bucket.
* Deploy the Operations Conductor solution to your account by launching a new AWS CloudFormation stack using the link of the operations-conductor.template.

***

Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.

This project is licensed under the terms of the Apache 2.0 license. See LICENSE. Included AWS Lambda functions are licensed under the MIT-0 license. See LICENSE.MIT-0.