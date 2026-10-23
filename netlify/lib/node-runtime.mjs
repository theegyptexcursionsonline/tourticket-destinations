/** Log the executing runtime, never the build configuration or environment. */
export function logNodeRuntime(functionName) {
  console.log('[node-runtime] ' + JSON.stringify({ function: functionName, node: process.version }));
}
