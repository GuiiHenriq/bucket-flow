/**
 * @generated SignedSource<<9bc5d7a79b7b17aa6395cfbcf91c1f37>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AppGetTokensQuery$variables = Record<PropertyKey, never>;
export type AppGetTokensQuery$data = {
  readonly getTokens: {
    readonly lastRefill: string;
    readonly tokens: number;
  } | null | undefined;
};
export type AppGetTokensQuery = {
  response: AppGetTokensQuery$data;
  variables: AppGetTokensQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "AppGetTokensQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "AppGetTokensQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "c04fb91b428e559fa53af073dec5a389",
    "id": null,
    "metadata": {},
    "name": "AppGetTokensQuery",
    "operationKind": "query",
    "text": "query AppGetTokensQuery {\n  getTokens {\n    tokens\n    lastRefill\n  }\n}\n"
  }
};
})();

(node as any).hash = "727f546ab4e3981db0a54e313eb2b728";

export default node;
