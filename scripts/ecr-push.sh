# Parse named arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        shift 2;;
        --repo-name)
        repo_name="$2"
        shift 2;;
        --account-id)
        account_id="$2"
        shift 2;;
        *)
        echo "Invalid argument: $1"
        exit 1;;
    esac
done

# Check if all required arguments are present
if [ -z "$repo_name" ] || [ -z "$account_id" ]; then
    echo "Usage: $0 --repo-name <name> --account-id <id>"
    exit 1
fi

# Check if the repository already exists
if ! aws ecr describe-repositories --repository-names "$repo_name" >/dev/null 2>&1; then
  # Create the repository
  aws ecr create-repository --repository-name "$repo_name" --region us-west-2

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
          "aws:sourceArn": "arn:aws:lambda:us-west-2:$account_id:function:*"
        }
      }
    }
  ]
}
EOF
)
  aws ecr set-repository-policy --repository-name "$repo_name" --policy-text "$policy" --region us-west-2
fi

# Build the Docker image
docker build -t "$repo_name" "$lambda_dir" --no-cache

# Log in to the ECR registry
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin "$account_id".dkr.ecr.us-west-2.amazonaws.com

# Tag and push the Docker image to the ECR registry
docker tag "$repo_name":latest "$account_id".dkr.ecr.us-west-2.amazonaws.com/"$repo_name":latest
docker tag "$repo_name":latest "$account_id".dkr.ecr.us-west-2.amazonaws.com/"$repo_name":$(git rev-parse --short=10 HEAD)
docker push "$account_id".dkr.ecr.us-west-2.amazonaws.com/"$repo_name":latest
docker push "$account_id".dkr.ecr.us-west-2.amazonaws.com/"$repo_name":$(git rev-parse --short=10 HEAD)