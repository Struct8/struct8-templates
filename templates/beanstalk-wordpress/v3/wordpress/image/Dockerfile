# The WordPress image the environment runs, built by the apply and pushed to the
# ECR repository this folder fills (image_path_ on the repository).
#
# It adds three files to the official image and runs nothing at build time, so
# the build for an arm64 instance needs no emulation:
#   db-bootstrap.php  creates or updates WordPress's own database user
#   wp-auto-setup.sh  the setup script of the WordPress Professional template,
#                     copied from commit e6455bc1055981fb766f29f6b4ab156abb452e0e,
#                     SHA-256 36132da337afa6766531ff4fcbc5bc63a5ffb075974fbc1d75cd7656b80e62da
#   start.sh          runs the two, then Apache
FROM public.ecr.aws/docker/library/wordpress:php8.4-apache

COPY db-bootstrap.php wp-auto-setup.sh start.sh /opt/struct8/

# The image's entrypoint (docker-entrypoint.sh) runs any command that is not
# Apache as given; start.sh calls it for Apache at the end.
CMD ["bash", "/opt/struct8/start.sh"]
