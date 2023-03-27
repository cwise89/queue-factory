#!/bin/bash

function setup {
  # Read the file
  json_data=$(cat scripts/bootstrap/base-bootstrap-policy-template.json)

  # Clean up any previous files
  FILE="${1}-bootstrap-policy.json"
  if [ -f "scripts/bootstrap/$FILE" ]; then
      echo "Cleaning up previous $FILE file"
      rm -f $FILE
  fi

  echo "Creating fresh $FILE"

  # Replace placeholders with arguments
  json_data=$(echo "$json_data" | sed "s/PLACEHOLDER_ACCOUNT_ID/$2/g")
  json_data=$(echo "$json_data" | sed "s/PLACEHOLDER_BOOTSTRAP_QUALIFIER/$3/g")
  json_data=$(echo "$json_data" | sed "s/PLACEHOLDER_APP_ID/$1/g")
  json_data=$(echo "$json_data" | sed "s/PLACEHOLDER_REGION/$4/g")

  # Write the modified data to the file
  echo "$json_data" > scripts/bootstrap/$FILE

  # Check if file creation was successful
  if [ $? -ne 0 ]; then
      echo "Error creating $FILE"
      exit 1
  fi

  echo "$FILE created successfully!"
}

function bootstrap {
  policy_name=$1-base-toolkit-policy

  policy_arn="arn:aws:iam::$2:policy/${policy_name}"

  echo "Creating policy $policy_name in account $2"

  # Check if policy already exists
  existing_policy=$(aws iam list-policies --query "Policies[?PolicyName=='$policy_name'].Arn" --output text)
  if [ -n "$existing_policy" ]; then
      echo "Policy $policy_name already exists, skipping creation."
  else
      # Create policy with error handling
      aws iam create-policy --policy-name $policy_name --region $4 --policy-document file://scripts/bootstrap/${1}-bootstrap-policy.json
      if [ $? -ne 0 ]; then
          echo "Error creating policy $policy_name"
          exit 1
      fi

      echo "Policy $policy_name created successfully!"
  fi

  echo "Running CDK bootstrap"

  # Run CDK bootstrap with error handling
  npm --prefix infra/ run cdk -- bootstrap --toolkit-stack-name cdk-toolkit-$1 --qualifier $3 --cloudformation-execution-policies $policy_arn "aws://$2/$4"
  if [ $? -ne 0 ]; then
      echo "Error running CDK bootstrap"
      exit 1
  fi

  echo "CDK bootstrap complete!"
}

echo "Bootstrapping your AWS environment..."

# Read the app ID and bootstrap qualifier from the cdk.json file
app_id=$(jq -r '.context.appId' infra/cdk.json)
bootstrap_qualifier=$(jq -r '.context["@aws-cdk/core:bootstrapQualifier"]' infra/cdk.json)

# Retrieve the AWS account ID and Region from the environment variables
account_id=$(aws sts get-caller-identity --query 'Account' --output text)

# Call the setup and bootstrap functions with the retrieved values
echo "Setting up bootstrap policy for app $app_id in account $account_id"
setup $app_id $account_id $bootstrap_qualifier $AWS_REGION
if [ $? -ne 0 ]; then
    echo "Error setting up bootstrap policy"
    exit 1
fi

bootstrap $app_id $account_id $bootstrap_qualifier $AWS_REGION
if [ $? -ne 0 ]; then
    echo "Error running CDK bootstrap"
    exit 1
fi

echo "All done! Have an awesome day!"
