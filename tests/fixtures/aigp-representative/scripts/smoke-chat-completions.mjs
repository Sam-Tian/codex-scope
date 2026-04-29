const gatewayBaseUrl = "http://127.0.0.1:8080";

function buildUrl(baseUrl, path) {
  return new URL(path, baseUrl).toString();
}

await fetch(buildUrl(gatewayBaseUrl, "/v1/chat/completions"), {
  method: "POST",
});
