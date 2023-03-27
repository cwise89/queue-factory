FROM public.ecr.aws/lambda/nodejs:14 as builder

WORKDIR /usr/src

COPY ./*.json ./
COPY ./src/*.ts ./

RUN npm i --no-bin-links

RUN npm run build

FROM public.ecr.aws/lambda/nodejs:14

COPY --from=builder /usr/src/build ./
COPY --from=builder /usr/src/package.json ./
COPY --from=builder /usr/src/package-lock.json ./
COPY --from=public.ecr.aws/datadog/lambda-extension:latest /opt/extensions/ /opt/extensions

RUN npm ci --production

CMD ["node_modules/datadog-lambda-js/dist/handler.handler"]
