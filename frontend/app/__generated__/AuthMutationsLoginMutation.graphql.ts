/**
 * @generated SignedSource<<6b98ed4730231ec055bd5d095a8eb044>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LoginInput = {
  password: string;
  username: string;
};
export type AuthMutationsLoginMutation$variables = {
  input: LoginInput;
};
export type AuthMutationsLoginMutation$data = {
  readonly login: {
    readonly token: string;
    readonly user: {
      readonly id: string;
      readonly username: string;
    };
  };
};
export type AuthMutationsLoginMutation = {
  response: AuthMutationsLoginMutation$data;
  variables: AuthMutationsLoginMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "AuthPayload",
    "kind": "LinkedField",
    "name": "login",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "token",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "User",
        "kind": "LinkedField",
        "name": "user",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "username",
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
    "name": "AuthMutationsLoginMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "AuthMutationsLoginMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "76d9cec047de76642c6c0ee3e546cc07",
    "id": null,
    "metadata": {},
    "name": "AuthMutationsLoginMutation",
    "operationKind": "mutation",
    "text": "mutation AuthMutationsLoginMutation(\n  $input: LoginInput!\n) {\n  login(input: $input) {\n    token\n    user {\n      id\n      username\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "524f95c05d4ea7c9424d7b4ded18cc73";

export default node;
