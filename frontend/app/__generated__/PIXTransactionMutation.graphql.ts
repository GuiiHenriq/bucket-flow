/**
 * @generated SignedSource<<f9a399090453d01cb70339e4bf3e3316>>
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
  readonly getTokens: {
    readonly lastRefill: string;
    readonly tokens: number;
  } | null | undefined;
  readonly queryPixKey: {
    readonly accountInfo: {
      readonly accountNumber: string | null | undefined;
      readonly accountType: string | null | undefined;
      readonly bank: string | null | undefined;
      readonly name: string | null | undefined;
    } | null | undefined;
    readonly key: string | null | undefined;
    readonly message: string | null | undefined;
    readonly success: boolean;
  } | null | undefined;
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
    "concreteType": "PixKeyResponse",
    "kind": "LinkedField",
    "name": "queryPixKey",
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
        "kind": "ScalarField",
        "name": "key",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AccountInfo",
        "kind": "LinkedField",
        "name": "accountInfo",
        "plural": false,
        "selections": [
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
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "TokenBucket",
    "kind": "LinkedField",
    "name": "getTokens",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "tokens",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "lastRefill",
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
    "cacheID": "750c9e9b14b4f285aaf388e73a672a26",
    "id": null,
    "metadata": {},
    "name": "PIXTransactionMutation",
    "operationKind": "mutation",
    "text": "mutation PIXTransactionMutation(\n  $key: String!\n) {\n  queryPixKey(key: $key) {\n    success\n    message\n    key\n    accountInfo {\n      name\n      bank\n      accountType\n      accountNumber\n    }\n  }\n  getTokens {\n    tokens\n    lastRefill\n  }\n}\n"
  }
};
})();

(node as any).hash = "634b07c138f65a297de7a0aa343810b2";

export default node;
