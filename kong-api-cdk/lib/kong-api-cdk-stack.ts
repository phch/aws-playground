import * as cdk from '@aws-cdk/core';
import * as cfn_inc from '@aws-cdk/cloudformation-include';
import { KeyPair } from 'cdk-ec2-key-pair';
import * as path from 'path';

export class KongApiCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const key = new KeyPair(this, 'KongEc2KeyPair', {
      name: 'KongEc2KeyPair',
      description: 'Key pair for Kong EC2 instances',
      storePublicKey: true,
    });

    const kongCfn = new cfn_inc.CfnInclude(this, 'KongPostgresTemplate', {
      templateFile: path.join(__dirname, 'kong-postgres.template.yml'),
      preserveLogicalIds: false,
      parameters: {
        'KongKeyName': key.keyPairName,
        'KongFleetDesiredSize': '1',
        'KongInstanceType': 't2.micro',
        'DBClass': 'db.t2.micro',
      },
    });
  }
}
