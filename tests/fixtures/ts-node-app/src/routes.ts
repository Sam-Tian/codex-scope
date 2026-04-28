// @ts-nocheck
import express from "express";

export const router = express.Router();

router.get("/v1/projects", (_req, res) => res.json([]));
router.post("/v1/api-keys", (_req, res) => res.status(201).json({ id: "key_123" }));
