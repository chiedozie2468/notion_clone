/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as billing from "../billing.js";
import type * as clerkSync from "../clerkSync.js";
import type * as documents from "../documents.js";
import type * as favorites from "../favorites.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_billing from "../lib/billing.js";
import type * as lib_documentAccess from "../lib/documentAccess.js";
import type * as lib_roles from "../lib/roles.js";
import type * as organizations from "../organizations.js";
import type * as prosemirrorSync from "../prosemirrorSync.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  billing: typeof billing;
  clerkSync: typeof clerkSync;
  documents: typeof documents;
  favorites: typeof favorites;
  files: typeof files;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/billing": typeof lib_billing;
  "lib/documentAccess": typeof lib_documentAccess;
  "lib/roles": typeof lib_roles;
  organizations: typeof organizations;
  prosemirrorSync: typeof prosemirrorSync;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  prosemirrorSync: import("@convex-dev/prosemirror-sync/_generated/component.js").ComponentApi<"prosemirrorSync">;
};
