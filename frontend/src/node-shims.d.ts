/**
 * The two Node modules source-assets.test.ts needs, declared by hand.
 *
 * This project deliberately has no `@types/node`: `tsconfig.app.json` compiles
 * the whole of `src` with `lib: ["ES2020", "DOM", "DOM.Iterable"]`, so pulling
 * in the full Node type surface would change the type environment of the *app*
 * — `setTimeout` would start returning `NodeJS.Timeout`, `Buffer` would become
 * a global, and code that should be browser-only could quietly start
 * type-checking against Node. Three read-only calls are not worth that.
 *
 * Only what is used is declared. If the test starts calling something else from
 * these modules, add it here rather than reaching for the package.
 */
declare module 'node:fs' {
  /** Bytes, for the drift comparison — the only form that can see a line-ending change. */
  export function readFileSync(path: string): Uint8Array;
  /** Text, for scanning a component's source for link targets. */
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function existsSync(path: string): boolean;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
