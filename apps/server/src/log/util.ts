export function logError(...args: any[]) {
  // Simple error logger, can be expanded for more features
  console.error(...args);
}
export function logJson(obj: unknown) {
  console.log(JSON.stringify(obj, null, 2));
}
