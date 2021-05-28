## Overview

This project launches Kong on AWS EC2 instances behind an ELB. Kong configuration is stored in Aurora PostgreSQL DB cluster.

Everything from the EC2 key pair creation to Kong installation on EC2 is captured in the template. Just need to run ```cdk deploy``` to get started. This is not safe to launch in Production since the admin API and GUI (Kong Manager) is not secured.

## Resources
The stack contains an EC2 keypair stored in Secrets Manager. Access the hosts using the RSA private key stored in Secrets Manager by copying the text to a .pem file.

At a high level, the stack launches autoscaling EC2 instances behind ELB. These instances will have Kong installed and running after the deployment completes. Kong configuration is stored in an Aurora cluster.

Outputs of the stack:
* Proxy url - used to handle request routing to registered Kong services
* Admin API url - used to manage Kong
* Admin GUI url - used to manage Kong, but with a GUI interface on the web

## Testing
Clone this project to your local computer and navigate to this project directory.
```bash
git clone https://github.com/phch/aws-playground.git
cd aws-playground/kong-api-cdk
```

Install AWS CDK and configure the AWS CLI.
```bash
npm install -g aws-cdk
aws configure
```

Deploy the CDK project. It takes roughly 15 minutes.
```bash
cdk deploy
```

Validate each of the endpoints.
```bash
curl -i -X GET --url <Proxy-Url>
curl -i -X GET --url <Admin-Api-Url>/services
curl -i -X GET --url <Admin-Gui-Url>
```

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template