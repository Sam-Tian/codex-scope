// @ts-nocheck
import axios from "axios";

export async function loadProjects() {
  return fetch("/v1/projects");
}

export async function createKey() {
  return axios.post("/v1/api-keys", {});
}
