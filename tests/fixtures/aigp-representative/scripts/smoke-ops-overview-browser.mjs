const apiBaseUrl = "http://127.0.0.1:4000";

function buildUrl(baseUrl, path) {
  return new URL(path, baseUrl).toString();
}

await fetch(buildUrl(apiBaseUrl, "/ops/overview"));
