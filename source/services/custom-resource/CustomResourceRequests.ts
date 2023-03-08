/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CustomResourceRequestType {
    CREATE = "Create",
    UPDATE = "Update",
    DELETE = "Delete"
}

export const noActionRequiredResponse = {
    Data: 'No action is needed.'
}