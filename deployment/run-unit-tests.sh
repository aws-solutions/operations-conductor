#!/bin/bash
#
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#

#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./run-unit-tests.sh
#

# Get reference for all important folders
template_dir="$PWD"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Test] Services"
echo "------------------------------------------------------------------------------"
cd $source_dir/services/
npm run build
npm test

echo "------------------------------------------------------------------------------"
echo "[Test] console"
echo "------------------------------------------------------------------------------"
cd $source_dir/console/
npm run build
npm run test
