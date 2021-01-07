import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import {CdkPipeline, ShellScriptAction, SimpleSynthAction} from "@aws-cdk/pipelines";
import { AwsServerlessVideoProcessingStage } from './aws-serverless-video-procesing-stage';

/**
 * The stack that defines the application pipeline
 */
export class AwsServerlessVideoProcessingPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const pipeline = new CdkPipeline(this, 'Pipeline', {
            // The pipeline name
            pipelineName: 'AwsServerlessVideoProcessingPipeline',
            cloudAssemblyArtifact,

            // Where the source can be found
            sourceAction: new codepipeline_actions.GitHubSourceAction({
                actionName: 'GitHub',
                output: sourceArtifact,
                oauthToken: SecretValue.secretsManager('github-token'),
                owner: 'phch',
                repo: 'aws-serverless-video-processing',
                branch: 'main',
            }),

            // How it will be built and synthesized
            synthAction: SimpleSynthAction.standardNpmSynth({
                sourceArtifact,
                cloudAssemblyArtifact,

                // We need a build step to compile the TypeScript Lambda
                buildCommand: 'npm run build'
            }),
        });

        // This is where we add the application stages
        const preprod = new AwsServerlessVideoProcessingStage(this, 'PreProd');
        const preprodStage = pipeline.addApplicationStage(preprod);
        preprodStage.addActions(new ShellScriptAction({
            actionName: 'TestService',
            useOutputs: {
                ENDPOINT_URL: pipeline.stackOutput(preprod.urlOutput),
            },
            commands: [
                // Use 'curl' to GET the given URL and fail if it returns an error
                'curl -Ssf $ENDPOINT_URL',
            ],
        }));

        pipeline.addApplicationStage(new AwsServerlessVideoProcessingStage(this, 'Prod'));

    }
}