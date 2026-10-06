# The orders API. Built and pushed to ECR by buildspec/release.yml.
#
# The base image comes from the ECR Public mirror of the Docker official images:
# CodeBuild pulls it from AWS, without the anonymous pull limit of Docker Hub.
FROM public.ecr.aws/docker/library/node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dependencies first, in their own layer: a change to src/ reuses it.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY migrations ./migrations

USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
