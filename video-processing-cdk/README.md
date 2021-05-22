## Overview

This project launches a FFMPEG-backed Lambda video processor using CDK. Processing happens in-memory which can scale up to 10 GB, so it gets around the /tmp directory fixed space of 512 MB.

It should run at a fraction of the cost of managed AWS media services like Elastic Transcoder or MediaConvert and is suitable for simple video processing. Large video files (> 4 GB) may not be supported by this solution.  


There are drawbacks to this solution; for example, it cannot process large videos (>GB) due to Lambda's memory limit an runtime. And, 

## Resources
The stack contains two buckets: an input bucket to upload videos and an output video to store processed videos.
Uploads to the input bucket with an .mp4 extension will trigger the Lambda processing.

## Testing
Clone this project to your local computer and navigate to this project directory.
```bash
git clone https://github.com/phch/aws-playground.git
cd aws-playground/video-processing-cdk
```

Set up the AWS CLI if you haven't configured it yet.
```bash
aws configure
```

Deploy the CDK project and note the name of the S3 input bucket created.
```bash
cdk deploy
```

Test upload a sample mp4 bucket. View the result in the output S3 bucket and the execution logs in Lambda.
```bash
cd aws-playground/video-processing-cdk/test/video
aws s3 cp sample.mp4 s3://<input-bucket-name>
```

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template