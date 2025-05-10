/**
 * @generated SignedSource<<3f03ffd23610551ed249c4dc6724a899>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AdminPanelQuery$variables = Record<PropertyKey, never>;
export type AdminPanelQuery$data = {
  readonly getTokens: {
    readonly lastRefill: string;
    readonly tokens: number;
  } | null | undefined;
};
export type AdminPanelQuery = {
  response: AdminPanelQuery$data;
  variables: AdminPanelQuery$variables;
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
    "name": "AdminPanelQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "AdminPanelQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "92b1df59322e818518a8781a9e1db9c3",
    "id": null,
    "metadata": {},
    "name": "AdminPanelQuery",
    "operationKind": "query",
    "text": "query AdminPanelQuery {\n  getTokens {\n    tokens\n    lastRefill\n  }\n}\n"
  }
};
})();

(node as any).hash = "e6b4a68bdb64d56f8e5be85c07dbf230";

export default node;
