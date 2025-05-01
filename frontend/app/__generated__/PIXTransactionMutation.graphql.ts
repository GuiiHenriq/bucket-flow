/**
 * @generated SignedSource<<605537f6a49df1812a3b3af2b1ad73ae>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type PIXTransactionMutation$variables = {
  key: string;
};
export type PIXTransactionMutation$data = {
  readonly queryPIX: {
    readonly data: {
      readonly accountNumber: string;
      readonly accountType: string;
      readonly bank: string;
      readonly key: string;
      readonly name: string;
    } | null | undefined;
    readonly message: string;
    readonly success: boolean;
  };
};
export type PIXTransactionMutation = {
  response: PIXTransactionMutation$data;
  variables: PIXTransactionMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "key"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "key",
        "variableName": "key"
      }
    ],
    "concreteType": "PIXResponse",
    "kind": "LinkedField",
    "name": "queryPIX",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "success",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "message",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PIXData",
        "kind": "LinkedField",
        "name": "data",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "key",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "name",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "bank",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "accountType",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "accountNumber",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "PIXTransactionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "PIXTransactionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "85526f8d205e8823e0f6902e3ab36d93",
    "id": null,
    "metadata": {},
    "name": "PIXTransactionMutation",
    "operationKind": "mutation",
    "text": "mutation PIXTransactionMutation(\n  $key: String!\n) {\n  queryPIX(key: $key) {\n    success\n    message\n    data {\n      key\n      name\n      bank\n      accountType\n      accountNumber\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "5469659ae7f5e84bcb0c164d593fddd7";

export default node;
