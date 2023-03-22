#!/usr/bin/env bash

# ARGS:
#   - account_id: AWS account ID.
#   - bootstrap_qualifier: Name of qualifier that will be used to bootstrap your environment
#   - stack_id: The name of your stack
function setup {
  # Read the file
  json_data=$(<infra/bootstrap/base-bootstrap-policy-template.json)

  # Clean up any previous files
  FILE=base-bootstrap-policy.json
  if [ -f "infra/bootstrap/$FILE" ]; then
      echo "$FILE already exists, removing so we can start out funky fresh."
      rm -f base-bootstrap-policy.json
  fi

  echo "Creating $FILE"

  # Replace placeholders with arguments
  json_data=$(echo "$json_data" | sed "s/PLACEHOLDER_ACCOUNT_ID/$1/g")
  json_data=$(echo "$json_data" | sed "s/PLACEHOLDER_BOOTSTRAP_QUALIFIER/$2/g")
  json_data=$(echo "$json_data" | sed "s/PLACEHOLDER_STACK_ID/$3/g")

  # Write the modified data to the file
  echo "$json_data" > infra/bootstrap/base-bootstrap-policy.json
}

# ARGS:
#   - account_id: AWS account ID.
#   - bootstrap_qualifier: Name of qualifier that will be used to bootstrap your environment
#   - stack_id: Name of cdk stack.
function bootstrap {
  policy_name=$3-base-toolkit-policy

  policy_arn="arn:aws:iam::$1:policy/${policy_name}"

  fcli sudo --account $1 --role AWSAdministratorAccess aws iam create-policy --policy-name $policy_name --region us-west-2 --policy-document file://infra/bootstrap/base-bootstrap-policy.json

  command="aws/$1/us-west-2"

  fcli sudo --account $1 --role AWSAdministratorAccess npm --prefix infra run cdk -- bootstrap --toolkit-stack-name cdk-toolkit-$2 --qualifier $2 --cloudformation-execution-policies $policy_arn "aws://$1/us-west-2"

  echo "All done! Have an AWeSome day!"
}

echo "Bootstrapping your AWS environment."

echo "what's the account id?"
read account_id

echo "what's the bootstrap qualifier?"
read bootstrap_qualifier

echo "what is your stack id?"
read stack_id

setup $account_id $bootstrap_qualifier $stack_id
bootstrap $account_id $bootstrap_qualifier $stack_id