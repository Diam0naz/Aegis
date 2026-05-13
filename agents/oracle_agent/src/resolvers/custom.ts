import { JSONPath } from "jsonpath-plus";

export async function resolveCustomMarket(
  endpoint: string,
  jsonPath: string,
  expectedValue: string,
): Promise<boolean> {
  const res = await fetch(endpoint);
  const data: any = await res.json();
  // Simple dot-notation path resolver
  const keys = jsonPath.replace(/^\$\./, "").split(".");
  let current = data;
  for (const key of keys) {
    current = current?.[key];
  }

  console.log(`  Custom resolver: path=${jsonPath} value=${current}`);

  if (expectedValue.startsWith(">")) {
    return Number(current) > Number(expectedValue.slice(1));
  }
  if (expectedValue.startsWith("<")) {
    return Number(current) < Number(expectedValue.slice(1));
  }

  return String(current) === expectedValue;
}
