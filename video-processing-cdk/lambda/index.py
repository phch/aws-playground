import boto3
import urllib.parse
import shlex
import subprocess
import os

# Environment Variables
S3_DESTINATION_BUCKET=os.environ.get('S3_DESTINATION_BUCKET')

# Constants
S3_SIGNED_URL_EXPIRATION=120
FFMPEG_PARAMS='-f mpegts -c:v copy -af aresample=async=1:first_pts=0 -'

# Clients
s3 = boto3.client('s3')

def handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')

    s3_signed_url_get_object = s3.generate_presigned_url('get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=S3_SIGNED_URL_EXPIRATION)
    
    ffmpeg_cmd = '/opt/bin/ffmpeg -i \"' + s3_signed_url_get_object + '\" ' + FFMPEG_PARAMS
    cmd = shlex.split(ffmpeg_cmd)
    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    output_key = os.path.splitext(key)[0] + ".ts"
    s3.put_object(Body=process.stdout, Bucket=S3_DESTINATION_BUCKET, Key=output_key)

    return {
        'statusCode': 200,
        'inputBucket': bucket,
        'inputKey': key,
        'outputBucket': S3_DESTINATION_BUCKET,
        'outputKey': output_key
    }