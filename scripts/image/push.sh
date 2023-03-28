# Parse named arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --handler-id)
        handler_id="$2"
        shift 2;;
        --tag)
        tag="$2"
        shift;;
        --region)
        region="$2"
        shift 2;;
        *)
        echo "Invalid argument: $1"
        exit 1;;
    esac
done

# Check if all required arguments are present
if [ -z "$handler_id" ]; then
    echo "Usage: $0 --handler-id <id> [--ci]"
    exit 1
fi

# Get the AWS account ID
account_id=$(aws sts get-caller-identity --query 'Account' --output text)

# Get the app ID from the cdk.json file
app_id=$(jq -r '.context.appId' infra/cdk.json)

# Set the repository name
repo_name="$app_id/$handler_id"

# Log in to the ECR registry
echo "Logging in to ECR registry..."
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "$account_id".dkr.ecr."$region".amazonaws.com
echo "Logged in successfully!"

# Tag and push the Docker image to the ECR registry
echo "Tagging $repo_name:latest"
docker tag "$repo_name":latest "$account_id".dkr.ecr."$region".amazonaws.com/"$repo_name":latest
echo "Tagging $repo_name:$tag"
docker tag "$repo_name":latest "$account_id".dkr.ecr."$region".amazonaws.com/"$repo_name":"$tag"

echo "Pushing $repo_name:latest"
docker push "$account_id".dkr.ecr."$region".amazonaws.com/"$repo_name":latest

echo "Pushing $repo_name:$tag"
docker push "$account_id".dkr.ecr."$region".amazonaws.com/"$repo_name":"$tag"

echo "Writing deploy output to handlers/npm/$handler_id/deploy.out.json"
echo '{"imageTag": "'${tag}'", "repoName": "'${repo_name}'"}' > handlers/npm/"${handler_id}"/deploy.out.json

echo "Image deployed successfully!"
