## Development Environment:

build dev image:
`docker build -t fsq .`

create dev alias for simplicity:
`alias fsq='function fsq_func() { fcli sudo --account $1 --role ${2:-AWSAdministratorAccess} docker run -ti --rm -p 4566:4566 -v $(pwd):$(pwd) -w $(pwd) -e AWS_REGION=us-west-2 -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN fsq bash; }; fsq_func'`

use dev alias:
`fsq <ACCOUNT_NUMBER> [OPTIONAL: Role to assume, will default to AWSAdministratorAccess]`
