#!/bin/bash
# A configuration change (an environment property, the instance type) restarts
# the containers without a deployment: the same preparation runs first.
exec bash "$(dirname "$0")/../../hooks/prebuild/01-wordpress.sh"
