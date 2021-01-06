import { CfnOutput, Construct, Stage, StageProps } from '@aws-cdk/core';
import { AwsServerlessVideoProcessingStack } from './aws-serverless-video-processing-stack';

/**
 * Deployable unit of web service app
 */
export class AwsServerlessVideoProcessingStage extends Stage {
    public readonly urlOutput: CfnOutput;

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        const service = new AwsServerlessVideoProcessingStack(this, 'WebService');

        // Expose CdkpipelinesDemoStack's output one level higher
        this.urlOutput = service.urlOutput;
    }
}