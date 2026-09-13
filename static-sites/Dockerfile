FROM docker.io/nginxinc/nginx-unprivileged:stable-alpine

# The build context is the project's already-generated dist/ folder.
COPY . /usr/share/nginx/html/

EXPOSE 8080
