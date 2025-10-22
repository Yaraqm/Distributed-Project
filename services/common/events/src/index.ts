// Barrel file to re-export shared messaging utilities and event types.
// If your services import from "../../common/events/src/index.ts",
// make sure each service tsconfig has: "allowImportingTsExtensions": true

export * from "./broker.ts";
export * from "./events.ts";

// If you did NOT enable `allowImportingTsExtensions` in tsconfig,
// use the .js extensions instead:
//
// export * from "./broker.js";
// export * from "./events.js";
