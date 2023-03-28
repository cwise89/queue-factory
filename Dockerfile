FROM alpine:3.17
RUN apk update

# install some common tools
RUN apk add git npm vim jq uuidgen curl bash

# install aws cli
RUN apk add --no-cache \
    python3 \
    py3-pip \
    && pip3 install --upgrade pip \
    && pip3 install --no-cache-dir \
    awscli \
    && rm -rf /var/cache/apk/*

# install npm tools globally
RUN npm install -g aws-cdk-local aws-cdk nodemon ts-node typescript

RUN echo 'function init() {\
    if [ "$1" = "npm" ]; then\
    cp ./samples/npm/ts-lambda-handler/ ./handlers/npm/ts-lambda-handler -r;\
    elif [ "$1" = "gradle" ]; then\
    cp ./samples/gradle/java-lambda-handler ./handlers/gradle/java-lambda-handler -r;\
    else\
    echo "Invalid template argument";\
    fi\
    }' >> ~/.bashrc

RUN echo 'prepare() {\
    echo "Installing dependencies for infra";\
    npm --prefix infra/ install;\
    if [ "$#" -eq 0 ]; then\
    for dir in ./handlers/npm/*/; do\
    echo "Installing dependencies for handlers/npm/$dir";\
    npm --prefix "$dir" install;\
    done;\
    else\
    for dir in "$@"; do\
    echo "Installing dependencies for handlers/npm/$dir";\
    npm --prefix "handlers/npm/$dir" install;\
    done;\
    fi\
    }' >> ~/.bashrc

RUN echo 'alias bootstrap="sh scripts/bootstrap/bootstrap.sh"' >> ~/.bashrc
