/**
 * @generated SignedSource<<87a81dfbc184a6136f9c520a90121895>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AdminDashboardQuery$variables = Record<PropertyKey, never>;
export type AdminDashboardQuery$data = {
  readonly getAllTokens: ReadonlyArray<{
    readonly lastRefill: string;
    readonly tokens: number;
    readonly userId: string | null | undefined;
  } | null | undefined> | null | undefined;
};
export type AdminDashboardQuery = {
  response: AdminDashboardQuery$data;
  variables: AdminDashboardQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "TokenBucket",
    "kind": "LinkedField",
    "name": "getAllTokens",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "userId",
        "storageKey": null
      },
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
    "name": "AdminDashboardQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "AdminDashboardQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "12189a09241b053bf0d52a00e6e46228",
    "id": null,
    "metadata": {},
    "name": "AdminDashboardQuery",
    "operationKind": "query",
    "text": "query AdminDashboardQuery {\n  getAllTokens {\n    userId\n    tokens\n    lastRefill\n  }\n}\n"
  }
};
})();

(node as any).hash = "b5d8f241e8f3b9e0470bf4540ef68c0d";

export default node;
