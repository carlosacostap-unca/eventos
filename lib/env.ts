import "server-only";

import { cache } from "react";

import { parseServerEnv } from "@/lib/env-schema";

export const getServerEnv = cache(() => parseServerEnv(process.env));
