# Parse named arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --handler-id)
        handler_id="$2"
        shift 2;;
        --ci)
        ci=true
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

# Get the timestamp or git commit hash for the tag. 
if [ "$ci" = true ]; then
    tag=$(git rev-parse --short=10 HEAD)
else
    # Get the timestamp for the tag, using this as it will be unique and the git sha will not be during development
    tag=$(date +%Y%m%dT%H%M%S%z)
fi

# Get the app ID from the cdk.json file
app_id=$(jq -r '.context.appId' infra/cdk.json)

# Set the repository name
repo_name="$app_id/$handler_id"

# Check if the repository already exists
echo "Checking if repository $repo_name exists..."
if ! aws ecr describe-repositories --repository-names "$repo_name" >/dev/null 2>&1; then
    echo "Repository $repo_name does not exist, creating..."
    # Create the repository
    aws ecr create-repository --repository-name "$repo_name" --region $region
    echo "Repository $repo_name created successfully!"

    # Apply the policy to the repository
    policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "lambdaPull",
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": [
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Condition": {
        "ArnLike": {
          "aws:sourceArn": "arn:aws:lambda:$region:$account_id:function:*"
        }
      }
    }
  ]
}
EOF
)
    echo "Applying policy to repository $repo_name..."
    aws ecr set-repository-policy --repository-name "$repo_name" --policy-text "$policy" --region $region
    echo "Policy applied successfully!"
fi

# Build the Docker image
echo "Building Docker image for $handler_id..."
docker build -t "$repo_name" handlers/npm/"$handler_id" --no-cache
echo "Docker image built successfully!"

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
