# The hello server for Cloud Run. Built for linux/amd64 and pushed to Artifact Registry at apply
# by the Struct8 generator; this folder is the whole build context.
FROM node:22-alpine

WORKDIR /app
COPY server.js ./

USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
