#!/bin/bash

# Check if handler directory name argument has been provided
if [ $# -eq 0 ]
  then
    echo "No handler directory name provided"
    exit 1
fi

# Set variables
HANDLER_DIR=$1
STACKS_DIR="cdk.out"

# Set the stack name pattern to search for
STACK_NAME="fs-queues-$HANDLER_DIR"

# Find all stack directories that match the stack name pattern
STACKS=($(ls -d "$STACKS_DIR"/*"$STACK_NAME"*))

# Check if any stacks were found
if [ ${#STACKS[@]} -eq 0 ]
  then
    echo "No stacks found with the name $STACK_NAME"
    exit 1
fi

# Loop through each stack directory found and deploy the stack
for STACK in "${STACKS[@]}"
do
  echo "Deploying stack $STACK"
  npm --prefix infra/ run deploy -- --stack-name $(basename "$STACK")
done
